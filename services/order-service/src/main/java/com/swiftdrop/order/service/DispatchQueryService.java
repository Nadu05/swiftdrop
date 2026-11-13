package com.swiftdrop.order.service;

import com.swiftdrop.order.dto.ReadyForDispatchResponse;
import com.swiftdrop.order.entity.DeliveryOrder;
import com.swiftdrop.order.entity.enums.OrderStatus;
import com.swiftdrop.order.location.City;
import com.swiftdrop.order.location.CityDirectory;
import com.swiftdrop.order.repository.DeliveryOrderRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Read-only view for the Dispatch service: the orders that are ready for a courier. An order is ready for
 * dispatch while it is {@link OrderStatus#CREATED}, that is, placed and not yet picked up. Dispatch decides which
 * of them already have a courier; the Order service does not know about assignments.
 */
@Service
public class DispatchQueryService {

    public static final int DEFAULT_LIMIT = 50;
    public static final int MAX_LIMIT = 200;

    private final DeliveryOrderRepository orders;
    private final CityDirectory cities;

    public DispatchQueryService(DeliveryOrderRepository orders, CityDirectory cities) {
        this.orders = orders;
        this.cities = cities;
    }

    /**
     * @param branchId only orders of this branch; null for all branches. Orders whose branch is not resolved yet
     *                 (null) are returned only when no branch is asked for
     * @param limit    at most this many, oldest first; null means {@value #DEFAULT_LIMIT}
     */
    @Transactional(readOnly = true)
    public List<ReadyForDispatchResponse> readyForDispatch(Long branchId, Integer limit) {
        Pageable page = PageRequest.of(0, limit == null ? DEFAULT_LIMIT : Math.min(limit, MAX_LIMIT));
        List<DeliveryOrder> found = branchId == null
                ? orders.findByStatusOrderByCreatedAtAscIdAsc(OrderStatus.CREATED, page)
                : orders.findByStatusAndBranchIdOrderByCreatedAtAscIdAsc(OrderStatus.CREATED, branchId, page);
        return found.stream()
                .map(order -> ReadyForDispatchResponse.from(order, townName(order.getDropoffCity()), townName(order.getPickupCity())))
                .toList();
    }

    private String townName(String code) {
        return code == null ? null : cities.find(code).map(City::name).orElse(null);
    }
}
