package com.swiftdrop.dispatch.repository;

import com.swiftdrop.dispatch.entity.Courier;
import com.swiftdrop.dispatch.entity.enums.CourierStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    /**
     * Acquire a pessimistic write lock (SELECT ... FOR UPDATE) on the Courier row
     * to prevent concurrent assignment requests from exceeding the courier's maximum capacity.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Courier c WHERE c.id = :id")
    Optional<Courier> findByIdForUpdate(@Param("id") Long id);
}
