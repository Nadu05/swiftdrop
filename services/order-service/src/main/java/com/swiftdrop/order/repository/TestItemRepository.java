package com.swiftdrop.order.repository;
import com.swiftdrop.order.entity.TestItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
@Repository
public interface TestItemRepository extends JpaRepository<TestItem, Long> {}
