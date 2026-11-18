package com.swiftdrop.organization.repository;

import com.swiftdrop.organization.entity.District;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DistrictRepository extends JpaRepository<District, Long> {
    Optional<District> findByCode(String code);
    List<District> findByProvinceIdOrderByNameAsc(Long provinceId);
    List<District> findAllByOrderByNameAsc();
}
