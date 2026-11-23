package com.swiftdrop.identity.repository;

import com.swiftdrop.identity.entity.OAuthClient;
import com.swiftdrop.identity.entity.OAuthClientStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OAuthClientRepository extends JpaRepository<OAuthClient, Long> {

    Optional<OAuthClient> findByClientId(String clientId);

    List<OAuthClient> findByMerchantIdIgnoreCaseOrderByCreatedAtDesc(String merchantId);

    List<OAuthClient> findByMerchantIdIgnoreCaseAndStatus(String merchantId, OAuthClientStatus status);

    boolean existsByClientId(String clientId);
}
