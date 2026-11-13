package com.swiftdrop.dispatch.service;

import com.swiftdrop.dispatch.client.OrderServiceClient;
import com.swiftdrop.dispatch.dto.OrderDetailsDto;
import com.swiftdrop.dispatch.dto.ParcelInfoDto;
import com.swiftdrop.dispatch.dto.UnassignedDeliveryResponse;
import com.swiftdrop.dispatch.entity.enums.AssignmentStatus;
import com.swiftdrop.dispatch.repository.AssignmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service that coordinates retrieval of dispatch-eligible orders from Order Service
 * and filters out any orders that already have an active courier assignment.
 */
@Service
@Transactional
public class UnassignedDeliveryService {

    public static final Set<AssignmentStatus> ACTIVE_ASSIGNMENT_STATUSES = Set.of(
            AssignmentStatus.ASSIGNED,
            AssignmentStatus.ACCEPTED,
            AssignmentStatus.IN_TRANSIT
    );

    private final OrderServiceClient orderServiceClient;
    private final AssignmentRepository assignmentRepository;

    public UnassignedDeliveryService(OrderServiceClient orderServiceClient,
                                     AssignmentRepository assignmentRepository) {
        this.orderServiceClient = orderServiceClient;
        this.assignmentRepository = assignmentRepository;
    }

    /**
     * Retrieve deliveries eligible for dispatch that do not have an active courier assignment.
     *
     * @param branchId optional branch filter
     * @param limit maximum orders to retrieve (default 50)
     * @return list of unassigned deliveries
     * @throws IllegalArgumentException if limit or branchId is invalid (<= 0)
     */
    @Transactional(readOnly = true)
    public List<UnassignedDeliveryResponse> getUnassignedDeliveries(Long branchId, Integer limit) {
        if (limit != null && limit <= 0) {
            throw new IllegalArgumentException("Limit must be greater than zero");
        }
        if (branchId != null && branchId <= 0) {
            throw new IllegalArgumentException("Branch ID must be a positive number");
        }

        int effectiveLimit = limit != null ? limit : 50;

        // Step 1: Retrieve candidate orders from Order Service
        List<OrderDetailsDto> candidateOrders = orderServiceClient.getReadyForDispatchOrders(branchId, effectiveLimit);
        if (candidateOrders == null || candidateOrders.isEmpty()) {
            return Collections.emptyList();
        }

        // Step 2 & 8: Deduplicate candidate orders by Order ID to preserve uniqueness
        Map<Long, OrderDetailsDto> uniqueCandidateMap = new LinkedHashMap<>();
        for (OrderDetailsDto order : candidateOrders) {
            if (order != null && order.getId() != null) {
                uniqueCandidateMap.putIfAbsent(order.getId(), order);
            }
        }

        if (uniqueCandidateMap.isEmpty()) {
            return Collections.emptyList();
        }

        Set<Long> candidateOrderIds = uniqueCandidateMap.keySet();

        // Step 3: Query local Dispatch database for order IDs with active assignments
        Set<Long> activeOrderIds = assignmentRepository.findActiveOrderIdsByOrderIdIn(
                candidateOrderIds, ACTIVE_ASSIGNMENT_STATUSES);

        // Step 4 & 5: Filter out orders with active assignments and map to response DTO
        return uniqueCandidateMap.values().stream()
                .filter(order -> !activeOrderIds.contains(order.getId()))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private UnassignedDeliveryResponse toResponse(OrderDetailsDto order) {
        ParcelInfoDto parcelInfo = new ParcelInfoDto(
                order.getWeightKg(),
                order.getPackageType(),
                order.getDimensions(),
                order.getHandlingNotes()
        );

        return new UnassignedDeliveryResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getTrackingNumber(),
                order.getRecipientName(),
                order.getRecipientPhone(),
                order.getDeliveryAddress(),
                order.getCity(),
                order.getMerchantName(),
                order.getMerchantContact(),
                order.getCreatedAt(),
                order.getPriority(),
                parcelInfo
        );
    }
}

