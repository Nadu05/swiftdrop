package com.swiftdrop.notification.repository;

import com.swiftdrop.notification.entity.TestItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TestItemRepository extends JpaRepository<TestItem, Long> {
}
