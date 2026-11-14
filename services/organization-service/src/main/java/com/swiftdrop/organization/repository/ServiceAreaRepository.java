package com.swiftdrop.organization.repository;

import com.swiftdrop.organization.entity.ServiceArea;
import com.swiftdrop.organization.entity.enums.BranchStatus;
import com.swiftdrop.organization.entity.enums.ServiceAreaStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceAreaRepository extends JpaRepository<ServiceArea, Long> {

    @Override
    @EntityGraph(attributePaths = "branch")
    Optional<ServiceArea> findById(Long id);

    @EntityGraph(attributePaths = "branch")
    List<ServiceArea> findByBranchIdOrderByAreaNameAsc(Long branchId);

    @EntityGraph(attributePaths = "branch")
    List<ServiceArea> findByBranchIdAndStatusOrderByAreaNameAsc(Long branchId, ServiceAreaStatus status);

    @EntityGraph(attributePaths = "branch")
    List<ServiceArea> findByStatusOrderByAreaNameAsc(ServiceAreaStatus status);

    @EntityGraph(attributePaths = "branch")
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

