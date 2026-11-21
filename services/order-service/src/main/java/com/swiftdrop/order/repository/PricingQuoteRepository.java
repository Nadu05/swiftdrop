package com.swiftdrop.order.repository;

import com.swiftdrop.order.entity.PricingQuote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PricingQuoteRepository extends JpaRepository<PricingQuote, Long> {
    Optional<PricingQuote> findByQuoteReferenceIgnoreCase(String quoteReference);
}

