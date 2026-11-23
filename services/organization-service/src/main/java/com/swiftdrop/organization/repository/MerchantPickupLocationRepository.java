package com.swiftdrop.organization.repository;

import com.swiftdrop.organization.entity.MerchantPickupLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MerchantPickupLocationRepository extends JpaRepository<MerchantPickupLocation, Long> {

    List<MerchantPickupLocation> findByMerchantOrganizationIdOrderByIsDefaultDescCreatedAtDesc(
            String merchantOrganizationId);

    Optional<MerchantPickupLocation> findByIdAndMerchantOrganizationId(Long id, String merchantOrganizationId);

    long countByMerchantOrganizationId(String merchantOrganizationId);

    @Modifying
    @Query("UPDATE MerchantPickupLocation l SET l.isDefault = false WHERE l.merchantOrganizationId = :merchantOrgId AND l.isDefault = true")
    void clearDefaultForMerchant(@Param("merchantOrgId") String merchantOrgId);
}

