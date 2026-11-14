package com.swiftdrop.dispatch.controller;

import com.swiftdrop.dispatch.dto.*;
import com.swiftdrop.dispatch.security.DispatchUserPrincipal;
import com.swiftdrop.dispatch.service.CustodyTrackingService;
import com.swiftdrop.dispatch.service.OperationalExceptionService;
import com.swiftdrop.dispatch.service.ReturnTaskService;
import com.swiftdrop.dispatch.service.TransferManifestService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/v1/dispatch", ""})
public class TransferAndExceptionController {

    private final TransferManifestService transferManifestService;
    private final CustodyTrackingService custodyTrackingService;
    private final OperationalExceptionService operationalExceptionService;
    private final ReturnTaskService returnTaskService;

    public TransferAndExceptionController(
            TransferManifestService transferManifestService,
            CustodyTrackingService custodyTrackingService,
            OperationalExceptionService operationalExceptionService,
            ReturnTaskService returnTaskService) {
        this.transferManifestService = transferManifestService;
        this.custodyTrackingService = custodyTrackingService;
        this.operationalExceptionService = operationalExceptionService;
        this.returnTaskService = returnTaskService;
    }

    @GetMapping("/transfers/ready-parcels")
    public ResponseEntity<List<ReadyForTransferParcelDto>> listReadyForTransferParcels(
            @RequestParam(required = false) Long originBranchId,
            @RequestParam(required = false) Long destinationBranchId,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(
                transferManifestService.listReadyForTransferParcels(originBranchId, destinationBranchId, principal)
        );
    }

    @PostMapping("/transfers/manifests")
    public ResponseEntity<TransferManifestDto> createManifest(
            @Valid @RequestBody CreateTransferManifestRequest request,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(transferManifestService.createManifest(request, principal));
    }

    @GetMapping("/transfers/manifests")
    public ResponseEntity<List<TransferManifestDto>> listManifests(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String status,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(transferManifestService.listManifests(branchId, status, principal));
    }

    @GetMapping("/transfers/manifests/{manifestIdOrCode}")
    public ResponseEntity<TransferManifestDto> getManifest(
            @PathVariable String manifestIdOrCode,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(transferManifestService.getManifest(manifestIdOrCode, principal));
    }

    @PostMapping("/transfers/manifests/{manifestIdOrCode}/parcels")
    public ResponseEntity<TransferManifestDto> addManifestParcels(
            @PathVariable String manifestIdOrCode,
            @Valid @RequestBody AddManifestParcelsRequest request,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(transferManifestService.addParcels(manifestIdOrCode, request, principal));
    }

    @DeleteMapping("/transfers/manifests/{manifestIdOrCode}/parcels/{parcelKey}")
    public ResponseEntity<TransferManifestDto> removeManifestParcel(
            @PathVariable String manifestIdOrCode,
            @PathVariable String parcelKey,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(transferManifestService.removeParcel(manifestIdOrCode, parcelKey, principal));
    }

    @PostMapping("/transfers/manifests/{manifestIdOrCode}/assign-courier")
    public ResponseEntity<TransferManifestDto> assignTransferCourier(
            @PathVariable String manifestIdOrCode,
            @Valid @RequestBody AssignTransferCourierRequest request,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(transferManifestService.assignCourier(manifestIdOrCode, request, principal));
    }

    @PostMapping("/transfers/manifests/{manifestIdOrCode}/depart")
    public ResponseEntity<TransferManifestDto> departManifest(
            @PathVariable String manifestIdOrCode,
            @RequestBody(required = false) DepartManifestRequest request,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(transferManifestService.departManifest(manifestIdOrCode, request, principal));
    }

    @PostMapping("/transfers/manifests/{manifestIdOrCode}/receive")
    public ResponseEntity<TransferManifestDto> receiveManifest(
            @PathVariable String manifestIdOrCode,
            @RequestBody(required = false) ReceiveManifestRequest request,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(transferManifestService.receiveManifest(manifestIdOrCode, request, principal));
    }

