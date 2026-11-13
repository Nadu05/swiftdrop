package com.swiftdrop.organization.service;

import com.swiftdrop.organization.dto.*;
import com.swiftdrop.organization.entity.MerchantApplication;
import com.swiftdrop.organization.entity.MerchantApplicationHistory;
import com.swiftdrop.organization.entity.enums.MerchantApplicationStatus;
import com.swiftdrop.organization.entity.enums.MerchantBusinessCategory;
import com.swiftdrop.organization.exception.DuplicateResourceException;
import com.swiftdrop.organization.exception.ResourceNotFoundException;
import com.swiftdrop.organization.repository.MerchantApplicationHistoryRepository;
import com.swiftdrop.organization.repository.MerchantApplicationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Year;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
@Transactional
public class MerchantApplicationService {

    private static final Logger log = LoggerFactory.getLogger(MerchantApplicationService.class);

    private final MerchantApplicationRepository applicationRepository;
    private final MerchantApplicationHistoryRepository historyRepository;

    public MerchantApplicationService(
            MerchantApplicationRepository applicationRepository,
            MerchantApplicationHistoryRepository historyRepository) {
        this.applicationRepository = applicationRepository;
        this.historyRepository = historyRepository;
    }

    public MerchantApplicationResponse submitApplication(
            MerchantApplicationCreateRequest request,
            String applicantUserId,
            String applicantEmail) {

        String trimmedBrn = request.getBusinessRegistrationNumber().trim();
        if (applicationRepository.existsByBusinessRegistrationNumberIgnoreCase(trimmedBrn)) {
            throw new DuplicateResourceException(
                    "A merchant application with Business Registration Number '" + trimmedBrn + "' already exists");
        }

        MerchantBusinessCategory category = parseCategory(request.getCategory());
        String effectiveEmail = (applicantEmail != null && !applicantEmail.isBlank())
                ? applicantEmail.trim()
                : request.getContactEmail().trim();

        MerchantApplication app = new MerchantApplication();
        app.setApplicationCode(generateApplicationCode());
        app.setApplicantUserId(applicantUserId);
        app.setApplicantEmail(effectiveEmail);
        app.setBusinessName(request.getBusinessName().trim());
        app.setLegalName(request.getLegalName() != null ? request.getLegalName().trim() : request.getBusinessName().trim());
        app.setBusinessRegistrationNumber(trimmedBrn);
        app.setCategory(category);
        app.setContactFullName(request.getContactFullName().trim());
        app.setContactDesignation(request.getContactDesignation() != null ? request.getContactDesignation().trim() : "Authorized Representative");
        app.setContactEmail(request.getContactEmail().trim());
        app.setContactPhone(request.getContactPhone().trim());
        app.setStreetAddress(request.getStreetAddress().trim());
        app.setCity(request.getCity().trim());
        app.setDistrict(request.getDistrict() != null ? request.getDistrict().trim() : request.getCity().trim());
        app.setPostalCode(request.getPostalCode() != null ? request.getPostalCode().trim() : "00100");
        app.setNearestBranch(request.getNearestBranch() != null ? request.getNearestBranch().trim() : "Colombo Central Hub");
        app.setExpectedDailyVolume(request.getExpectedDailyVolume() != null ? request.getExpectedDailyVolume().trim() : "10-50 parcels/day");
        app.setStatus(MerchantApplicationStatus.PENDING);

        MerchantApplication saved = applicationRepository.save(app);

        recordHistory(
                saved,
                null,
                MerchantApplicationStatus.PENDING,
                "SUBMITTED",
                effectiveEmail,
                applicantUserId,
                "Initial merchant onboarding submission"
        );

        log.info("Submitted new merchant application {} for business '{}'",
                saved.getApplicationCode(), saved.getBusinessName());

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<MerchantApplicationResponse> findAll(
            String statusFilter,
            String categoryFilter,
            String searchTerm,
            String sortOrder) {

        List<MerchantApplication> all = applicationRepository.findAll();

        MerchantApplicationStatus targetStatus = null;
        if (statusFilter != null && !statusFilter.isBlank() && !"ALL".equalsIgnoreCase(statusFilter.trim())) {
            try {
                targetStatus = MerchantApplicationStatus.fromFilter(statusFilter);
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException(
                        "Invalid status filter: '" + statusFilter + "'. Allowed values: PENDING, APPROVED, REJECTED");
            }
        }

        MerchantBusinessCategory targetCategory = null;
        if (categoryFilter != null && !categoryFilter.isBlank() && !"ALL".equalsIgnoreCase(categoryFilter.trim())) {
            targetCategory = parseCategory(categoryFilter);
        }

        String normalizedSearch = searchTerm != null ? searchTerm.trim().toLowerCase(Locale.ROOT) : "";
        final MerchantApplicationStatus finalStatus = targetStatus;
        final MerchantBusinessCategory finalCategory = targetCategory;

        List<MerchantApplication> filtered = new ArrayList<>(all.stream()
                .filter(app -> finalStatus == null || app.getStatus() == finalStatus)
                .filter(app -> finalCategory == null || app.getCategory() == finalCategory)
                .filter(app -> {
                    if (normalizedSearch.isEmpty()) return true;
                    return containsIgnoreCase(app.getBusinessName(), normalizedSearch)
                            || containsIgnoreCase(app.getApplicationCode(), normalizedSearch)
                            || containsIgnoreCase(app.getBusinessRegistrationNumber(), normalizedSearch)
                            || containsIgnoreCase(app.getContactFullName(), normalizedSearch);
                })
                .toList());

        Comparator<MerchantApplication> comparator = Comparator.comparing(
                app -> app.getSubmittedAt() != null ? app.getSubmittedAt() : LocalDateTime.MIN
        );
        if (!"oldest".equalsIgnoreCase(sortOrder)) {
            comparator = comparator.reversed();
        }
        filtered.sort(comparator);

        return filtered.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<MerchantApplicationResponse> findApprovedMerchants() {
        return applicationRepository.findByStatusOrderBySubmittedAtDesc(MerchantApplicationStatus.APPROVED)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MerchantApplicationResponse> findByApplicantUserId(String applicantUserId) {
        return applicationRepository.findByApplicantUserIdOrderBySubmittedAtDesc(applicantUserId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public MerchantApprovalSummaryResponse getSummaryMetrics() {
        long pending = applicationRepository.countByStatus(MerchantApplicationStatus.PENDING);
        long approved = applicationRepository.countByStatus(MerchantApplicationStatus.APPROVED);
        long rejected = applicationRepository.countByStatus(MerchantApplicationStatus.REJECTED);
        long total = pending + approved + rejected;
        return new MerchantApprovalSummaryResponse(pending, 0L, approved, rejected, total);
    }

    @Transactional(readOnly = true)
    public MerchantApplicationResponse findByIdOrCode(String idOrCode) {
        MerchantApplication app = resolveApplication(idOrCode);
        return toResponse(app);
    }

    public MerchantApplicationResponse approveApplication(
            String idOrCode,
            MerchantApplicationApproveRequest request,
            String adminEmail,
            String adminUserId) {

        MerchantApplication app = resolveApplication(idOrCode);
        if (app.getStatus() == MerchantApplicationStatus.APPROVED) {
            throw new IllegalStateException("Merchant application '" + app.getApplicationCode() + "' is already APPROVED");
        }

        MerchantApplicationStatus previousStatus = app.getStatus();
        String effectiveAdmin = (adminEmail != null && !adminEmail.isBlank()) ? adminEmail : "admin@swiftdrop.lk";
        String notes = (request != null && request.getReviewNotes() != null && !request.getReviewNotes().isBlank())
                ? request.getReviewNotes().trim()
                : "Approved by Head Office Administration.";

        app.setStatus(MerchantApplicationStatus.APPROVED);
        app.setRejectionReason(null);
        app.setReviewNotes(notes);
        app.setReviewedBy(effectiveAdmin);
        app.setReviewedAt(LocalDateTime.now());

        MerchantApplication saved = applicationRepository.save(app);
        recordHistory(saved, previousStatus, MerchantApplicationStatus.APPROVED, "APPROVED", effectiveAdmin, adminUserId, notes);

        log.info("Head Office Admin '{}' approved merchant application '{}'", effectiveAdmin, saved.getApplicationCode());
        return toResponse(saved);
    }

    public MerchantApplicationResponse rejectApplication(
            String idOrCode,
            MerchantApplicationRejectRequest request,
            String adminEmail,
            String adminUserId) {

        if (request == null || request.getRejectionReason() == null || request.getRejectionReason().isBlank()) {
            throw new IllegalArgumentException("Rejection reason is required");
        }

        MerchantApplication app = resolveApplication(idOrCode);
        if (app.getStatus() == MerchantApplicationStatus.APPROVED) {
            throw new IllegalStateException("Cannot reject an already APPROVED merchant application");
        }

        MerchantApplicationStatus previousStatus = app.getStatus();
        String effectiveAdmin = (adminEmail != null && !adminEmail.isBlank()) ? adminEmail : "admin@swiftdrop.lk";
        String reason = request.getRejectionReason().trim();
        String notes = (request.getReviewNotes() != null && !request.getReviewNotes().isBlank())
                ? request.getReviewNotes().trim()
                : reason;

        app.setStatus(MerchantApplicationStatus.REJECTED);
        app.setRejectionReason(reason);
        app.setReviewNotes(notes);
        app.setReviewedBy(effectiveAdmin);
        app.setReviewedAt(LocalDateTime.now());

        MerchantApplication saved = applicationRepository.save(app);
        recordHistory(saved, previousStatus, MerchantApplicationStatus.REJECTED, "REJECTED", effectiveAdmin, adminUserId, reason);

        log.info("Head Office Admin '{}' rejected merchant application '{}': {}",
                effectiveAdmin, saved.getApplicationCode(), reason);
        return toResponse(saved);
    }

    private MerchantApplication resolveApplication(String idOrCode) {
        if (idOrCode == null || idOrCode.isBlank()) {
            throw new ResourceNotFoundException("Merchant application identifier is required");
        }
        String trimmed = idOrCode.trim();
        Optional<MerchantApplication> byCode = applicationRepository.findByApplicationCodeIgnoreCase(trimmed);
        if (byCode.isPresent()) {
            return byCode.get();
        }
        try {
            Long numericId = Long.parseLong(trimmed);
            return applicationRepository.findById(numericId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Merchant application not found with ID: " + trimmed));
        } catch (NumberFormatException ex) {
            throw new ResourceNotFoundException("Merchant application not found with code: " + trimmed);
        }
    }

    private void recordHistory(
            MerchantApplication app,
            MerchantApplicationStatus previousStatus,
            MerchantApplicationStatus newStatus,
            String action,
            String actorEmail,
            String actorUserId,
            String reason) {

        MerchantApplicationHistory history = new MerchantApplicationHistory();
        history.setApplication(app);
        history.setPreviousStatus(previousStatus);
        history.setNewStatus(newStatus);
        history.setAction(action);
        history.setActorEmail(actorEmail != null ? actorEmail : "system@swiftdrop.lk");
        history.setActorUserId(actorUserId);
        history.setReason(reason);
        historyRepository.save(history);
    }

    private MerchantBusinessCategory parseCategory(String raw) {
        if (raw == null || raw.isBlank()) {
            return MerchantBusinessCategory.OTHER;
        }
        try {
            return MerchantBusinessCategory.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(
                    "Invalid category: '" + raw + "'. Allowed values: GROCERY_FOOD, PHARMACY, RETAIL, OTHER");
        }
    }

    private String generateApplicationCode() {
        long count = applicationRepository.count() + 820L;
        int year = Year.now().getValue();
        String candidate = String.format("APP-%d-%04d", year, count);
        while (applicationRepository.findByApplicationCodeIgnoreCase(candidate).isPresent()) {
            count++;
            candidate = String.format("APP-%d-%04d", year, count);
        }
        return candidate;
    }

    private boolean containsIgnoreCase(String value, String queryLower) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(queryLower);
    }

    private MerchantApplicationResponse toResponse(MerchantApplication app) {
        MerchantApplicationResponse dto = new MerchantApplicationResponse();
        dto.setId(app.getApplicationCode());
        dto.setNumericId(app.getId());
        dto.setApplicantUserId(app.getApplicantUserId());
        dto.setApplicantEmail(app.getApplicantEmail());
        dto.setBusinessName(app.getBusinessName());
        dto.setLegalName(app.getLegalName());
        dto.setBusinessRegistrationNumber(app.getBusinessRegistrationNumber());
        dto.setCategory(app.getCategory().name());
        dto.setCategoryLabel(app.getCategory().getLabel());

        dto.setContactPerson(new MerchantApplicationResponse.ContactPersonDto(
                app.getContactFullName(),
                app.getContactDesignation(),
                app.getContactEmail(),
                app.getContactPhone()
        ));

        dto.setBusinessAddress(new MerchantApplicationResponse.BusinessAddressDto(
                app.getStreetAddress(),
                app.getCity(),
                app.getDistrict(),
                app.getPostalCode(),
                app.getNearestBranch()
        ));

        dto.setExpectedDailyVolume(app.getExpectedDailyVolume());
        dto.setSubmittedAt(app.getSubmittedAt() != null ? app.getSubmittedAt().toString() : null);
        dto.setUpdatedAt(app.getUpdatedAt() != null ? app.getUpdatedAt().toString() : null);
        dto.setStatus(app.getStatus().name());
        dto.setStatusLabel(app.getStatus().getLabel());
        dto.setRejectionReason(app.getRejectionReason());
        dto.setReviewedBy(app.getReviewedBy());
        dto.setReviewedAt(app.getReviewedAt() != null ? app.getReviewedAt().toString() : null);
        dto.setReviewNotes(app.getReviewNotes());

        String docStatus = app.getStatus() == MerchantApplicationStatus.APPROVED
                ? "VERIFIED"
                : (app.getStatus() == MerchantApplicationStatus.REJECTED ? "REJECTED" : "SUBMITTED");
        String submittedIso = app.getSubmittedAt() != null ? app.getSubmittedAt().toString() : LocalDateTime.now().toString();
        dto.setDocuments(List.of(
                new MerchantApplicationDocumentDto(
                        "DOC-" + app.getApplicationCode() + "-1",
                        "BR_CERTIFICATE",
                        "Business Registration Certificate",
                        "BRN_" + app.getBusinessRegistrationNumber() + ".pdf",
                        "1.4 MB",
                        submittedIso,
                        docStatus
                ),
                new MerchantApplicationDocumentDto(
                        "DOC-" + app.getApplicationCode() + "-2",
                        "PROOF_OF_ADDRESS",
                        "Commercial Address Verification",
                        "Address_" + app.getCity().replaceAll("\\s+", "_") + ".pdf",
                        "850 KB",
                        submittedIso,
                        docStatus
                )
        ));

        List<MerchantApplicationHistoryDto> historyDtos = app.getId() != null
                ? historyRepository.findByApplicationIdOrderByCreatedAtAsc(app.getId()).stream()
                        .map(h -> new MerchantApplicationHistoryDto(
                                h.getId(),
                                h.getPreviousStatus() != null ? h.getPreviousStatus().name() : null,
                                h.getNewStatus().name(),
                                h.getAction(),
                                h.getActorEmail(),
                                h.getActorUserId(),
                                h.getReason(),
                                h.getCreatedAt() != null ? h.getCreatedAt().toString() : null
                        ))
                        .toList()
                : List.of();
        dto.setHistory(historyDtos);

        return dto;
    }
}

