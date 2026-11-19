package com.swiftdrop.organization.repository;

import com.swiftdrop.organization.entity.PostalArea;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

public interface PostalAreaRepository extends JpaRepository<PostalArea, Long>, JpaSpecificationExecutor<PostalArea> {
    Optional<PostalArea> findByPostalCode(String postalCode);

    boolean existsByImportVersion(String importVersion);

    default List<PostalArea> searchActivePostalAreas(
            Long provinceId,
            Long districtId,
            Long dsDivisionId,
            String postalCode,
            String search
    ) {
        Specification<PostalArea> spec = (root, query, cb) -> {
            if (query != null && !Long.class.equals(query.getResultType()) && !long.class.equals(query.getResultType())) {
                root.fetch("province", JoinType.INNER);
                root.fetch("district", JoinType.INNER);
                root.fetch("dsDivision", JoinType.LEFT);
            }

            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isTrue(root.get("isActive")));

            if (provinceId != null) {
                predicates.add(cb.equal(root.get("province").get("id"), provinceId));
            }
            if (districtId != null) {
                predicates.add(cb.equal(root.get("district").get("id"), districtId));
            }
            if (dsDivisionId != null) {
                predicates.add(cb.equal(root.get("dsDivision").get("id"), dsDivisionId));
            }
            if (postalCode != null) {
                predicates.add(cb.equal(root.get("postalCode"), postalCode));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("postalCode")), pattern),
                        cb.like(cb.lower(root.get("areaName")), pattern)
                ));
            }

            return cb.and(predicates.toArray(Predicate[]::new));
        };

        return findAll(spec, Sort.by(Sort.Direction.ASC, "postalCode"));
    }
}
