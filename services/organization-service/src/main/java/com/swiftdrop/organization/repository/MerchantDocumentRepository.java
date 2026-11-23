package com.swiftdrop.organization.repository;

import com.swiftdrop.organization.entity.MerchantDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MerchantDocumentRepository extends JpaRepository<MerchantDocument, Long> {

    List<MerchantDocument> findByApplication_IdOrderByUploadedAtDesc(Long applicationId);

    Optional<MerchantDocument> findByIdAndApplication_Id(Long id, Long applicationId);
}
