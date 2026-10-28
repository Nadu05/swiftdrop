package com.swiftdrop.identity.repository;

import com.swiftdrop.identity.entity.TestItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TestItemRepository extends JpaRepository<TestItem, Long> {
}
