package com.swiftdrop.organization.repository;

import com.swiftdrop.organization.entity.PostalArea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PostalAreaRepository extends JpaRepository<PostalArea, Long> {
    Optional<PostalArea> findByPostalCode(String postalCode);

    @Query("""
            SELECT p FROM PostalArea p
            JOIN FETCH p.province prov
            JOIN FETCH p.district dist
            LEFT JOIN FETCH p.dsDivision ds
            WHERE p.isActive = true
              AND (:provinceId IS NULL OR prov.id = :provinceId)
              AND (:districtId IS NULL OR dist.id = :districtId)
              AND (:dsDivisionId IS NULL OR ds.id = :dsDivisionId)
              AND (:postalCode IS NULL OR p.postalCode = :postalCode)
              AND (:search IS NULL OR LOWER(p.postalCode) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(p.areaName) LIKE LOWER(CONCAT('%', :search, '%')))
            ORDER BY p.postalCode ASC
            """)
    List<PostalArea> searchActivePostalAreas(
            @Param("provinceId") Long provinceId,
            @Param("districtId") Long districtId,
            @Param("dsDivisionId") Long dsDivisionId,
            @Param("postalCode") String postalCode,
            @Param("search") String search
    );
}
