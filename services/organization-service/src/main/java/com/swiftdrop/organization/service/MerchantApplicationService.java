package com.swiftdrop.organization.service;

import com.swiftdrop.organization.client.IdentityServiceClient;
import com.swiftdrop.organization.dto.*;
import com.swiftdrop.organization.entity.MerchantApplication;
import com.swiftdrop.organization.entity.MerchantApplicationHistory;
import com.swiftdrop.organization.entity.MerchantDocument;
import com.swiftdrop.organization.entity.enums.MerchantApplicationStatus;
import com.swiftdrop.organization.entity.enums.MerchantBusinessCategory;
import com.swiftdrop.organization.exception.DuplicateResourceException;
import com.swiftdrop.organization.exception.ResourceNotFoundException;
import com.swiftdrop.organization.repository.MerchantApplicationHistoryRepository;
import com.swiftdrop.organization.repository.MerchantApplicationRepository;
import com.swiftdrop.organization.repository.MerchantDocumentRepository;
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
    private OrganizationEventPublisher eventPublisher;
    private IdentityServiceClient identityServiceClient;
    private MerchantDocumentRepository documentRepository;

    public MerchantApplicationService(
            MerchantApplicationRepository applicationRepository,
            MerchantApplicationHistoryRepository historyRepository) {
        this.applicationRepository = applicationRepository;
        this.historyRepository = historyRepository;
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setEventPublisher(OrganizationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setIdentityServiceClient(IdentityServiceClient identityServiceClient) {
        this.identityServiceClient = identityServiceClient;
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setDocumentRepository(MerchantDocumentRepository documentRepository) {
        this.documentRepository = documentRepository;
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

        if (eventPublisher != null) {
            eventPublisher.publishMerchantApplicationSubmitted(saved);
        }

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
        if (app.getStatus() != MerchantApplicationStatus.PENDING) {
            throw new IllegalStateException(
                    "Only PENDING merchant applications can be approved (current status: " + app.getStatus() + ")");
        }

        MerchantApplicationStatus previousStatus = app.getStatus();
        String effectiveAdmin = (adminEmail != null && !adminEmail.isBlank()) ? adminEmail : "admin@swiftdrop.lk";
        String notes = (request != null && request.getReviewNotes() != null && !request.getReviewNotes().isBlank())
                ? request.getReviewNotes().trim()
                : "Approved by Head Office Administration.";

        app.setStatus(MerchantApplicationStatus.APPROVED);
        app.setRejectionReason(null);
        app.setInfoRequestMessage(null);
        app.setSuspensionReason(null);
        app.setReviewNotes(notes);
        app.setReviewedBy(effectiveAdmin);
        app.setReviewedAt(LocalDateTime.now());

        MerchantApplication saved = applicationRepository.save(app);
        recordHistory(saved, previousStatus, MerchantApplicationStatus.APPROVED, "APPROVED", effectiveAdmin, adminUserId, notes);

        MerchantProvisionedOAuthDto provisionedOAuth = null;
        if (identityServiceClient != null) {
            if (saved.getApplicantUserId() != null && !saved.getApplicantUserId().isBlank()) {
                identityServiceClient.grantMerchantAccess(saved.getApplicantUserId(), saved.getApplicationCode());
            }
            provisionedOAuth = identityServiceClient
                    .provisionMerchantOAuthClient(saved.getApplicationCode(), saved.getBusinessName(), null)
                    .orElse(null);
        }

        if (eventPublisher != null) {
            eventPublisher.publishMerchantApplicationApproved(saved, effectiveAdmin);
        }

        log.info("Head Office Admin '{}' approved merchant application '{}'", effectiveAdmin, saved.getApplicationCode());
        MerchantApplicationResponse response = toResponse(saved);
        response.setProvisionedCredentials(provisionedOAuth);
        return response;
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
        if (app.getStatus() != MerchantApplicationStatus.PENDING
                && app.getStatus() != MerchantApplicationStatus.MORE_INFORMATION_REQUIRED) {
            throw new IllegalStateException(
                    "Only PENDING or MORE_INFORMATION_REQUIRED applications can be rejected (current status: " + app.getStatus() + ")");
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
        if (eventPublisher != null) {
            eventPublisher.publishMerchantApplicationRejected(saved, effectiveAdmin, reason);
        }

        log.info("Head Office Admin '{}' rejected merchant application '{}': {}",
                effectiveAdmin, saved.getApplicationCode(), reason);
        return toResponse(saved);
    }

    public MerchantApplicationResponse requestMoreInfo(
            String idOrCode,
            String message,
            String adminEmail,
            String adminUserId) {
        if (message == null || message.isBlank()) {
            throw new IllegalArgumentException("Additional information request message is required");
        }
        MerchantApplication app = resolveApplication(idOrCode);
        if (app.getStatus() != MerchantApplicationStatus.PENDING) {
            throw new IllegalStateException("Additional information can only be requested for PENDING applications");
        }
        MerchantApplicationStatus prev = app.getStatus();
        String effectiveAdmin = (adminEmail != null && !adminEmail.isBlank()) ? adminEmail : "admin@swiftdrop.lk";
        app.setStatus(MerchantApplicationStatus.MORE_INFORMATION_REQUIRED);
        app.setInfoRequestMessage(message.trim());
        app.setReviewedBy(effectiveAdmin);
        app.setReviewedAt(LocalDateTime.now());
        MerchantApplication saved = applicationRepository.save(app);
        recordHistory(saved, prev, MerchantApplicationStatus.MORE_INFORMATION_REQUIRED, "MORE_INFO_REQUESTED", effectiveAdmin, adminUserId, message.trim());
        return toResponse(saved);
    }

    public MerchantApplicationResponse resubmitApplication(
            String idOrCode,
            MerchantProfileUpdateRequest updateRequest,
            String userId,
            String userEmail) {
        MerchantApplication app = resolveApplication(idOrCode);
        if (app.getStatus() != MerchantApplicationStatus.MORE_INFORMATION_REQUIRED) {
            throw new IllegalStateException("Only applications with MORE_INFORMATION_REQUIRED status can be resubmitted");
        }
        if (userId != null && app.getApplicantUserId() != null && !app.getApplicantUserId().equals(userId)) {
            throw new org.springframework.security.access.AccessDeniedException("You can only resubmit your own merchant application");
        }
        if (updateRequest != null) {
            applyPermittedProfileUpdates(app, updateRequest);
        }
        MerchantApplicationStatus prev = app.getStatus();
        app.setStatus(MerchantApplicationStatus.PENDING);
        app.setInfoRequestMessage(null);
        MerchantApplication saved = applicationRepository.save(app);
        recordHistory(saved, prev, MerchantApplicationStatus.PENDING, "RESUBMITTED", userEmail, userId, "Merchant resubmitted requested information");
        return toResponse(saved);
    }

    public MerchantApplicationResponse suspendMerchant(
            String idOrCode,
            String reason,
            String adminEmail,
            String adminUserId) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Suspension reason is required");
        }
        MerchantApplication app = resolveApplication(idOrCode);
        if (app.getStatus() != MerchantApplicationStatus.APPROVED) {
            throw new IllegalStateException("Only APPROVED merchants can be suspended");
        }
        MerchantApplicationStatus prev = app.getStatus();
        String effectiveAdmin = (adminEmail != null && !adminEmail.isBlank()) ? adminEmail : "admin@swiftdrop.lk";
        app.setStatus(MerchantApplicationStatus.SUSPENDED);
        app.setSuspensionReason(reason.trim());
        app.setReviewedBy(effectiveAdmin);
        app.setReviewedAt(LocalDateTime.now());
        MerchantApplication saved = applicationRepository.save(app);
        recordHistory(saved, prev, MerchantApplicationStatus.SUSPENDED, "SUSPENDED", effectiveAdmin, adminUserId, reason.trim());
        if (identityServiceClient != null) {
            identityServiceClient.revokeMerchantOAuthClients(saved.getApplicationCode(), reason.trim());
        }
        return toResponse(saved);
    }

    public MerchantApplicationResponse reinstateMerchant(
            String idOrCode,
            String notes,
            String adminEmail,
            String adminUserId) {
        MerchantApplication app = resolveApplication(idOrCode);
        if (app.getStatus() != MerchantApplicationStatus.SUSPENDED) {
            throw new IllegalStateException("Only SUSPENDED merchants can be reinstated");
        }
        MerchantApplicationStatus prev = app.getStatus();
        String effectiveAdmin = (adminEmail != null && !adminEmail.isBlank()) ? adminEmail : "admin@swiftdrop.lk";
        String effectiveNotes = (notes != null && !notes.isBlank()) ? notes.trim() : "Reinstated by System Administrator";
        app.setStatus(MerchantApplicationStatus.APPROVED);
        app.setSuspensionReason(null);
        app.setReviewNotes(effectiveNotes);
        app.setReviewedBy(effectiveAdmin);
        app.setReviewedAt(LocalDateTime.now());
        MerchantApplication saved = applicationRepository.save(app);
        recordHistory(saved, prev, MerchantApplicationStatus.APPROVED, "REINSTATED", effectiveAdmin, adminUserId, effectiveNotes);
        return toResponse(saved);
    }

    public MerchantApplicationResponse terminateMerchant(
            String idOrCode,
            String reason,
            String adminEmail,
            String adminUserId) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Termination reason is required");
        }
        MerchantApplication app = resolveApplication(idOrCode);
        if (app.getStatus() == MerchantApplicationStatus.TERMINATED) {
            throw new IllegalStateException("Merchant is already TERMINATED");
        }
        MerchantApplicationStatus prev = app.getStatus();
        String effectiveAdmin = (adminEmail != null && !adminEmail.isBlank()) ? adminEmail : "admin@swiftdrop.lk";
        app.setStatus(MerchantApplicationStatus.TERMINATED);
        app.setSuspensionReason(reason.trim());
        app.setReviewedBy(effectiveAdmin);
        app.setReviewedAt(LocalDateTime.now());
        MerchantApplication saved = applicationRepository.save(app);
        recordHistory(saved, prev, MerchantApplicationStatus.TERMINATED, "TERMINATED", effectiveAdmin, adminUserId, reason.trim());
        if (identityServiceClient != null) {
            identityServiceClient.revokeMerchantOAuthClients(saved.getApplicationCode(), reason.trim());
        }
        return toResponse(saved);
    }

    public MerchantApplicationDocumentDto uploadDocument(
            String idOrCode,
            String documentType,
            String fileName,
            String contentType,
            byte[] bytes) {
        if (documentRepository == null) {
            throw new IllegalStateException("Document storage is not initialized");
        }
        if (bytes == null || bytes.length == 0) {
            throw new IllegalArgumentException("Uploaded document cannot be empty");
        }
        if (bytes.length > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("Document size exceeds 5 MB maximum limit");
        }
        String safeContentType = contentType != null ? contentType.toLowerCase(Locale.ROOT) : "application/octet-stream";
        if (!safeContentType.equals("application/pdf")
                && !safeContentType.equals("image/png")
                && !safeContentType.equals("image/jpeg")) {
            throw new IllegalArgumentException("Only PDF, PNG, and JPEG business registration documents are accepted");
        }
        MerchantApplication app = resolveApplication(idOrCode);
        MerchantDocument doc = new MerchantDocument();
        doc.setApplication(app);
        doc.setDocumentType(documentType != null && !documentType.isBlank() ? documentType.trim().toUpperCase(Locale.ROOT) : "BR_CERTIFICATE");
        doc.setFileName(fileName != null && !fileName.isBlank() ? fileName.trim() : "document.pdf");
        doc.setContentType(safeContentType);
        doc.setFileSizeBytes(bytes.length);
        doc.setContent(bytes);
        doc.setVerificationStatus("SUBMITTED");
        MerchantDocument saved = documentRepository.save(doc);
        return toDocumentDto(saved);
    }

    @Transactional(readOnly = true)
    public MerchantDocument downloadDocument(String idOrCode, Long docId) {
        if (documentRepository == null) {
            throw new ResourceNotFoundException("Document storage unavailable");
        }
        MerchantApplication app = resolveApplication(idOrCode);
        return documentRepository.findByIdAndApplication_Id(docId, app.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + docId));
    }

    @Transactional(readOnly = true)
    public MerchantApprovalStatusResponse checkApprovalStatus(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            return new MerchantApprovalStatusResponse(null, "NOT_FOUND", false);
        }
        String trimmed = identifier.trim();
        Optional<MerchantApplication> byCode = applicationRepository.findByApplicationCodeIgnoreCase(trimmed);
        if (byCode.isPresent()) {
            MerchantApplication app = byCode.get();
            return new MerchantApprovalStatusResponse(
                    app.getApplicationCode(),
                    app.getStatus().name(),
                    app.getStatus() == MerchantApplicationStatus.APPROVED
            );
        }
        List<MerchantApplication> byUser = applicationRepository.findByApplicantUserIdOrderBySubmittedAtDesc(trimmed);
        if (!byUser.isEmpty()) {
            MerchantApplication best = byUser.stream()
                    .filter(a -> a.getStatus() == MerchantApplicationStatus.APPROVED)
                    .findFirst()
                    .orElse(byUser.get(0));
            return new MerchantApprovalStatusResponse(
                    best.getApplicationCode(),
                    best.getStatus().name(),
                    best.getStatus() == MerchantApplicationStatus.APPROVED
            );
        }
        return new MerchantApprovalStatusResponse(null, "NOT_FOUND", false);
    }

    @Transactional(readOnly = true)
    public java.util.Map<String, Object> publicLookup(String reference, String email) {
        if (reference == null || reference.isBlank() || email == null || email.isBlank()) {
            throw new IllegalArgumentException("Both application reference and business email are required");
        }
        MerchantApplication app = applicationRepository.findByApplicationCodeIgnoreCase(reference.trim())
                .orElseThrow(() -> new ResourceNotFoundException("No merchant application found for reference: " + reference));
        boolean emailMatches = email.trim().equalsIgnoreCase(app.getContactEmail())
                || email.trim().equalsIgnoreCase(app.getApplicantEmail());
        if (!emailMatches) {
            throw new ResourceNotFoundException("No merchant application matches the provided reference and email");
        }
        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("applicationReference", app.getApplicationCode());
        result.put("businessName", app.getBusinessName());
        result.put("status", app.getStatus().name());
        result.put("statusLabel", app.getStatus().getLabel());
        result.put("submittedAt", app.getSubmittedAt() != null ? app.getSubmittedAt().toString() : null);
        result.put("reviewedAt", app.getReviewedAt() != null ? app.getReviewedAt().toString() : null);
        if (app.getStatus() == MerchantApplicationStatus.MORE_INFORMATION_REQUIRED) {
            result.put("infoRequestMessage", app.getInfoRequestMessage());
        }
        if (app.getStatus() == MerchantApplicationStatus.REJECTED) {
            result.put("rejectionReason", app.getRejectionReason());
        }
        return result;
    }

    public MerchantApplicationResponse updateMyProfile(
            MerchantProfileUpdateRequest request,
            String userId,
            String organizationId) {
        MerchantApplication target = null;
        if (organizationId != null && !organizationId.isBlank()) {
            target = applicationRepository.findByApplicationCodeIgnoreCase(organizationId.trim()).orElse(null);
        }
        if (target == null && userId != null && !userId.isBlank()) {
            List<MerchantApplication> apps = applicationRepository.findByApplicantUserIdOrderBySubmittedAtDesc(userId);
            if (!apps.isEmpty()) {
                target = apps.stream()
                        .filter(a -> a.getStatus() == MerchantApplicationStatus.APPROVED)
                        .findFirst()
                        .orElse(apps.get(0));
            }
        }
        if (target == null) {
            throw new ResourceNotFoundException("No merchant profile found for the authenticated user");
        }
        applyPermittedProfileUpdates(target, request);
        return toResponse(applicationRepository.save(target));
    }

    private void applyPermittedProfileUpdates(MerchantApplication target, MerchantProfileUpdateRequest request) {
        if (request.getContactFullName() != null && !request.getContactFullName().isBlank()) {
            target.setContactFullName(request.getContactFullName().trim());
        }
        if (request.getContactDesignation() != null && !request.getContactDesignation().isBlank()) {
            target.setContactDesignation(request.getContactDesignation().trim());
        }
        if (request.getContactPhone() != null && !request.getContactPhone().isBlank()) {
            target.setContactPhone(request.getContactPhone().trim());
        }
        if (request.getStreetAddress() != null && !request.getStreetAddress().isBlank()) {
            target.setStreetAddress(request.getStreetAddress().trim());
        }
        if (request.getCity() != null && !request.getCity().isBlank()) {
            target.setCity(request.getCity().trim());
        }
        if (request.getDistrict() != null && !request.getDistrict().isBlank()) {
            target.setDistrict(request.getDistrict().trim());
        }
        if (request.getPostalCode() != null && !request.getPostalCode().isBlank()) {
            target.setPostalCode(request.getPostalCode().trim());
        }
        if (request.getExpectedDailyVolume() != null && !request.getExpectedDailyVolume().isBlank()) {
            target.setExpectedDailyVolume(request.getExpectedDailyVolume().trim());
        }
    }

    private MerchantApplicationDocumentDto toDocumentDto(MerchantDocument doc) {
        String sizeLabel = doc.getFileSizeBytes() >= 1024 * 1024
                ? String.format("%.1f MB", doc.getFileSizeBytes() / (1024.0 * 1024.0))
                : String.format("%d KB", Math.max(1, doc.getFileSizeBytes() / 1024));
        return new MerchantApplicationDocumentDto(
                String.valueOf(doc.getId()),
                doc.getDocumentType(),
                doc.getDocumentType().replace('_', ' '),
                doc.getFileName(),
                sizeLabel,
                doc.getUploadedAt() != null ? doc.getUploadedAt().toString() : null,
                doc.getVerificationStatus()
        );
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

        dto.setInfoRequestMessage(app.getInfoRequestMessage());
        dto.setSuspensionReason(app.getSuspensionReason());

        List<MerchantApplicationDocumentDto> uploadedDocs = (documentRepository != null && app.getId() != null)
                ? documentRepository.findByApplication_IdOrderByUploadedAtDesc(app.getId())
                        .stream()
                        .map(this::toDocumentDto)
                        .toList()
                : List.of();

        if (!uploadedDocs.isEmpty()) {
            dto.setDocuments(uploadedDocs);
        }

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

