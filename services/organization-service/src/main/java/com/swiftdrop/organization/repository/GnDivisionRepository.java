package com.swiftdrop.organization.repository;

import com.swiftdrop.organization.entity.GnDivision;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GnDivisionRepository extends JpaRepository<GnDivision, Long> {
    Optional<GnDivision> findByCode(String code);
    List<GnDivision> findByDsDivisionIdOrderByNameAsc(Long dsDivisionId);
    List<GnDivision> findAllByOrderByNameAsc();
}
