package com.swiftdrop.dispatch.service;

import com.swiftdrop.dispatch.dto.ProofOfDeliveryRequest;
import com.swiftdrop.dispatch.entity.enums.ProofOfDeliveryType;
import com.swiftdrop.dispatch.exception.DispatchValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class PodEvidenceStorageServiceTest {

    @TempDir
    Path tempDir;

    private PodEvidenceStorageService storageService;

    @BeforeEach
    void setUp() {
        storageService = new PodEvidenceStorageService(tempDir.toString());
    }

    @Test
    void validateAndStoreEvidence_ValidSignatureReference_NormalizesToSecureStorageUri() {
        ProofOfDeliveryRequest req = new ProofOfDeliveryRequest();
        req.setRecipientName("Ayesha Perera");
        req.setProofType("SIGNATURE");
        req.setSignatureReference("sig-token-99412");

        PodEvidenceStorageService.ValidatedPodEvidence result =
                storageService.validateAndStoreEvidence("SD-94801", req);

        assertEquals("Ayesha Perera", result.recipientName());
        assertEquals(ProofOfDeliveryType.SIGNATURE, result.proofType());
        assertEquals("pod-storage://sig/SD-94801/sig-token-99412", result.signatureReference());
    }

    @Test
    void validateAndStoreEvidence_ValidBase64DataUri_WritesFileAndReturnsCompactUriReference() {
        ProofOfDeliveryRequest req = new ProofOfDeliveryRequest();
        req.setReceivedBy("Roshan Fernando");
        req.setType("PHOTO");
        // 1x1 transparent PNG in base64
        req.setReference("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");

        PodEvidenceStorageService.ValidatedPodEvidence result =
                storageService.validateAndStoreEvidence("SD-94802", req);

        assertEquals("Roshan Fernando", result.recipientName());
        assertEquals(ProofOfDeliveryType.PHOTO, result.proofType());
        assertNotNull(result.photoEvidenceReference());
        assertTrue(result.photoEvidenceReference().startsWith("pod-storage://photo/SD-94802-photo-"));
        assertTrue(result.photoEvidenceReference().length() < 120);
    }

    @Test
    void validateAndStoreEvidence_RawOversizedBlob_RejectedToProtectPostgreSQL() {
        ProofOfDeliveryRequest req = new ProofOfDeliveryRequest();
        req.setRecipientName("Ayesha Perera");
        req.setProofType("PHOTO");
        req.setPhotoEvidenceReference("RAW_BINARY_BLOB_".repeat(40));

        DispatchValidationException ex = assertThrows(
                DispatchValidationException.class,
                () -> storageService.validateAndStoreEvidence("SD-94803", req)
        );
        assertEquals("POD_RAW_IMAGE_FORBIDDEN", ex.getErrorCode());
    }

    @Test
    void validateAndStoreEvidence_MissingRecipientOrReference_ThrowsIllegalArgumentException() {
        ProofOfDeliveryRequest missingRecipient = new ProofOfDeliveryRequest();
        missingRecipient.setSignatureReference("sig-123");
        assertThrows(
                IllegalArgumentException.class,
                () -> storageService.validateAndStoreEvidence("SD-94804", missingRecipient)
        );

        ProofOfDeliveryRequest missingEvidence = new ProofOfDeliveryRequest();
        missingEvidence.setRecipientName("Ayesha Perera");
        assertThrows(
                IllegalArgumentException.class,
                () -> storageService.validateAndStoreEvidence("SD-94804", missingEvidence)
        );
    }
}
