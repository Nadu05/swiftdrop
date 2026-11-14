package com.swiftdrop.dispatch.repository;

import com.swiftdrop.dispatch.entity.CourierProfileEntity;
import com.swiftdrop.dispatch.entity.enums.CourierAvailabilityStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CourierProfileRepository extends JpaRepository<CourierProfileEntity, Long> {

    Optional<CourierProfileEntity> findByCourierCodeIgnoreCase(String courierCode);

    Optional<CourierProfileEntity> findByUserId(String userId);

    Optional<CourierProfileEntity> findByEmailIgnoreCase(String email);

    List<CourierProfileEntity> findByBranchIdOrderByNameAsc(Long branchId);

    List<CourierProfileEntity> findAllByOrderByNameAsc();

    List<CourierProfileEntity> findByBranchIdAndAvailabilityStatusOrderByNameAsc(
            Long branchId,
            CourierAvailabilityStatus status
    );

    boolean existsByCourierCodeIgnoreCase(String courierCode);
}
