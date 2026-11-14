package com.swiftdrop.dispatch.repository;

import com.swiftdrop.dispatch.entity.DeliveryException;
import com.swiftdrop.dispatch.entity.enums.ExceptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DeliveryExceptionRepository extends JpaRepository<DeliveryException, Long> {

    Optional<DeliveryException> findByExceptionCodeIgnoreCase(String exceptionCode);

    Optional<DeliveryException> findByDeliveryJobIdAndStatus(Long deliveryJobId, ExceptionStatus status);

    List<DeliveryException> findByDeliveryJobIdOrderByCreatedAtDesc(Long deliveryJobId);

    List<DeliveryException> findByTransferManifestIdOrderByCreatedAtDesc(Long transferManifestId);

    List<DeliveryException> findByTrackingNumberIgnoreCaseOrderByCreatedAtDesc(String trackingNumber);

    List<DeliveryException> findByBranchIdOrderByCreatedAtDesc(Long branchId);

    List<DeliveryException> findByBranchIdAndStatusOrderByCreatedAtDesc(Long branchId, ExceptionStatus status);

    List<DeliveryException> findByStatusOrderByCreatedAtDesc(ExceptionStatus status);

    List<DeliveryException> findAllByOrderByCreatedAtDesc();
}

