package com.swiftdrop.dispatch.repository;

import com.swiftdrop.dispatch.entity.TransferManifest;
import com.swiftdrop.dispatch.entity.enums.TransferManifestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TransferManifestRepository extends JpaRepository<TransferManifest, Long> {

    Optional<TransferManifest> findByManifestCodeIgnoreCase(String manifestCode);

    boolean existsByManifestCodeIgnoreCase(String manifestCode);

    @Query("SELECT m FROM TransferManifest m WHERE m.originBranchId = :branchId OR m.destinationBranchId = :branchId ORDER BY m.createdAt DESC")
    List<TransferManifest> findByOriginOrDestinationBranchOrderByCreatedAtDesc(@Param("branchId") Long branchId);

    List<TransferManifest> findByOriginBranchIdOrderByCreatedAtDesc(Long originBranchId);

    List<TransferManifest> findByDestinationBranchIdOrderByCreatedAtDesc(Long destinationBranchId);

    List<TransferManifest> findByAssignedCourierIdOrderByCreatedAtDesc(Long courierId);

    List<TransferManifest> findByStatusOrderByCreatedAtDesc(TransferManifestStatus status);

    List<TransferManifest> findAllByOrderByCreatedAtDesc();
}

