package com.swiftdrop.organization.repository;

import com.swiftdrop.organization.entity.MerchantProfile;
import com.swiftdrop.organization.entity.enums.MerchantStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MerchantProfileRepository extends JpaRepository<MerchantProfile, Long> {

    Optional<MerchantProfile> findByIdentityUserId(String identityUserId);

    Optional<MerchantProfile> findByBusinessRegistrationNumber(String businessRegistrationNumber);

    boolean existsByBusinessRegistrationNumber(String businessRegistrationNumber);

    boolean existsByIdentityUserId(String identityUserId);

    /** All merchants, newest registrations first. */
    List<MerchantProfile> findAllByOrderByCreatedAtDesc();

    /** Merchants in a given status, newest first. */
    List<MerchantProfile> findByStatusOrderByCreatedAtDesc(MerchantStatus status);

    /** Review queue ordering: oldest submissions first (FIFO). Used for PENDING applications. */
    List<MerchantProfile> findByStatusOrderByCreatedAtAsc(MerchantStatus status);
}

