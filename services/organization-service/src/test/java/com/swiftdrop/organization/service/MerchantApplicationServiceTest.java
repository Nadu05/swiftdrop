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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MerchantApplicationServiceTest {

    @Mock
    private MerchantApplicationRepository applicationRepository;

    @Mock
    private MerchantApplicationHistoryRepository historyRepository;

    @InjectMocks
    private MerchantApplicationService applicationService;

    private MerchantApplication sampleApp;

    @BeforeEach
    void setUp() {
        sampleApp = new MerchantApplication();
        sampleApp.setId(1L);
        sampleApp.setApplicationCode("APP-2026-0812");
        sampleApp.setApplicantUserId("usr-merchant-001");
        sampleApp.setApplicantEmail("aruni@ceylonorganic.lk");
        sampleApp.setBusinessName("Ceylon Organic Harvest");
        sampleApp.setLegalName("Ceylon Organic Harvest (Pvt) Ltd");
        sampleApp.setBusinessRegistrationNumber("PV-00984122");
        sampleApp.setCategory(MerchantBusinessCategory.GROCERY_FOOD);
        sampleApp.setContactFullName("Aruni Wickramasinghe");
        sampleApp.setContactDesignation("Operations Director");
        sampleApp.setContactEmail("aruni@ceylonorganic.lk");
        sampleApp.setContactPhone("+94 77 458 9210");
        sampleApp.setStreetAddress("142 Vauxhall Street, Slave Island");
        sampleApp.setCity("Colombo 02");
        sampleApp.setDistrict("Colombo");
        sampleApp.setPostalCode("00200");
        sampleApp.setNearestBranch("Colombo Central Hub");
        sampleApp.setExpectedDailyVolume("40-80 parcels/day");
        sampleApp.setStatus(MerchantApplicationStatus.PENDING);
        sampleApp.setSubmittedAt(LocalDateTime.now().minusDays(2));
        sampleApp.setUpdatedAt(LocalDateTime.now().minusDays(2));
    }

    @Test
    @DisplayName("Should submit new merchant application with PENDING status and record history")
    void shouldSubmitApplicationSuccessfully() {
        MerchantApplicationCreateRequest request = new MerchantApplicationCreateRequest();
        request.setBusinessName("Ceylon Organic Harvest");
        request.setLegalName("Ceylon Organic Harvest (Pvt) Ltd");
        request.setBusinessRegistrationNumber("PV-00984122");
        request.setCategory("GROCERY_FOOD");
        request.setContactFullName("Aruni Wickramasinghe");
        request.setContactDesignation("Operations Director");
        request.setContactEmail("aruni@ceylonorganic.lk");
        request.setContactPhone("+94 77 458 9210");
        request.setStreetAddress("142 Vauxhall Street, Slave Island");
        request.setCity("Colombo 02");
        request.setDistrict("Colombo");
        request.setPostalCode("00200");
        request.setNearestBranch("Colombo Central Hub");
        request.setExpectedDailyVolume("40-80 parcels/day");

        when(applicationRepository.existsByBusinessRegistrationNumberIgnoreCase("PV-00984122"))
                .thenReturn(false);
        when(applicationRepository.count()).thenReturn(5L);
        when(applicationRepository.findByApplicationCodeIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(applicationRepository.save(any(MerchantApplication.class))).thenAnswer(inv -> {
            MerchantApplication saved = inv.getArgument(0);
            saved.setId(10L);
            saved.setSubmittedAt(LocalDateTime.now());
            return saved;
        });
        when(historyRepository.findByApplicationIdOrderByCreatedAtAsc(10L)).thenReturn(List.of());

        MerchantApplicationResponse response = applicationService.submitApplication(
                request, "usr-merchant-001", "aruni@ceylonorganic.lk"
        );

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo("PENDING");
        assertThat(response.getBusinessName()).isEqualTo("Ceylon Organic Harvest");
        assertThat(response.getApplicantUserId()).isEqualTo("usr-merchant-001");
        assertThat(response.getCategory()).isEqualTo("GROCERY_FOOD");

        ArgumentCaptor<MerchantApplicationHistory> historyCaptor =
                ArgumentCaptor.forClass(MerchantApplicationHistory.class);
        verify(historyRepository).save(historyCaptor.capture());
        assertThat(historyCaptor.getValue().getAction()).isEqualTo("SUBMITTED");
        assertThat(historyCaptor.getValue().getNewStatus()).isEqualTo(MerchantApplicationStatus.PENDING);
    }

    @Test
    @DisplayName("Should throw DuplicateResourceException when Business Registration Number already exists")
    void shouldRejectDuplicateBrn() {
        MerchantApplicationCreateRequest request = new MerchantApplicationCreateRequest();
        request.setBusinessName("Duplicate Co");
        request.setBusinessRegistrationNumber("PV-00984122");
        request.setCategory("RETAIL");
        request.setContactFullName("John Doe");
        request.setContactEmail("john@example.com");
        request.setContactPhone("+94 77 123 4567");
        request.setStreetAddress("12 Main St");
        request.setCity("Colombo");

        when(applicationRepository.existsByBusinessRegistrationNumberIgnoreCase("PV-00984122"))
                .thenReturn(true);

        assertThatThrownBy(() -> applicationService.submitApplication(request, "usr-1", "john@example.com"))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("PV-00984122");
    }

    @Test
    @DisplayName("Should approve pending merchant application and record approval history")
    void shouldApproveApplication() {
        when(applicationRepository.findByApplicationCodeIgnoreCase("APP-2026-0812"))
                .thenReturn(Optional.of(sampleApp));
        when(applicationRepository.save(any(MerchantApplication.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(historyRepository.findByApplicationIdOrderByCreatedAtAsc(1L)).thenReturn(List.of());

        MerchantApplicationApproveRequest approveRequest =
                new MerchantApplicationApproveRequest("BRN verified with Registrar of Companies.");

        MerchantApplicationResponse response = applicationService.approveApplication(
                "APP-2026-0812", approveRequest, "admin@swiftdrop.lk", "usr-admin-01"
        );

        assertThat(response.getStatus()).isEqualTo("APPROVED");
        assertThat(response.getReviewedBy()).isEqualTo("admin@swiftdrop.lk");
        assertThat(response.getReviewNotes()).isEqualTo("BRN verified with Registrar of Companies.");

        ArgumentCaptor<MerchantApplicationHistory> historyCaptor =
                ArgumentCaptor.forClass(MerchantApplicationHistory.class);
        verify(historyRepository).save(historyCaptor.capture());
        assertThat(historyCaptor.getValue().getPreviousStatus()).isEqualTo(MerchantApplicationStatus.PENDING);
        assertThat(historyCaptor.getValue().getNewStatus()).isEqualTo(MerchantApplicationStatus.APPROVED);
        assertThat(historyCaptor.getValue().getAction()).isEqualTo("APPROVED");
    }

    @Test
    @DisplayName("Should reject pending merchant application with rejection reason and record history")
    void shouldRejectApplicationWithReason() {
        when(applicationRepository.findByApplicationCodeIgnoreCase("APP-2026-0812"))
                .thenReturn(Optional.of(sampleApp));
        when(applicationRepository.save(any(MerchantApplication.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(historyRepository.findByApplicationIdOrderByCreatedAtAsc(1L)).thenReturn(List.of());

        MerchantApplicationRejectRequest rejectRequest = new MerchantApplicationRejectRequest(
                "Uploaded BRN certificate is illegible.",
                "Please upload a clear scan."
        );

        MerchantApplicationResponse response = applicationService.rejectApplication(
                "APP-2026-0812", rejectRequest, "admin@swiftdrop.lk", "usr-admin-01"
        );

        assertThat(response.getStatus()).isEqualTo("REJECTED");
        assertThat(response.getRejectionReason()).isEqualTo("Uploaded BRN certificate is illegible.");
        assertThat(response.getReviewedBy()).isEqualTo("admin@swiftdrop.lk");

        ArgumentCaptor<MerchantApplicationHistory> historyCaptor =
                ArgumentCaptor.forClass(MerchantApplicationHistory.class);
        verify(historyRepository).save(historyCaptor.capture());
        assertThat(historyCaptor.getValue().getNewStatus()).isEqualTo(MerchantApplicationStatus.REJECTED);
        assertThat(historyCaptor.getValue().getReason()).isEqualTo("Uploaded BRN certificate is illegible.");
    }

    @Test
    @DisplayName("Should prevent approving or rejecting an already APPROVED application")
    void shouldPreventMutatingAlreadyApprovedApplication() {
        sampleApp.setStatus(MerchantApplicationStatus.APPROVED);
        when(applicationRepository.findByApplicationCodeIgnoreCase("APP-2026-0812"))
                .thenReturn(Optional.of(sampleApp));

        assertThatThrownBy(() -> applicationService.approveApplication(
                "APP-2026-0812", new MerchantApplicationApproveRequest("Notes"), "admin@swiftdrop.lk", "usr-admin-01"
        )).isInstanceOf(IllegalStateException.class);

        assertThatThrownBy(() -> applicationService.rejectApplication(
                "APP-2026-0812", new MerchantApplicationRejectRequest("Reason", null), "admin@swiftdrop.lk", "usr-admin-01"
        )).isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when application code does not exist")
    void shouldThrowWhenApplicationNotFound() {
        when(applicationRepository.findByApplicationCodeIgnoreCase("APP-9999"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> applicationService.findByIdOrCode("APP-9999"))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}

