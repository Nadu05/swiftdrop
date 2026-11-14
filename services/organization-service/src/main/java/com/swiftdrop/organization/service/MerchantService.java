package com.swiftdrop.organization.service;

import com.swiftdrop.organization.config.CorrelationIdFilter;
import com.swiftdrop.organization.dto.MerchantRegistrationRequest;
import com.swiftdrop.organization.dto.MerchantResponse;
import com.swiftdrop.organization.dto.MerchantUpdateRequest;
import com.swiftdrop.organization.entity.MerchantProfile;
import com.swiftdrop.organization.entity.enums.MerchantBusinessType;
import com.swiftdrop.organization.entity.enums.MerchantStatus;
import com.swiftdrop.organization.exception.DuplicateResourceException;
import com.swiftdrop.organization.exception.InvalidMerchantStatusTransitionException;
import com.swiftdrop.organization.exception.ResourceNotFoundException;
import com.swiftdrop.organization.messaging.MerchantEventType;
import com.swiftdrop.organization.messaging.MerchantLifecycleEvent;
import com.swiftdrop.organization.repository.MerchantProfileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Merchant organization registration, profile management and approval workflow.
 *
 * <h2>Rules</h2>
 * <ul>
 *   <li>New registrations always start as PENDING; nothing is auto-approved.</li>
 *   <li>Business registration numbers are normalised (trimmed, upper-case) and must be unique
 *       across <em>all</em> statuses, so a REJECTED applicant cannot re-register the same number
 *       (resubmission is a documented future enhancement).</li>
 *   <li>An identity user ID, when supplied, may be linked to at most one merchant profile. It is
 *       an <strong>unverified</strong> reference until JWT validation is available.</li>
 *   <li>The general update never changes status or review metadata.</li>
 *   <li>Status changes go through explicit commands validated by
 *       {@link MerchantStatus#canTransitionTo(MerchantStatus)}; invalid or repeated commands
 *       are rejected (HTTP 409) and publish no event.</li>
 *   <li>{@code reviewedBy} is left {@code null}: no trustworthy administrator identity exists yet.</li>
 *   <li>Lifecycle events are raised inside the transaction and published to RabbitMQ only after
 *       commit by {@code MerchantEventPublisher}.</li>
 * </ul>
 */
@Service
@Transactional
public class MerchantService {

    private final MerchantProfileRepository repository;
    private final ApplicationEventPublisher eventPublisher;
    private final Clock clock;

    @Autowired
    public MerchantService(MerchantProfileRepository repository, ApplicationEventPublisher eventPublisher) {
        this(repository, eventPublisher, Clock.systemUTC());
    }

    MerchantService(MerchantProfileRepository repository, ApplicationEventPublisher eventPublisher, Clock clock) {
        this.repository = repository;
        this.eventPublisher = eventPublisher;
        this.clock = clock;
    }

    // ------------------------------------------------------------------
    // Registration and profile management
    // ------------------------------------------------------------------

    public MerchantResponse register(MerchantRegistrationRequest request) {
        String registrationNumber = normalizeRegistrationNumber(request.getBusinessRegistrationNumber());
        if (repository.existsByBusinessRegistrationNumber(registrationNumber)) {
            throw new DuplicateResourceException(
                    "Merchant with business registration number '" + registrationNumber + "' already exists");
        }

        String identityUserId = trimToNull(request.getIdentityUserId());
        if (identityUserId != null && repository.existsByIdentityUserId(identityUserId)) {
            throw new DuplicateResourceException(
                    "A merchant profile is already linked to identity user '" + identityUserId + "'");
        }

        MerchantProfile merchant = new MerchantProfile();
        merchant.setIdentityUserId(identityUserId);
        merchant.setBusinessName(request.getBusinessName().trim());
        merchant.setBusinessRegistrationNumber(registrationNumber);
        merchant.setBusinessType(parseBusinessType(request.getBusinessType()));
        merchant.setContactPersonName(request.getContactPersonName().trim());
        merchant.setContactEmail(request.getContactEmail().trim());
        merchant.setContactPhone(request.getContactPhone().trim());
        merchant.setBusinessAddressLine1(request.getBusinessAddressLine1().trim());
        merchant.setBusinessAddressLine2(trimToNull(request.getBusinessAddressLine2()));
        merchant.setCity(request.getCity().trim());
        merchant.setStatus(MerchantStatus.PENDING);

        return toResponse(repository.save(merchant));
    }

    @Transactional(readOnly = true)
    public MerchantResponse findById(Long id) {
        return toResponse(getMerchant(id));
    }

    @Transactional(readOnly = true)
    public MerchantResponse findByIdentityUserId(String identityUserId) {
        String normalized = trimToNull(identityUserId);
        if (normalized == null) {
            throw new IllegalArgumentException("Identity user ID must not be blank");
        }
        return repository.findByIdentityUserId(normalized)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Merchant not found for identity user: " + normalized));
    }

    @Transactional(readOnly = true)
    public List<MerchantResponse> findAll(MerchantStatus status) {
        List<MerchantProfile> merchants = (status != null)
                ? repository.findByStatusOrderByCreatedAtDesc(status)
                : repository.findAllByOrderByCreatedAtDesc();
        return merchants.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<MerchantResponse> findPendingApplications() {
        return repository.findByStatusOrderByCreatedAtAsc(MerchantStatus.PENDING)
                .stream().map(this::toResponse).toList();
    }

    public MerchantResponse update(Long id, MerchantUpdateRequest request) {
        MerchantProfile merchant = getMerchant(id);

        if (request.getBusinessRegistrationNumber() != null && !request.getBusinessRegistrationNumber().isBlank()) {
            String registrationNumber = normalizeRegistrationNumber(request.getBusinessRegistrationNumber());
            if (!registrationNumber.equals(merchant.getBusinessRegistrationNumber())
                    && repository.existsByBusinessRegistrationNumber(registrationNumber)) {
                throw new DuplicateResourceException(
                        "Merchant with business registration number '" + registrationNumber + "' already exists");
            }
            merchant.setBusinessRegistrationNumber(registrationNumber);
        }
        if (hasText(request.getBusinessName())) {
            merchant.setBusinessName(request.getBusinessName().trim());
        }
        if (hasText(request.getBusinessType())) {
            merchant.setBusinessType(parseBusinessType(request.getBusinessType()));
        }
        if (hasText(request.getContactPersonName())) {
            merchant.setContactPersonName(request.getContactPersonName().trim());
        }
        if (hasText(request.getContactEmail())) {
            merchant.setContactEmail(request.getContactEmail().trim());
        }
        if (hasText(request.getContactPhone())) {
            merchant.setContactPhone(request.getContactPhone().trim());
        }
        if (hasText(request.getBusinessAddressLine1())) {
            merchant.setBusinessAddressLine1(request.getBusinessAddressLine1().trim());
        }
        // Optional column: an empty string clears it, null leaves it unchanged.
        if (request.getBusinessAddressLine2() != null) {
            merchant.setBusinessAddressLine2(trimToNull(request.getBusinessAddressLine2()));
        }
        if (hasText(request.getCity())) {
            merchant.setCity(request.getCity().trim());
        }

        // Status, review metadata, identityUserId and createdAt are intentionally never touched here.
        return toResponse(repository.save(merchant));
    }

    // ------------------------------------------------------------------
    // Approval workflow
    // ------------------------------------------------------------------

    /** PENDING &rarr; APPROVED. Clears any previous review reasons. */
    public MerchantResponse approve(Long id) {
        MerchantProfile merchant = getMerchant(id);
        MerchantStatus previous = requireTransition(merchant, MerchantStatus.APPROVED, MerchantStatus.PENDING);
        merchant.setRejectionReason(null);
        merchant.setSuspensionReason(null);
        return applyTransition(merchant, previous, MerchantStatus.APPROVED, null);
    }

    /** PENDING &rarr; REJECTED with a mandatory reason. */
    public MerchantResponse reject(Long id, String reason) {
        String normalizedReason = requireReason(reason, "Rejection reason");
        MerchantProfile merchant = getMerchant(id);
        MerchantStatus previous = requireTransition(merchant, MerchantStatus.REJECTED, MerchantStatus.PENDING);
        merchant.setRejectionReason(normalizedReason);
        return applyTransition(merchant, previous, MerchantStatus.REJECTED, normalizedReason);
    }

    /** APPROVED &rarr; SUSPENDED with a mandatory reason. */
    public MerchantResponse suspend(Long id, String reason) {
        String normalizedReason = requireReason(reason, "Suspension reason");
        MerchantProfile merchant = getMerchant(id);
        MerchantStatus previous = requireTransition(merchant, MerchantStatus.SUSPENDED, MerchantStatus.APPROVED);
        merchant.setSuspensionReason(normalizedReason);
        return applyTransition(merchant, previous, MerchantStatus.SUSPENDED, normalizedReason);
    }

    /**
     * SUSPENDED &rarr; APPROVED. The suspension reason is cleared because the response reflects the
     * current state; a full review-history/audit table is a documented future enhancement.
     */
    public MerchantResponse reactivate(Long id) {
        MerchantProfile merchant = getMerchant(id);
        MerchantStatus previous = requireTransition(merchant, MerchantStatus.APPROVED, MerchantStatus.SUSPENDED);
        merchant.setSuspensionReason(null);
        return applyTransition(merchant, previous, MerchantStatus.APPROVED, null);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    /**
     * Validates that the merchant is in the status required by this specific command and that the
     * transition is allowed. Re-issuing a command (e.g. approving twice) fails with 409 and no event.
     */
    private MerchantStatus requireTransition(MerchantProfile merchant, MerchantStatus target, MerchantStatus requiredCurrent) {
        MerchantStatus current = merchant.getStatus();
        if (current != requiredCurrent || !current.canTransitionTo(target)) {
            throw new InvalidMerchantStatusTransitionException(merchant.getId(), current, target);
        }
        return current;
    }

    private MerchantResponse applyTransition(MerchantProfile merchant, MerchantStatus previous,
                                             MerchantStatus target, String reason) {
        LocalDateTime now = LocalDateTime.now(clock);
        merchant.setStatus(target);
        merchant.setReviewedAt(now);
        // No verified administrator identity is available yet; never trust a client-supplied reviewer.
        merchant.setReviewedBy(null);

        MerchantProfile saved = repository.save(merchant);

        MerchantEventType type = MerchantEventType.forTransition(previous, target);
        String correlationId = CorrelationIdFilter.currentOrGenerate();
        eventPublisher.publishEvent(new MerchantLifecycleEvent(
                UUID.randomUUID().toString(),
                type.eventType(),
                MerchantEventType.VERSION,
                clock.instant().toString(),
                MerchantLifecycleEvent.PRODUCER,
                correlationId,
                saved.getId(),
                saved.getIdentityUserId(),
                saved.getBusinessName(),
                target.name(),
                previous.name(),
                reason
        ));

        return toResponse(saved);
    }

    private MerchantProfile getMerchant(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Merchant", id));
    }

    private static String requireReason(String reason, String label) {
        String normalized = trimToNull(reason);
        if (normalized == null) {
            throw new IllegalArgumentException(label + " is required");
        }
        return normalized;
    }

    private static MerchantBusinessType parseBusinessType(String value) {
        try {
            return MerchantBusinessType.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new IllegalArgumentException("Invalid business type: '" + value + "'. Allowed values: "
                    + Arrays.toString(MerchantBusinessType.values()));
        }
    }

    static String normalizeRegistrationNumber(String value) {
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    MerchantResponse toResponse(MerchantProfile entity) {
        MerchantResponse response = new MerchantResponse();
        response.setId(entity.getId());
        response.setIdentityUserId(entity.getIdentityUserId());
        response.setBusinessName(entity.getBusinessName());
        response.setBusinessRegistrationNumber(entity.getBusinessRegistrationNumber());
        response.setBusinessType(entity.getBusinessType() != null ? entity.getBusinessType().name() : null);
        response.setContactPersonName(entity.getContactPersonName());
        response.setContactEmail(entity.getContactEmail());
        response.setContactPhone(entity.getContactPhone());
        response.setBusinessAddressLine1(entity.getBusinessAddressLine1());
        response.setBusinessAddressLine2(entity.getBusinessAddressLine2());
        response.setCity(entity.getCity());
        response.setStatus(entity.getStatus().name());
        response.setRejectionReason(entity.getRejectionReason());
        response.setSuspensionReason(entity.getSuspensionReason());
        response.setReviewedBy(entity.getReviewedBy());
        response.setReviewedAt(entity.getReviewedAt());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        return response;
    }
}

