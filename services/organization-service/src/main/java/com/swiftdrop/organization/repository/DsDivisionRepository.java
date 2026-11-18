package com.swiftdrop.organization.repository;

import com.swiftdrop.organization.entity.DsDivision;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DsDivisionRepository extends JpaRepository<DsDivision, Long> {
    Optional<DsDivision> findByCode(String code);
    List<DsDivision> findByDistrictIdOrderByNameAsc(Long districtId);
    List<DsDivision> findAllByOrderByNameAsc();
}
