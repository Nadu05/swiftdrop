package com.swiftdrop.dispatch.repository;

import com.swiftdrop.dispatch.entity.ParcelCustodyRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ParcelCustodyRecordRepository extends JpaRepository<ParcelCustodyRecord, Long> {

    boolean existsByCustodyCodeIgnoreCase(String custodyCode);

    List<ParcelCustodyRecord> findByOrderIdOrderByHandoverTimestampAsc(String orderId);

    List<ParcelCustodyRecord> findByTrackingNumberIgnoreCaseOrderByHandoverTimestampAsc(String trackingNumber);

    List<ParcelCustodyRecord> findByManifestIdOrderByHandoverTimestampAsc(Long manifestId);

    List<ParcelCustodyRecord> findByReturnTaskIdOrderByHandoverTimestampAsc(Long returnTaskId);

    List<ParcelCustodyRecord> findAllByOrderByHandoverTimestampDesc();
}

