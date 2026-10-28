package com.swiftdrop.organization.repository;

import com.swiftdrop.organization.entity.TestItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TestItemRepository extends JpaRepository<TestItem, Long> {
}
