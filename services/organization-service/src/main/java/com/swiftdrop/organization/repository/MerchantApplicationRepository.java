package com.swiftdrop.organization.repository;

import com.swiftdrop.organization.entity.MerchantApplication;
import com.swiftdrop.organization.entity.enums.MerchantApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MerchantApplicationRepository extends JpaRepository<MerchantApplication, Long> {

    Optional<MerchantApplication> findByApplicationCodeIgnoreCase(String applicationCode);

    Optional<MerchantApplication> findByBusinessRegistrationNumberIgnoreCase(String businessRegistrationNumber);

    boolean existsByBusinessRegistrationNumberIgnoreCase(String businessRegistrationNumber);

    List<MerchantApplication> findByApplicantUserIdOrderBySubmittedAtDesc(String applicantUserId);

    List<MerchantApplication> findByStatusOrderBySubmittedAtDesc(MerchantApplicationStatus status);

    long countByStatus(MerchantApplicationStatus status);
}

