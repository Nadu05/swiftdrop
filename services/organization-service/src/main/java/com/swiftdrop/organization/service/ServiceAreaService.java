package com.swiftdrop.organization.service;

import com.swiftdrop.organization.dto.ServiceAreaCreateRequest;
import com.swiftdrop.organization.dto.ServiceAreaResponse;
import com.swiftdrop.organization.dto.ServiceAreaUpdateRequest;
import com.swiftdrop.organization.entity.Branch;
import com.swiftdrop.organization.entity.ServiceArea;
import com.swiftdrop.organization.entity.enums.ServiceAreaStatus;
import com.swiftdrop.organization.exception.ResourceNotFoundException;
import com.swiftdrop.organization.repository.BranchRepository;
import com.swiftdrop.organization.repository.ServiceAreaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Service managing branch service areas.
 * Provides operations to create, retrieve, update, and manage the lifecycle of coverage areas.
 */
@Service
@Transactional
public class ServiceAreaService {

    private final ServiceAreaRepository serviceAreaRepository;
    private final BranchRepository branchRepository;

    public ServiceAreaService(ServiceAreaRepository serviceAreaRepository,
                              BranchRepository branchRepository) {
        this.serviceAreaRepository = serviceAreaRepository;
        this.branchRepository = branchRepository;
    }

    /**
     * Create a new service area assigned to an existing branch.
     *
     * @param request creation payload
     * @return created service area response
     * @throws ResourceNotFoundException if the referenced branch does not exist
     */
    public ServiceAreaResponse create(ServiceAreaCreateRequest request) {
        Branch branch = branchRepository.findById(request.getBranchId())
                .orElseThrow(() -> new ResourceNotFoundException("Branch", request.getBranchId()));

        ServiceArea serviceArea = new ServiceArea();
        serviceArea.setBranch(branch);
        serviceArea.setAreaName(request.getAreaName());
        serviceArea.setCenterLatitude(request.getCenterLatitude());
        serviceArea.setCenterLongitude(request.getCenterLongitude());
        serviceArea.setMaxRadiusKm(request.getMaxRadiusKm());
        serviceArea.setStatus(ServiceAreaStatus.ACTIVE);

        return toResponse(serviceAreaRepository.save(serviceArea));
    }

    /**
     * Retrieve all service areas, optionally filtered by status.
     *
     * @param status optional status filter
     * @return list of service area responses ordered by area name
     */
    @Transactional(readOnly = true)
    public List<ServiceAreaResponse> findAll(ServiceAreaStatus status) {
        List<ServiceArea> areas = (status != null)
                ? serviceAreaRepository.findByStatusOrderByAreaNameAsc(status)
                : serviceAreaRepository.findAllByOrderByAreaNameAsc();
        return areas.stream().map(this::toResponse).toList();
    }

    /**
     * Retrieve all service areas belonging to a specific branch.
     *
     * @param branchId ID of the parent branch
     * @param status optional status filter
     * @return list of service areas
     * @throws ResourceNotFoundException if the branch does not exist
     */
    @Transactional(readOnly = true)
    public List<ServiceAreaResponse> findByBranchId(Long branchId, ServiceAreaStatus status) {
        if (!branchRepository.existsById(branchId)) {
            throw new ResourceNotFoundException("Branch", branchId);
        }
        List<ServiceArea> areas = (status != null)
                ? serviceAreaRepository.findByBranchIdAndStatusOrderByAreaNameAsc(branchId, status)
                : serviceAreaRepository.findByBranchIdOrderByAreaNameAsc(branchId);
        return areas.stream().map(this::toResponse).toList();
    }

    /**
     * Retrieve a service area by its ID.
     *
     * @param id service area ID
     * @return service area response
     * @throws ResourceNotFoundException if not found
     */
    @Transactional(readOnly = true)
    public ServiceAreaResponse findById(Long id) {
        ServiceArea serviceArea = serviceAreaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ServiceArea", id));
        return toResponse(serviceArea);
    }

    /**
     * Partially update an existing service area. Only non-null fields will be updated.
     *
     * @param id service area ID
     * @param request partial update data
     * @return updated service area response
     * @throws ResourceNotFoundException if not found
     * @throws IllegalArgumentException if an invalid status is provided or radius is non-positive
     */
    public ServiceAreaResponse update(Long id, ServiceAreaUpdateRequest request) {
        ServiceArea serviceArea = serviceAreaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ServiceArea", id));

        if (request.getAreaName() != null && !request.getAreaName().isBlank()) {
            serviceArea.setAreaName(request.getAreaName());
        }

        if (request.getCenterLatitude() != null) {
            serviceArea.setCenterLatitude(request.getCenterLatitude());
        }

        if (request.getCenterLongitude() != null) {
            serviceArea.setCenterLongitude(request.getCenterLongitude());
        }

        if (request.getMaxRadiusKm() != null) {
            if (request.getMaxRadiusKm().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Maximum radius must be greater than zero");
            }
            serviceArea.setMaxRadiusKm(request.getMaxRadiusKm());
        }

        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            try {
                ServiceAreaStatus newStatus = ServiceAreaStatus.valueOf(request.getStatus().toUpperCase());
                serviceArea.setStatus(newStatus);
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException(
                        "Invalid service area status: '" + request.getStatus() + "'. Allowed values: ACTIVE, INACTIVE");
            }
        }

        return toResponse(serviceAreaRepository.save(serviceArea));
    }

    /**
     * Maps ServiceArea JPA entity to ServiceAreaResponse DTO.
     */
    public ServiceAreaResponse toResponse(ServiceArea entity) {
        return new ServiceAreaResponse(
                entity.getId(),
                entity.getBranch().getId(),
                entity.getBranch().getCode(),
                entity.getBranch().getName(),
                entity.getAreaName(),
                entity.getCenterLatitude(),
                entity.getCenterLongitude(),
                entity.getMaxRadiusKm(),
                entity.getStatus().name(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}

