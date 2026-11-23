package com.swiftdrop.organization.service;

import com.swiftdrop.organization.dto.MerchantPickupLocationRequest;
import com.swiftdrop.organization.dto.MerchantPickupLocationResponse;
import com.swiftdrop.organization.entity.MerchantApplication;
import com.swiftdrop.organization.entity.enums.MerchantApplicationStatus;
import com.swiftdrop.organization.entity.MerchantPickupLocation;
import com.swiftdrop.organization.exception.ResourceNotFoundException;
import com.swiftdrop.organization.repository.MerchantApplicationRepository;
import com.swiftdrop.organization.repository.MerchantPickupLocationRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class MerchantPickupLocationService {

    private final MerchantPickupLocationRepository locationRepository;
    private final MerchantApplicationRepository applicationRepository;

    public MerchantPickupLocationService(
            MerchantPickupLocationRepository locationRepository,
            MerchantApplicationRepository applicationRepository) {
        this.locationRepository = locationRepository;
        this.applicationRepository = applicationRepository;
    }

    @Transactional(readOnly = true)
    public List<MerchantPickupLocationResponse> listForMerchant(String organizationId, String userId) {
        String merchantOrgId = resolveMerchantOrganizationId(organizationId, userId, false);
        if (merchantOrgId == null) {
            return List.of();
        }
        return locationRepository.findByMerchantOrganizationIdOrderByIsDefaultDescCreatedAtDesc(merchantOrgId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public MerchantPickupLocationResponse createLocation(
            MerchantPickupLocationRequest request,
            String organizationId,
            String userId) {
        String merchantOrgId = resolveMerchantOrganizationId(organizationId, userId, true);

        long existingCount = locationRepository.countByMerchantOrganizationId(merchantOrgId);
        boolean shouldBeDefault = Boolean.TRUE.equals(request.getIsDefault()) || existingCount == 0;
        if (shouldBeDefault) {
            locationRepository.clearDefaultForMerchant(merchantOrgId);
        }

        MerchantPickupLocation entity = new MerchantPickupLocation();
        entity.setMerchantOrganizationId(merchantOrgId);
        applyRequestFields(entity, request);
        entity.setDefault(shouldBeDefault);
        entity.setActive(request.getIsActive() == null || request.getIsActive());

        return toResponse(locationRepository.save(entity));
    }

    public MerchantPickupLocationResponse updateLocation(
            Long id,
            MerchantPickupLocationRequest request,
            String organizationId,
            String userId) {
        String merchantOrgId = resolveMerchantOrganizationId(organizationId, userId, true);
        MerchantPickupLocation entity = locationRepository.findByIdAndMerchantOrganizationId(id, merchantOrgId)
                .orElseThrow(() -> new ResourceNotFoundException("Pickup location not found: " + id));

        applyRequestFields(entity, request);
        if (Boolean.TRUE.equals(request.getIsDefault()) && !entity.isDefault()) {
            locationRepository.clearDefaultForMerchant(merchantOrgId);
            entity.setDefault(true);
        } else if (Boolean.FALSE.equals(request.getIsDefault())) {
            entity.setDefault(false);
        }
        if (request.getIsActive() != null) {
            entity.setActive(request.getIsActive());
        }

        return toResponse(locationRepository.save(entity));
    }

    public MerchantPickupLocationResponse setDefaultLocation(
            Long id,
            String organizationId,
            String userId) {
        String merchantOrgId = resolveMerchantOrganizationId(organizationId, userId, true);
        MerchantPickupLocation entity = locationRepository.findByIdAndMerchantOrganizationId(id, merchantOrgId)
                .orElseThrow(() -> new ResourceNotFoundException("Pickup location not found: " + id));

        locationRepository.clearDefaultForMerchant(merchantOrgId);
        entity.setDefault(true);
        entity.setActive(true);
        return toResponse(locationRepository.save(entity));
    }

    public MerchantPickupLocationResponse toggleStatus(
            Long id,
            boolean active,
            String organizationId,
            String userId) {
        String merchantOrgId = resolveMerchantOrganizationId(organizationId, userId, true);
        MerchantPickupLocation entity = locationRepository.findByIdAndMerchantOrganizationId(id, merchantOrgId)
                .orElseThrow(() -> new ResourceNotFoundException("Pickup location not found: " + id));

        entity.setActive(active);
        if (!active && entity.isDefault()) {
            entity.setDefault(false);
        }
        return toResponse(locationRepository.save(entity));
    }

    public void deleteLocation(Long id, String organizationId, String userId) {
        String merchantOrgId = resolveMerchantOrganizationId(organizationId, userId, true);
        MerchantPickupLocation entity = locationRepository.findByIdAndMerchantOrganizationId(id, merchantOrgId)
                .orElseThrow(() -> new ResourceNotFoundException("Pickup location not found: " + id));

        boolean wasDefault = entity.isDefault();
        locationRepository.delete(entity);

        if (wasDefault) {
            List<MerchantPickupLocation> remaining = locationRepository
                    .findByMerchantOrganizationIdOrderByIsDefaultDescCreatedAtDesc(merchantOrgId);
            remaining.stream()
                    .filter(MerchantPickupLocation::isActive)
                    .findFirst()
                    .ifPresent(next -> {
                        next.setDefault(true);
                        locationRepository.save(next);
                    });
        }
    }

    private String resolveMerchantOrganizationId(String organizationId, String userId, boolean requireApproved) {
        MerchantApplication app = null;
        if (organizationId != null && !organizationId.isBlank()) {
            app = applicationRepository.findByApplicationCodeIgnoreCase(organizationId.trim()).orElse(null);
        }
        if (app == null && userId != null && !userId.isBlank()) {
            List<MerchantApplication> apps = applicationRepository.findByApplicantUserIdOrderBySubmittedAtDesc(userId);
            if (!apps.isEmpty()) {
                app = apps.stream()
                        .filter(a -> a.getStatus() == MerchantApplicationStatus.APPROVED)
                        .findFirst()
                        .orElse(apps.get(0));
            }
        }

        if (app == null) {
            if (organizationId != null && !organizationId.isBlank() && !requireApproved) {
                return organizationId.trim();
            }
            if (requireApproved) {
                throw new AccessDeniedException("Only approved merchants can manage pickup locations");
            }
            return null;
        }

        if (requireApproved && app.getStatus() != MerchantApplicationStatus.APPROVED) {
            throw new AccessDeniedException(
                    "Merchant account must be APPROVED to manage pickup locations (current status: " + app.getStatus() + ")");
        }
        return app.getApplicationCode();
    }

    private void applyRequestFields(MerchantPickupLocation entity, MerchantPickupLocationRequest request) {
        entity.setLocationName(request.getLocationName().trim());
        entity.setContactPerson(request.getContactPerson().trim());
        entity.setContactPhone(request.getContactPhone().trim());
        entity.setAddressLine1(request.getAddressLine1().trim());
        entity.setAddressLine2(request.getAddressLine2() != null && !request.getAddressLine2().isBlank()
                ? request.getAddressLine2().trim()
                : null);
        entity.setCity(request.getCity().trim());
        entity.setDistrict(request.getDistrict() != null && !request.getDistrict().isBlank()
                ? request.getDistrict().trim()
                : null);
        entity.setPostalCode(request.getPostalCode().trim());
        entity.setPickupInstructions(request.getPickupInstructions() != null && !request.getPickupInstructions().isBlank()
                ? request.getPickupInstructions().trim()
                : null);
    }

    private MerchantPickupLocationResponse toResponse(MerchantPickupLocation entity) {
        MerchantPickupLocationResponse dto = new MerchantPickupLocationResponse();
        dto.setId(entity.getId());
        dto.setMerchantOrganizationId(entity.getMerchantOrganizationId());
        dto.setLocationName(entity.getLocationName());
        dto.setContactPerson(entity.getContactPerson());
        dto.setContactPhone(entity.getContactPhone());
        dto.setAddressLine1(entity.getAddressLine1());
        dto.setAddressLine2(entity.getAddressLine2());
        dto.setCity(entity.getCity());
        dto.setDistrict(entity.getDistrict());
        dto.setPostalCode(entity.getPostalCode());
        dto.setPickupInstructions(entity.getPickupInstructions());
        dto.setDefault(entity.isDefault());
        dto.setActive(entity.isActive());
        dto.setCreatedAt(entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : null);
        dto.setUpdatedAt(entity.getUpdatedAt() != null ? entity.getUpdatedAt().toString() : null);
        return dto;
    }
}
