package com.swiftdrop.organization.repository;

import com.swiftdrop.organization.entity.MerchantApplicationHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MerchantApplicationHistoryRepository extends JpaRepository<MerchantApplicationHistory, Long> {

    List<MerchantApplicationHistory> findByApplicationIdOrderByCreatedAtAsc(Long applicationId);
}

