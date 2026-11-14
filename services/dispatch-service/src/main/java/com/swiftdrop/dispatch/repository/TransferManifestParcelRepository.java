package com.swiftdrop.dispatch.repository;

import com.swiftdrop.dispatch.entity.TransferManifestParcel;
import com.swiftdrop.dispatch.entity.enums.ManifestParcelStatus;
import com.swiftdrop.dispatch.entity.enums.TransferManifestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface TransferManifestParcelRepository extends JpaRepository<TransferManifestParcel, Long> {

    List<TransferManifestParcel> findByManifestIdOrderByAddedAtAsc(Long manifestId);

    Optional<TransferManifestParcel> findByManifestIdAndOrderId(Long manifestId, String orderId);

    List<TransferManifestParcel> findByOrderIdOrderByAddedAtDesc(String orderId);

    List<TransferManifestParcel> findByTrackingNumberIgnoreCaseOrderByAddedAtDesc(String trackingNumber);

    @Query("""
            SELECT COUNT(p) > 0 FROM TransferManifestParcel p
            WHERE (p.orderId = :orderId OR LOWER(p.trackingNumber) = LOWER(:trackingNumber))
              AND p.status IN :activeParcelStatuses
              AND p.manifest.status IN :activeManifestStatuses
            """)
    boolean existsConflictingActiveParcel(
            @Param("orderId") String orderId,
            @Param("trackingNumber") String trackingNumber,
            @Param("activeParcelStatuses") Collection<ManifestParcelStatus> activeParcelStatuses,
            @Param("activeManifestStatuses") Collection<TransferManifestStatus> activeManifestStatuses
    );

    @Query("""
            SELECT p.orderId FROM TransferManifestParcel p
            WHERE p.status IN :blockingStatuses
              AND p.manifest.status IN :blockingManifestStatuses
            """)
    List<String> findBlockedOrderIds(
            @Param("blockingStatuses") Collection<ManifestParcelStatus> blockingStatuses,
            @Param("blockingManifestStatuses") Collection<TransferManifestStatus> blockingManifestStatuses
    );
}

