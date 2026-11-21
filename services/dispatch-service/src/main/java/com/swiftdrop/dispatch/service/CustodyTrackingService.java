package com.swiftdrop.dispatch.service;

import com.swiftdrop.dispatch.dto.CustodyRecordDto;
import com.swiftdrop.dispatch.entity.CourierProfileEntity;
import com.swiftdrop.dispatch.entity.ParcelCustodyRecord;
import com.swiftdrop.dispatch.entity.ReturnTask;
import com.swiftdrop.dispatch.entity.TransferManifest;
import com.swiftdrop.dispatch.entity.enums.CustodyEventType;
import com.swiftdrop.dispatch.exception.DispatchValidationException;
import com.swiftdrop.dispatch.exception.ResourceNotFoundException;
import com.swiftdrop.dispatch.repository.ParcelCustodyRecordRepository;
import com.swiftdrop.dispatch.repository.ReturnTaskRepository;
import com.swiftdrop.dispatch.repository.TransferManifestRepository;
import com.swiftdrop.dispatch.security.DispatchUserPrincipal;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@Transactional(readOnly = true)
public class CustodyTrackingService {

    private final ParcelCustodyRecordRepository custodyRepository;
    private final TransferManifestRepository manifestRepository;
    private final ReturnTaskRepository returnTaskRepository;
    private final DispatchSupportService support;

    public CustodyTrackingService(
            ParcelCustodyRecordRepository custodyRepository,
            TransferManifestRepository manifestRepository,
            ReturnTaskRepository returnTaskRepository,
            DispatchSupportService support) {
        this.custodyRepository = custodyRepository;
        this.manifestRepository = manifestRepository;
        this.returnTaskRepository = returnTaskRepository;
        this.support = support;
    }

    @Transactional
    public ParcelCustodyRecord recordCustody(
            String orderId,
            String trackingNumber,
            String parcelReference,
            Long manifestId,
            String manifestReference,
            Long returnTaskId,
            CustodyEventType eventType,
            Long branchId,
            String branchCode,
            String branchName,
            CourierProfileEntity courier,
            String employeeId,
            String employeeName,
            LocalDateTime handoverTimestamp,
            String discrepancyNotes,
            String notes) {
        ParcelCustodyRecord record = new ParcelCustodyRecord();
        record.setCustodyCode(support.generateUniqueCode("CST", custodyRepository::existsByCustodyCodeIgnoreCase));
        record.setOrderId(orderId);
        record.setTrackingNumber(trackingNumber);
        record.setParcelReference(support.firstNonBlank(parcelReference, trackingNumber, orderId));
        record.setManifestId(manifestId);
        record.setManifestReference(support.blankToNull(manifestReference));
        record.setReturnTaskId(returnTaskId);
        record.setEventType(eventType);
        record.setResponsibleBranchId(branchId);
        record.setResponsibleBranchCode(support.blankToNull(branchCode));
        record.setResponsibleBranchName(support.blankToNull(branchName));
        if (courier != null) {
            record.setResponsibleCourierId(courier.getId());
            record.setResponsibleCourierCode(courier.getCourierCode());
            record.setResponsibleCourierName(courier.getName());
        }
        record.setResponsibleEmployeeId(support.blankToNull(employeeId));
        record.setResponsibleEmployeeName(support.blankToNull(employeeName));
        record.setHandoverTimestamp(handoverTimestamp != null ? handoverTimestamp : LocalDateTime.now());
        record.setDiscrepancyNotes(support.blankToNull(discrepancyNotes));
        record.setNotes(support.blankToNull(notes));

        ParcelCustodyRecord saved = custodyRepository.save(record);

        Map<String, Object> details = new HashMap<>();
        details.put("custodyCode", saved.getCustodyCode());
        details.put("eventType", saved.getEventType().name());
        details.put("orderId", saved.getOrderId());
        details.put("trackingNumber", saved.getTrackingNumber());
        details.put("manifestId", saved.getManifestId());
        details.put("manifestReference", saved.getManifestReference());
        details.put("returnTaskId", saved.getReturnTaskId());
        details.put("branchId", saved.getResponsibleBranchId());
        details.put("courierCode", saved.getResponsibleCourierCode());
        support.publishEventSafely("dispatch.custody.recorded", "PARCEL_CUSTODY_RECORDED", details);

        return saved;
    }

    public List<CustodyRecordDto> getManifestCustodyDtos(Long manifestId) {
        return custodyRepository.findByManifestIdOrderByHandoverTimestampAsc(manifestId)
                .stream()
                .map(support::toCustodyRecordDto)
                .toList();
    }

    public List<CustodyRecordDto> getReturnTaskCustodyDtos(Long returnTaskId) {
        return custodyRepository.findByReturnTaskIdOrderByHandoverTimestampAsc(returnTaskId)
                .stream()
                .map(support::toCustodyRecordDto)
                .toList();
    }

