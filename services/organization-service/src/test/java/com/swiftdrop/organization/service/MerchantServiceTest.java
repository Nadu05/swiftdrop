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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.MDC;
import org.springframework.context.ApplicationEventPublisher;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MerchantServiceTest {

    @Mock
    private MerchantProfileRepository repository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    private Clock fixedClock;
    private MerchantService service;
    private MerchantProfile sampleProfile;

    @BeforeEach
    void setUp() {
        fixedClock = Clock.fixed(Instant.parse("2026-11-13T10:00:00Z"), ZoneId.of("UTC"));
        service = new MerchantService(repository, eventPublisher, fixedClock);

        sampleProfile = new MerchantProfile();
        sampleProfile.setId(10L);
        sampleProfile.setIdentityUserId("user-uuid-123");
        sampleProfile.setBusinessName("Fresh Mart Supermarket");
        sampleProfile.setBusinessRegistrationNumber("PV-12345");
        sampleProfile.setContactPersonName("Kamal Perera");
        sampleProfile.setContactEmail("kamal@freshmart.lk");
        sampleProfile.setContactPhone("+94771234567");
        sampleProfile.setBusinessAddressLine1("10 Galle Road");
        sampleProfile.setBusinessAddressLine2("Bambalapitiya");
        sampleProfile.setCity("Colombo");
        sampleProfile.setBusinessType(MerchantBusinessType.GROCERY_FOOD);
        sampleProfile.setStatus(MerchantStatus.PENDING);
        sampleProfile.setCreatedAt(LocalDateTime.now(fixedClock));
        sampleProfile.setUpdatedAt(LocalDateTime.now(fixedClock));
    }

    @Nested
    @DisplayName("Registration Tests")
    class RegistrationTests {

        @Test
        @DisplayName("Successfully register merchant in PENDING status")
        void register_Success() {
            MerchantRegistrationRequest request = new MerchantRegistrationRequest(
                    "user-uuid-123",
                    "Fresh Mart Supermarket",
                    "pv-12345", // Test normalization to uppercase
                    "GROCERY_FOOD",
                    "Kamal Perera",
                    "kamal@freshmart.lk",
                    "+94771234567",
                    "10 Galle Road",
                    "Bambalapitiya",
                    "Colombo"
            );

            when(repository.existsByBusinessRegistrationNumber("PV-12345")).thenReturn(false);
            when(repository.existsByIdentityUserId("user-uuid-123")).thenReturn(false);
            when(repository.save(any(MerchantProfile.class))).thenAnswer(invocation -> {
                MerchantProfile p = invocation.getArgument(0);
                p.setId(10L);
                p.setCreatedAt(LocalDateTime.now(fixedClock));
                p.setUpdatedAt(LocalDateTime.now(fixedClock));
                return p;
            });

            MerchantResponse response = service.register(request);

            assertThat(response).isNotNull();
            assertThat(response.getId()).isEqualTo(10L);
            assertThat(response.getBusinessName()).isEqualTo("Fresh Mart Supermarket");
            assertThat(response.getBusinessRegistrationNumber()).isEqualTo("PV-12345");
            assertThat(response.getStatus()).isEqualTo("PENDING");
            assertThat(response.getBusinessType()).isEqualTo("GROCERY_FOOD");
            verify(repository).save(any(MerchantProfile.class));
            verifyNoInteractions(eventPublisher); // Registration does not publish lifecycle events
        }

        @Test
        @DisplayName("Registration fails when identityUserId already has a profile")
        void register_DuplicateIdentityUserId_ThrowsConflict() {
            MerchantRegistrationRequest request = new MerchantRegistrationRequest(
                    "user-uuid-123",
                    "Fresh Mart Supermarket",
                    "PV-12345",
                    "GROCERY_FOOD",
                    "Kamal Perera",
                    "kamal@freshmart.lk",
                    "+94771234567",
                    "10 Galle Road",
                    null,
                    "Colombo"
            );

            when(repository.existsByBusinessRegistrationNumber("PV-12345")).thenReturn(false);
            when(repository.existsByIdentityUserId("user-uuid-123")).thenReturn(true);

            assertThatThrownBy(() -> service.register(request))
                    .isInstanceOf(DuplicateResourceException.class)
                    .hasMessageContaining("user-uuid-123");

            verify(repository, never()).save(any());
        }

        @Test
        @DisplayName("Registration fails when business registration number already exists")
        void register_DuplicateBRN_ThrowsConflict() {
            MerchantRegistrationRequest request = new MerchantRegistrationRequest(
                    "user-uuid-456",
                    "Fresh Mart Supermarket",
                    "PV-12345",
                    "RETAIL",
                    "Kamal Perera",
                    "kamal@freshmart.lk",
                    "+94771234567",
                    "10 Galle Road",
                    null,
                    "Colombo"
            );

            when(repository.existsByBusinessRegistrationNumber("PV-12345")).thenReturn(true);

            assertThatThrownBy(() -> service.register(request))
                    .isInstanceOf(DuplicateResourceException.class)
                    .hasMessageContaining("PV-12345");

            verify(repository, never()).save(any());
        }

        @Test
        @DisplayName("Registration throws exception on invalid business type")
        void register_InvalidBusinessType_ThrowsIllegalArgument() {
            MerchantRegistrationRequest request = new MerchantRegistrationRequest(
                    "user-uuid-789",
                    "General Store",
                    "PV-99999",
                    "INVALID_TYPE",
                    "Nimal Silva",
                    "nimal@store.lk",
                    "+94771234567",
                    "15 Kandy Road",
                    null,
                    "Kadawatha"
            );

            when(repository.existsByBusinessRegistrationNumber("PV-99999")).thenReturn(false);
            when(repository.existsByIdentityUserId("user-uuid-789")).thenReturn(false);

            assertThatThrownBy(() -> service.register(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Invalid business type");
        }
    }

    @Nested
    @DisplayName("Retrieval Tests")
    class RetrievalTests {

        @Test
        @DisplayName("Find merchant by ID - success")
        void findById_Success() {
            when(repository.findById(10L)).thenReturn(Optional.of(sampleProfile));

            MerchantResponse response = service.findById(10L);

            assertThat(response).isNotNull();
            assertThat(response.getId()).isEqualTo(10L);
            assertThat(response.getBusinessName()).isEqualTo("Fresh Mart Supermarket");
        }

        @Test
        @DisplayName("Find merchant by ID - not found throws 404")
        void findById_NotFound_ThrowsException() {
            when(repository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.findById(999L))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("999");
        }

        @Test
        @DisplayName("Find merchant by identityUserId - success")
        void findByIdentityUserId_Success() {
            when(repository.findByIdentityUserId("user-uuid-123")).thenReturn(Optional.of(sampleProfile));

            MerchantResponse response = service.findByIdentityUserId("user-uuid-123");

            assertThat(response).isNotNull();
            assertThat(response.getIdentityUserId()).isEqualTo("user-uuid-123");
        }

        @Test
        @DisplayName("Find merchant by identityUserId - blank input throws 400")
        void findByIdentityUserId_Blank_ThrowsIllegalArgument() {
            assertThatThrownBy(() -> service.findByIdentityUserId("   "))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("Find merchant by identityUserId - not found throws 404")
        void findByIdentityUserId_NotFound_ThrowsException() {
            when(repository.findByIdentityUserId("missing-uuid")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.findByIdentityUserId("missing-uuid"))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("missing-uuid");
        }

        @Test
        @DisplayName("Find all merchants without filter")
        void findAll_NoFilter_ReturnsList() {
            when(repository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(sampleProfile));

            List<MerchantResponse> result = service.findAll(null);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getId()).isEqualTo(10L);
        }

        @Test
        @DisplayName("Find all merchants with status filter")
        void findAll_WithStatusFilter_ReturnsFilteredList() {
            when(repository.findByStatusOrderByCreatedAtDesc(MerchantStatus.APPROVED))
                    .thenReturn(List.of(sampleProfile));

            List<MerchantResponse> result = service.findAll(MerchantStatus.APPROVED);

            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("Find pending applications ordered by createdAt ascending")
        void findPendingApplications_ReturnsPendingList() {
            when(repository.findByStatusOrderByCreatedAtAsc(MerchantStatus.PENDING))
                    .thenReturn(List.of(sampleProfile));

            List<MerchantResponse> result = service.findPendingApplications();

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getStatus()).isEqualTo("PENDING");
        }
    }

    @Nested
    @DisplayName("Update Tests")
    class UpdateTests {

        @Test
        @DisplayName("Update merchant details successfully without affecting status")
        void update_Success() {
            when(repository.findById(10L)).thenReturn(Optional.of(sampleProfile));
            when(repository.existsByBusinessRegistrationNumber("PV-12345-NEW")).thenReturn(false);
            when(repository.save(any(MerchantProfile.class))).thenAnswer(i -> i.getArgument(0));

            MerchantUpdateRequest request = new MerchantUpdateRequest(
                    "Fresh Mart Supermarket Updated",
                    "PV-12345-NEW",
                    "RETAIL",
                    "Sunil Perera",
                    "sunil@freshmart.lk",
                    "+94779876543",
                    "20 Galle Road",
                    "Colpetty",
                    "Colombo"
            );

            MerchantResponse response = service.update(10L, request);

            assertThat(response.getBusinessName()).isEqualTo("Fresh Mart Supermarket Updated");
            assertThat(response.getBusinessRegistrationNumber()).isEqualTo("PV-12345-NEW");
            assertThat(response.getStatus()).isEqualTo("PENDING"); // Preserves status
            assertThat(response.getBusinessType()).isEqualTo("RETAIL");
        }

        @Test
        @DisplayName("Update fails when changing to another merchant's BRN")
        void update_DuplicateBRN_ThrowsConflict() {
            when(repository.findById(10L)).thenReturn(Optional.of(sampleProfile));
            when(repository.existsByBusinessRegistrationNumber("PV-99999")).thenReturn(true);

            MerchantUpdateRequest request = new MerchantUpdateRequest(
                    "Fresh Mart",
                    "PV-99999",
                    "GROCERY_FOOD",
                    "Kamal",
                    "kamal@fm.lk",
                    "+94771234567",
                    "10 Galle Road",
                    null,
                    "Colombo"
            );

            assertThatThrownBy(() -> service.update(10L, request))
                    .isInstanceOf(DuplicateResourceException.class)
                    .hasMessageContaining("PV-99999");
        }
    }

    @Nested
    @DisplayName("Status Transition Tests")
    class StatusTransitionTests {

        @AfterEach
        void clearMdc() {
            MDC.clear();
        }

        @Test
        @DisplayName("Approve merchant: PENDING -> APPROVED publishes event and propagates correlationId from MDC")
        void approve_FromPending_Success() {
            MDC.put(CorrelationIdFilter.MDC_KEY, "corr-approve-10");
            when(repository.findById(10L)).thenReturn(Optional.of(sampleProfile));
            when(repository.save(any(MerchantProfile.class))).thenAnswer(i -> i.getArgument(0));

            MerchantResponse response = service.approve(10L);

            assertThat(response.getStatus()).isEqualTo("APPROVED");
            assertThat(response.getReviewedAt()).isNotNull();

            ArgumentCaptor<MerchantLifecycleEvent> eventCaptor = ArgumentCaptor.forClass(MerchantLifecycleEvent.class);
            verify(eventPublisher).publishEvent(eventCaptor.capture());
            MerchantLifecycleEvent published = eventCaptor.getValue();
            assertThat(published.eventType()).isEqualTo(MerchantEventType.APPROVED.eventType());
            assertThat(published.correlationId()).isEqualTo("corr-approve-10");
            assertThat(published.merchantId()).isEqualTo(10L);
            assertThat(published.previousStatus()).isEqualTo("PENDING");
            assertThat(published.status()).isEqualTo("APPROVED");
            assertThat(published.reason()).isNull();
        }

        @Test
        @DisplayName("Approve merchant fails when already APPROVED (invalid transition)")
        void approve_FromApproved_ThrowsConflict() {
            sampleProfile.setStatus(MerchantStatus.APPROVED);
            when(repository.findById(10L)).thenReturn(Optional.of(sampleProfile));

            assertThatThrownBy(() -> service.approve(10L))
                    .isInstanceOf(InvalidMerchantStatusTransitionException.class)
                    .hasMessageContaining("APPROVED to APPROVED");

            verifyNoInteractions(eventPublisher);
        }

        @Test
        @DisplayName("Reject merchant: PENDING -> REJECTED with reason publishes event")
        void reject_FromPending_Success() {
            when(repository.findById(10L)).thenReturn(Optional.of(sampleProfile));
            when(repository.save(any(MerchantProfile.class))).thenAnswer(i -> i.getArgument(0));

            MerchantResponse response = service.reject(10L, "Invalid business registration document");

            assertThat(response.getStatus()).isEqualTo("REJECTED");
            assertThat(response.getReviewedAt()).isNotNull();
            assertThat(response.getRejectionReason()).isEqualTo("Invalid business registration document");

            ArgumentCaptor<MerchantLifecycleEvent> eventCaptor = ArgumentCaptor.forClass(MerchantLifecycleEvent.class);
            verify(eventPublisher).publishEvent(eventCaptor.capture());
            MerchantLifecycleEvent published = eventCaptor.getValue();
            assertThat(published.eventType()).isEqualTo(MerchantEventType.REJECTED.eventType());
            assertThat(published.reason()).isEqualTo("Invalid business registration document");
            assertThat(published.previousStatus()).isEqualTo("PENDING");
            assertThat(published.status()).isEqualTo("REJECTED");
        }

        @Test
        @DisplayName("Reject merchant fails if reason is blank")
        void reject_BlankReason_ThrowsBadRequest() {
            assertThatThrownBy(() -> service.reject(10L, "   "))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Rejection reason is required");

            verifyNoInteractions(eventPublisher);
            verifyNoInteractions(repository);
        }

        @Test
        @DisplayName("Reject merchant fails if merchant is already APPROVED")
        void reject_FromApproved_ThrowsConflict() {
            sampleProfile.setStatus(MerchantStatus.APPROVED);
            when(repository.findById(10L)).thenReturn(Optional.of(sampleProfile));

            assertThatThrownBy(() -> service.reject(10L, "Some reason"))
                    .isInstanceOf(InvalidMerchantStatusTransitionException.class)
                    .hasMessageContaining("APPROVED to REJECTED");

            verifyNoInteractions(eventPublisher);
        }

        @Test
        @DisplayName("Suspend merchant: APPROVED -> SUSPENDED with reason publishes event")
        void suspend_FromApproved_Success() {
            sampleProfile.setStatus(MerchantStatus.APPROVED);
            when(repository.findById(10L)).thenReturn(Optional.of(sampleProfile));
            when(repository.save(any(MerchantProfile.class))).thenAnswer(i -> i.getArgument(0));

            MerchantResponse response = service.suspend(10L, "Account flagged for non-payment");

            assertThat(response.getStatus()).isEqualTo("SUSPENDED");
            assertThat(response.getReviewedAt()).isNotNull();
            assertThat(response.getSuspensionReason()).isEqualTo("Account flagged for non-payment");

            ArgumentCaptor<MerchantLifecycleEvent> eventCaptor = ArgumentCaptor.forClass(MerchantLifecycleEvent.class);
            verify(eventPublisher).publishEvent(eventCaptor.capture());
            MerchantLifecycleEvent published = eventCaptor.getValue();
            assertThat(published.eventType()).isEqualTo(MerchantEventType.SUSPENDED.eventType());
            assertThat(published.previousStatus()).isEqualTo("APPROVED");
            assertThat(published.status()).isEqualTo("SUSPENDED");
            assertThat(published.reason()).isEqualTo("Account flagged for non-payment");
        }

        @Test
        @DisplayName("Suspend merchant fails from PENDING (only APPROVED can be SUSPENDED)")
        void suspend_FromPending_ThrowsConflict() {
            when(repository.findById(10L)).thenReturn(Optional.of(sampleProfile));

            assertThatThrownBy(() -> service.suspend(10L, "Some reason"))
                    .isInstanceOf(InvalidMerchantStatusTransitionException.class)
                    .hasMessageContaining("PENDING to SUSPENDED");

            verifyNoInteractions(eventPublisher);
        }

        @Test
        @DisplayName("Suspend merchant fails if reason is blank")
        void suspend_BlankReason_ThrowsBadRequest() {
            assertThatThrownBy(() -> service.suspend(10L, ""))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Suspension reason is required");
        }

        @Test
        @DisplayName("Reactivate merchant: SUSPENDED -> APPROVED publishes event and clears suspensionReason")
        void reactivate_FromSuspended_Success() {
            sampleProfile.setStatus(MerchantStatus.SUSPENDED);
            sampleProfile.setSuspensionReason("Prior issues resolved");
            sampleProfile.setReviewedAt(LocalDateTime.now(fixedClock).minusDays(3));

            when(repository.findById(10L)).thenReturn(Optional.of(sampleProfile));
            when(repository.save(any(MerchantProfile.class))).thenAnswer(i -> i.getArgument(0));

            MerchantResponse response = service.reactivate(10L);

            assertThat(response.getStatus()).isEqualTo("APPROVED");
            assertThat(response.getSuspensionReason()).isNull();

            ArgumentCaptor<MerchantLifecycleEvent> eventCaptor = ArgumentCaptor.forClass(MerchantLifecycleEvent.class);
            verify(eventPublisher).publishEvent(eventCaptor.capture());
            MerchantLifecycleEvent published = eventCaptor.getValue();
            assertThat(published.eventType()).isEqualTo(MerchantEventType.REACTIVATED.eventType());
            assertThat(published.previousStatus()).isEqualTo("SUSPENDED");
            assertThat(published.status()).isEqualTo("APPROVED");
            assertThat(published.reason()).isNull();
        }

        @Test
        @DisplayName("Reactivate merchant fails from PENDING or REJECTED")
        void reactivate_FromRejected_ThrowsConflict() {
            sampleProfile.setStatus(MerchantStatus.REJECTED);
            when(repository.findById(10L)).thenReturn(Optional.of(sampleProfile));

            assertThatThrownBy(() -> service.reactivate(10L))
                    .isInstanceOf(InvalidMerchantStatusTransitionException.class)
                    .hasMessageContaining("REJECTED to APPROVED");
        }
    }
}
