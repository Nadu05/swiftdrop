package com.swiftdrop.dispatch.repository;

import com.swiftdrop.dispatch.entity.TestItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TestItemRepository extends JpaRepository<TestItem, Long> {
}
