package com.swiftdrop.dispatch.repository;

import com.swiftdrop.dispatch.entity.Courier;
import com.swiftdrop.dispatch.entity.enums.CourierStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourierRepository extends JpaRepository<Courier, Long> {

    List<Courier> findByStatus(CourierStatus status);

    List<Courier> findByBranchId(Long branchId);

    List<Courier> findByStatusAndBranchId(CourierStatus status, Long branchId);

    Optional<Courier> findByUserId(Long userId);

    Optional<Courier> findByCourierCode(String courierCode);

    boolean existsByCourierCode(String courierCode);

    boolean existsByUserId(Long userId);
}

