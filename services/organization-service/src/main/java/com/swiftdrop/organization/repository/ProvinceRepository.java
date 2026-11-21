package com.swiftdrop.organization.repository;

import com.swiftdrop.organization.entity.Province;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProvinceRepository extends JpaRepository<Province, Long> {
    Optional<Province> findByCode(String code);
    List<Province> findAllByOrderByNameAsc();
}
