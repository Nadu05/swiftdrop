package com.swiftdrop.organization.repository;

import com.swiftdrop.organization.entity.MerchantProfile;
import com.swiftdrop.organization.entity.enums.MerchantBusinessType;
import com.swiftdrop.organization.entity.enums.MerchantStatus;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class MerchantProfileRepositoryTest {

    @Autowired
    private MerchantProfileRepository repository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @DisplayName("Persists merchant profile, initializes @Version to 0, and supports lookup by BRN and identityUserId")
    void saveAndFindLookups_Success() {
        MerchantProfile saved = repository.saveAndFlush(
                buildMerchant("user-101", "Fresh Mart", "PV-10101", MerchantStatus.PENDING));

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getVersion()).isEqualTo(0L);
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();

        assertThat(repository.existsByBusinessRegistrationNumber("PV-10101")).isTrue();
        assertThat(repository.existsByIdentityUserId("user-101")).isTrue();
        assertThat(repository.findByBusinessRegistrationNumber("PV-10101")).isPresent();
        assertThat(repository.findByIdentityUserId("user-101")).isPresent();
    }

    @Test
    @DisplayName("Enforces unique constraint on business_registration_number")
    void save_DuplicateBusinessRegistrationNumber_ThrowsDataIntegrityViolation() {
        repository.saveAndFlush(buildMerchant("user-1", "Merchant One", "PV-DUP-999", MerchantStatus.PENDING));

        MerchantProfile duplicateBrn = buildMerchant("user-2", "Merchant Two", "PV-DUP-999", MerchantStatus.PENDING);

        assertThatThrownBy(() -> repository.saveAndFlush(duplicateBrn))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("Enforces unique constraint on identity_user_id")
    void save_DuplicateIdentityUserId_ThrowsDataIntegrityViolation() {
        repository.saveAndFlush(buildMerchant("user-dup", "Merchant One", "PV-11111", MerchantStatus.PENDING));

        MerchantProfile duplicateUser = buildMerchant("user-dup", "Merchant Two", "PV-22222", MerchantStatus.PENDING);

        assertThatThrownBy(() -> repository.saveAndFlush(duplicateUser))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("Supports status filtering and FIFO ordering for pending applications")
    void statusFilteringAndOrdering_WorksCorrectly() {
        MerchantProfile firstPending = repository.saveAndFlush(
                buildMerchant("u-1", "Alpha Store", "PV-001", MerchantStatus.PENDING));
        MerchantProfile approved = repository.saveAndFlush(
                buildMerchant("u-2", "Beta Store", "PV-002", MerchantStatus.APPROVED));
        MerchantProfile secondPending = repository.saveAndFlush(
                buildMerchant("u-3", "Gamma Store", "PV-003", MerchantStatus.PENDING));

        List<MerchantProfile> pendingFifo = repository.findByStatusOrderByCreatedAtAsc(MerchantStatus.PENDING);
        assertThat(pendingFifo).extracting(MerchantProfile::getId)
                .containsExactly(firstPending.getId(), secondPending.getId());

        List<MerchantProfile> approvedList = repository.findByStatusOrderByCreatedAtDesc(MerchantStatus.APPROVED);
        assertThat(approvedList).extracting(MerchantProfile::getId)
                .containsExactly(approved.getId());
    }

    @Test
    @DisplayName("Enforces @Version optimistic locking when saving a stale detached merchant snapshot")
    void versionOptimisticLocking_StaleUpdateThrowsException() {
        MerchantProfile saved = repository.saveAndFlush(
                buildMerchant("user-lock", "Lock Test Mart", "PV-LOCK-1", MerchantStatus.PENDING));
        entityManager.clear();

        // Snapshot A and Snapshot B both read version = 0
        MerchantProfile snapshotA = repository.findById(saved.getId()).orElseThrow();
        entityManager.detach(snapshotA);

        MerchantProfile snapshotB = repository.findById(saved.getId()).orElseThrow();
        entityManager.detach(snapshotB);

        // First concurrent transaction commits (version 0 -> 1)
        snapshotA.setStatus(MerchantStatus.APPROVED);
        MerchantProfile updatedA = repository.saveAndFlush(snapshotA);
        assertThat(updatedA.getVersion()).isEqualTo(1L);
        entityManager.clear();

        // Second concurrent transaction attempts to save stale snapshotB (still at version 0)
        snapshotB.setStatus(MerchantStatus.REJECTED);
        assertThatThrownBy(() -> repository.saveAndFlush(snapshotB))
                .isInstanceOf(ObjectOptimisticLockingFailureException.class);
    }

    private MerchantProfile buildMerchant(String identityUserId, String businessName,
                                          String brn, MerchantStatus status) {
        MerchantProfile merchant = new MerchantProfile();
        merchant.setIdentityUserId(identityUserId);
        merchant.setBusinessName(businessName);
        merchant.setBusinessRegistrationNumber(brn);
        merchant.setBusinessType(MerchantBusinessType.RETAIL);
        merchant.setContactPersonName("Kamal Perera");
        merchant.setContactEmail("kamal@example.lk");
        merchant.setContactPhone("+94771234567");
        merchant.setBusinessAddressLine1("10 Galle Road");
        merchant.setCity("Colombo");
        merchant.setStatus(status);
        return merchant;
    }
}