    public List<CustodyRecordDto> queryCustodyRecords(
            String orderId,
            String trackingNumber,
            Long manifestId,
            Long returnTaskId,
            DispatchUserPrincipal principal) {
        support.requireOperationalStaff(principal);

        List<ParcelCustodyRecord> records;
        TransferManifest manifestContext = null;
        ReturnTask returnContext = null;

        if (manifestId != null) {
            manifestContext = manifestRepository.findById(manifestId)
                    .orElseThrow(() -> new ResourceNotFoundException("Transfer manifest", manifestId));
            records = custodyRepository.findByManifestIdOrderByHandoverTimestampAsc(manifestId);
        } else if (returnTaskId != null) {
            returnContext = returnTaskRepository.findById(returnTaskId)
                    .orElseThrow(() -> new ResourceNotFoundException("Return task", returnTaskId));
            records = custodyRepository.findByReturnTaskIdOrderByHandoverTimestampAsc(returnTaskId);
        } else if (trackingNumber != null && !trackingNumber.isBlank()) {
            records = custodyRepository.findByTrackingNumberIgnoreCaseOrderByHandoverTimestampAsc(trackingNumber.trim());
        } else if (orderId != null && !orderId.isBlank()) {
            records = custodyRepository.findByOrderIdOrderByHandoverTimestampAsc(orderId.trim());
        } else {
            throw new DispatchValidationException(
                    "CUSTODY_QUERY_FILTER_REQUIRED",
                    "Specify at least one filter: orderId, trackingNumber, manifestId, or returnTaskId"
            );
        }

        authorizeCustodyRead(principal, records, manifestContext, returnContext);
        return records.stream().map(support::toCustodyRecordDto).toList();
    }

    public List<CustodyRecordDto> getParcelCustodyTimeline(String parcelKey, DispatchUserPrincipal principal) {
        support.requireOperationalStaff(principal);
        if (parcelKey == null || parcelKey.isBlank()) {
            throw new DispatchValidationException("PARCEL_KEY_REQUIRED", "Order id or tracking number is required");
        }
        String key = parcelKey.trim();
        List<ParcelCustodyRecord> records = custodyRepository.findByTrackingNumberIgnoreCaseOrderByHandoverTimestampAsc(key);
        if (records.isEmpty()) {
            records = custodyRepository.findByOrderIdOrderByHandoverTimestampAsc(key);
        }
        authorizeCustodyRead(principal, records, null, null);
        return records.stream().map(support::toCustodyRecordDto).toList();
    }

    private void authorizeCustodyRead(
            DispatchUserPrincipal principal,
            List<ParcelCustodyRecord> records,
            TransferManifest manifestContext,
            ReturnTask returnContext) {
        if (principal.isAdmin()) {
            return;
        }
        if (principal.isDispatcher()) {
            if (principal.branchId() == null) {
                throw new AccessDeniedException("Branch-scoped staff must have an assigned branchId claim");
            }
            if (manifestContext != null) {
                boolean branchMatches = Objects.equals(principal.branchId(), manifestContext.getOriginBranchId())
                        || Objects.equals(principal.branchId(), manifestContext.getDestinationBranchId());
                if (!branchMatches) {
                    throw new AccessDeniedException("Dispatcher is not authorized to view custody for this manifest");
                }
                return;
            }
            if (returnContext != null) {
                boolean branchMatches = Objects.equals(principal.branchId(), returnContext.getOriginBranchId())
                        || Objects.equals(principal.branchId(), returnContext.getCurrentBranchId());
                if (!branchMatches) {
                    throw new AccessDeniedException("Dispatcher is not authorized to view custody for this return task");
                }
                return;
            }
            if (!records.isEmpty()) {
                boolean anyBranchMatch = records.stream()
                        .anyMatch(r -> Objects.equals(principal.branchId(), r.getResponsibleBranchId()));
                if (!anyBranchMatch) {
                    throw new AccessDeniedException("Dispatcher is not authorized to view custody records outside their branch");
                }
            }
            return;
        }

        // Courier role: may view custody records for manifests/returns/parcels assigned to them
        CourierProfileEntity courier = support.resolveCurrentCourier(principal);
        if (manifestContext != null) {
            if (manifestContext.getAssignedCourier() == null
                    || !Objects.equals(manifestContext.getAssignedCourier().getId(), courier.getId())) {
                throw new AccessDeniedException("Courier is not assigned to this transfer manifest");
            }
            return;
        }
        if (returnContext != null) {
            if (returnContext.getAssignedCourier() == null
                    || !Objects.equals(returnContext.getAssignedCourier().getId(), courier.getId())) {
                throw new AccessDeniedException("Courier is not assigned to this return task");
            }
            return;
        }
        boolean courierInvolved = records.stream()
                .anyMatch(r -> Objects.equals(courier.getId(), r.getResponsibleCourierId()));
        if (!records.isEmpty() && !courierInvolved) {
            throw new AccessDeniedException("Courier is not authorized to view custody history for unassigned parcels");
        }
    }
}

