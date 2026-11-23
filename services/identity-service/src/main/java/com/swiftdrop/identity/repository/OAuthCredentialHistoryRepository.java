package com.swiftdrop.identity.repository;

import com.swiftdrop.identity.entity.OAuthCredentialHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OAuthCredentialHistoryRepository extends JpaRepository<OAuthCredentialHistory, Long> {

    List<OAuthCredentialHistory> findByMerchantIdIgnoreCaseOrderByCreatedAtDesc(String merchantId);

    List<OAuthCredentialHistory> findByClientPkIdOrderByCreatedAtDesc(Long clientPkId);
}
