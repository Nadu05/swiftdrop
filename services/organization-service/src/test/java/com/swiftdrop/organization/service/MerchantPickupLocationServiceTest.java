package com.swiftdrop.organization.service;

import com.swiftdrop.organization.dto.MerchantPickupLocationRequest;
import com.swiftdrop.organization.dto.MerchantPickupLocationResponse;
import com.swiftdrop.organization.entity.MerchantApplication;
import com.swiftdrop.organization.entity.enums.MerchantApplicationStatus;
import com.swiftdrop.organization.entity.MerchantPickupLocation;
import com.swiftdrop.organization.exception.ResourceNotFoundException;
import com.swiftdrop.organization.repository.MerchantApplicationRepository;
import com.swiftdrop.organization.repository.MerchantPickupLocationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MerchantPickupLocationServiceTest {

    @Mock
    private MerchantPickupLocationRepository locationRepository;

    @Mock
    private MerchantApplicationRepository applicationRepository;

    private MerchantPickupLocationService service;

    @BeforeEach
    void setUp() {
        service = new MerchantPickupLocationService(locationRepository, applicationRepository);
    }

    private MerchantApplication approvedApp(String code) {
        MerchantApplication app = new MerchantApplication();
        app.setId(1L);
        app.setApplicationCode(code);
        app.setStatus(MerchantApplicationStatus.APPROVED);
        app.setApplicantUserId("user-1");
        return app;
    }

    private MerchantPickupLocationRequest sampleRequest(String name) {
        MerchantPickupLocationRequest req = new MerchantPickupLocationRequest();
        req.setLocationName(name);
        req.setContactPerson("Nimal Perera");
        req.setContactPhone("+94771234567");
        req.setAddressLine1("45 Galle Road");
        req.setCity("Colombo");
        req.setDistrict("Colombo");
        req.setPostalCode("00300");
        return req;
    }

    @Test
    void createLocation_firstLocationAutomaticallyBecomesDefault() {
        when(applicationRepository.findByApplicationCodeIgnoreCase("APP-2026-0820"))
                .thenReturn(Optional.of(approvedApp("APP-2026-0820")));
        when(locationRepository.countByMerchantOrganizationId("APP-2026-0820")).thenReturn(0L);
        when(locationRepository.save(any(MerchantPickupLocation.class))).thenAnswer(inv -> {
            MerchantPickupLocation loc = inv.getArgument(0);
            loc.setId(10L);
            return loc;
        });

        MerchantPickupLocationResponse res = service.createLocation(
                sampleRequest("Main Warehouse"), "APP-2026-0820", "user-1");

        assertEquals(10L, res.getId());
        assertEquals("Main Warehouse", res.getLocationName());
        assertTrue(res.isDefault());
        assertTrue(res.isActive());
        verify(locationRepository).clearDefaultForMerchant("APP-2026-0820");
    }

    @Test
    void createLocation_rejectsPendingMerchant() {
        MerchantApplication pending = approvedApp("APP-2026-0821");
        pending.setStatus(MerchantApplicationStatus.PENDING);
        when(applicationRepository.findByApplicationCodeIgnoreCase("APP-2026-0821"))
                .thenReturn(Optional.of(pending));

        assertThrows(AccessDeniedException.class, () ->
                service.createLocation(sampleRequest("Store"), "APP-2026-0821", "user-1"));
        verify(locationRepository, never()).save(any());
    }

    @Test
    void setDefaultLocation_clearsPreviousDefaultAndActivatesTarget() {
        when(applicationRepository.findByApplicationCodeIgnoreCase("APP-2026-0820"))
                .thenReturn(Optional.of(approvedApp("APP-2026-0820")));

        MerchantPickupLocation target = new MerchantPickupLocation();
        target.setId(22L);
        target.setMerchantOrganizationId("APP-2026-0820");
        target.setLocationName("Kandy Hub");
        target.setDefault(false);
        target.setActive(false);

        when(locationRepository.findByIdAndMerchantOrganizationId(22L, "APP-2026-0820"))
                .thenReturn(Optional.of(target));
        when(locationRepository.save(any(MerchantPickupLocation.class))).thenAnswer(inv -> inv.getArgument(0));

        MerchantPickupLocationResponse res = service.setDefaultLocation(22L, "APP-2026-0820", "user-1");

        assertTrue(res.isDefault());
        assertTrue(res.isActive());
        verify(locationRepository).clearDefaultForMerchant("APP-2026-0820");
    }

    @Test
    void deleteLocation_notOwnedByMerchantThrowsNotFound() {
        when(applicationRepository.findByApplicationCodeIgnoreCase("APP-2026-0820"))
                .thenReturn(Optional.of(approvedApp("APP-2026-0820")));
        when(locationRepository.findByIdAndMerchantOrganizationId(99L, "APP-2026-0820"))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                service.deleteLocation(99L, "APP-2026-0820", "user-1"));
    }

    @Test
    void deleteDefaultLocation_promotesNextActiveLocation() {
        when(applicationRepository.findByApplicationCodeIgnoreCase("APP-2026-0820"))
                .thenReturn(Optional.of(approvedApp("APP-2026-0820")));

        MerchantPickupLocation existingDefault = new MerchantPickupLocation();
        existingDefault.setId(1L);
        existingDefault.setMerchantOrganizationId("APP-2026-0820");
        existingDefault.setDefault(true);
        existingDefault.setActive(true);

        MerchantPickupLocation secondary = new MerchantPickupLocation();
        secondary.setId(2L);
        secondary.setMerchantOrganizationId("APP-2026-0820");
        secondary.setDefault(false);
        secondary.setActive(true);

        when(locationRepository.findByIdAndMerchantOrganizationId(1L, "APP-2026-0820"))
                .thenReturn(Optional.of(existingDefault));
        when(locationRepository.findByMerchantOrganizationIdOrderByIsDefaultDescCreatedAtDesc("APP-2026-0820"))
                .thenReturn(List.of(secondary));

        service.deleteLocation(1L, "APP-2026-0820", "user-1");

        verify(locationRepository).delete(existingDefault);
        assertTrue(secondary.isDefault());
        verify(locationRepository).save(secondary);
    }
}