    @PostMapping("/transfers/manifests/{manifestIdOrCode}/complete")
    public ResponseEntity<TransferManifestDto> completeManifest(
            @PathVariable String manifestIdOrCode,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        String notes = body != null ? body.get("notes") : null;
        return ResponseEntity.ok(transferManifestService.completeManifest(manifestIdOrCode, notes, principal));
    }

    @PostMapping("/transfers/manifests/{manifestIdOrCode}/cancel")
    public ResponseEntity<TransferManifestDto> cancelManifest(
            @PathVariable String manifestIdOrCode,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(transferManifestService.cancelManifest(manifestIdOrCode, reason, principal));
    }

    @GetMapping("/custody")
    public ResponseEntity<List<CustodyRecordDto>> queryCustodyRecords(
            @RequestParam(required = false) String orderId,
            @RequestParam(required = false) String trackingNumber,
            @RequestParam(required = false) Long manifestId,
            @RequestParam(required = false) Long returnTaskId,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(custodyTrackingService.queryCustodyRecords(
                orderId, trackingNumber, manifestId, returnTaskId, principal
        ));
    }

    @GetMapping("/custody/parcel/{parcelKey}")
    public ResponseEntity<List<CustodyRecordDto>> getParcelCustodyTimeline(
            @PathVariable String parcelKey,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(custodyTrackingService.getParcelCustodyTimeline(parcelKey, principal));
    }

    @PostMapping("/exceptions")
    public ResponseEntity<DeliveryExceptionDto> reportException(
            @Valid @RequestBody ReportExceptionRequest request,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(operationalExceptionService.reportException(request, principal));
    }

    @PatchMapping("/exceptions/{exceptionId}/status")
    public ResponseEntity<DeliveryExceptionDto> updateExceptionStatus(
            @PathVariable Long exceptionId,
            @Valid @RequestBody UpdateExceptionStatusRequest request,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(operationalExceptionService.updateExceptionStatus(exceptionId, request, principal));
    }

    @PostMapping("/returns")
    public ResponseEntity<ReturnTaskDto> createReturnTask(
            @Valid @RequestBody CreateReturnTaskRequest request,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(returnTaskService.createReturnTask(request, principal));
    }

    @GetMapping("/returns")
    public ResponseEntity<List<ReturnTaskDto>> listReturnTasks(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String status,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(returnTaskService.listReturnTasks(branchId, status, principal));
    }

    @GetMapping("/returns/{returnIdOrCode}")
    public ResponseEntity<ReturnTaskDto> getReturnTask(
            @PathVariable String returnIdOrCode,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(returnTaskService.getReturnTask(returnIdOrCode, principal));
    }

    @PostMapping("/returns/{returnIdOrCode}/assign-courier")
    public ResponseEntity<ReturnTaskDto> assignReturnCourier(
            @PathVariable String returnIdOrCode,
            @Valid @RequestBody AssignTransferCourierRequest request,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(returnTaskService.assignCourier(returnIdOrCode, request, principal));
    }

    @PostMapping("/returns/{returnIdOrCode}/movement")
    public ResponseEntity<ReturnTaskDto> recordReturnMovement(
            @PathVariable String returnIdOrCode,
            @Valid @RequestBody RecordReturnMovementRequest request,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(returnTaskService.recordMovement(returnIdOrCode, request, principal));
    }

    @PostMapping("/returns/{returnIdOrCode}/confirm")
    public ResponseEntity<ReturnTaskDto> confirmReturnToSender(
            @PathVariable String returnIdOrCode,
            @Valid @RequestBody ConfirmReturnToSenderRequest request,
            @AuthenticationPrincipal DispatchUserPrincipal principal) {
        return ResponseEntity.ok(returnTaskService.confirmReturnToSender(returnIdOrCode, request, principal));
    }
}

