package com.swiftdrop.organization.repository;

import com.swiftdrop.organization.entity.BranchPostalArea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BranchPostalAreaRepository extends JpaRepository<BranchPostalArea, Long> {

    List<BranchPostalArea> findByBranchIdAndIsActiveTrue(Long branchId);

    Optional<BranchPostalArea> findByPostalAreaIdAndIsActiveTrue(Long postalAreaId);

    @Query("""
            SELECT bpa FROM BranchPostalArea bpa
            JOIN FETCH bpa.branch
            JOIN FETCH bpa.postalArea
            WHERE bpa.postalArea.id IN :postalAreaIds
              AND bpa.isActive = true
            """)
    List<BranchPostalArea> findActiveByPostalAreaIdIn(@Param("postalAreaIds") Collection<Long> postalAreaIds);

    @Query("""
            SELECT bpa FROM BranchPostalArea bpa
            JOIN FETCH bpa.branch b
            JOIN FETCH bpa.postalArea pa
            WHERE pa.postalCode = :postalCode
              AND pa.isActive = true
              AND bpa.isActive = true
              AND b.status = com.swiftdrop.organization.entity.enums.BranchStatus.ACTIVE
            """)
    Optional<BranchPostalArea> findActiveByPostalCodeAndActiveBranch(@Param("postalCode") String postalCode);
}
