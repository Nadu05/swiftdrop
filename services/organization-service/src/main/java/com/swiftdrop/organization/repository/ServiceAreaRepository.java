package com.swiftdrop.organization.repository;

import com.swiftdrop.organization.entity.ServiceArea;
import com.swiftdrop.organization.entity.enums.BranchStatus;
import com.swiftdrop.organization.entity.enums.ServiceAreaStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceAreaRepository extends JpaRepository<ServiceArea, Long> {

    List<ServiceArea> findByBranchIdOrderByAreaNameAsc(Long branchId);

    List<ServiceArea> findByBranchIdAndStatusOrderByAreaNameAsc(Long branchId, ServiceAreaStatus status);

    List<ServiceArea> findByStatusOrderByAreaNameAsc(ServiceAreaStatus status);

    List<ServiceArea> findAllByOrderByAreaNameAsc();

    /**
     * Efficiently retrieves active service areas alongside their active parent branch in one query.
     * Used by the automatic branch resolution engine.
     */
    @Query("SELECT sa FROM ServiceArea sa JOIN FETCH sa.branch b WHERE sa.status = :serviceAreaStatus AND b.status = :branchStatus")
    List<ServiceArea> findActiveServiceAreasForActiveBranches(
            @Param("serviceAreaStatus") ServiceAreaStatus serviceAreaStatus,
            @Param("branchStatus") BranchStatus branchStatus
    );
}

