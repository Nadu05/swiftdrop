package com.swiftdrop.dispatch.service;

import com.swiftdrop.dispatch.dto.ProofOfDeliveryRequest;
import com.swiftdrop.dispatch.entity.enums.ProofOfDeliveryType;
import com.swiftdrop.dispatch.exception.DispatchValidationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.UUID;

/**
 * Validates Proof of Delivery evidence and ensures PostgreSQL stores only compact,
 * secure file/object references rather than raw binary image blobs (Requirement 6, BD-08).
 */
@Service
public class PodEvidenceStorageService {

    private static final Logger log = LoggerFactory.getLogger(PodEvidenceStorageService.class);
    private static final int MAX_REFERENCE_LENGTH = 450;

    private final Path storageBaseDir;

    public PodEvidenceStorageService(
            @Value("${swiftdrop.pod-storage.base-dir:./data/pod-evidence}") String baseDir) {
        this.storageBaseDir = Paths.get(baseDir).toAbsolutePath().normalize();
    }

    public ValidatedPodEvidence validateAndStoreEvidence(
            String trackingNumber,
            ProofOfDeliveryRequest request) {

        if (request == null) {
            throw new IllegalArgumentException("Proof of delivery payload is required");
        }

        String recipientName = request.resolvedRecipientName();
        if (recipientName == null || recipientName.isBlank()) {
            throw new IllegalArgumentException("Recipient name (recipientName / receivedBy) is required for Proof of Delivery");
        }

        ProofOfDeliveryType proofType = ProofOfDeliveryType.fromValue(request.resolvedProofType());

        String rawSig = request.getSignatureReference();
        String rawPhoto = request.getPhotoEvidenceReference();
        String rawOtp = request.getOtpReference();
        String genericRef = request.getReference();

        if (genericRef != null && !genericRef.isBlank()) {
            switch (proofType) {
                case PHOTO -> {
                    if (rawPhoto == null || rawPhoto.isBlank()) {
                        rawPhoto = genericRef.trim();
                    }
                }
                case OTP -> {
                    if (rawOtp == null || rawOtp.isBlank()) {
                        rawOtp = genericRef.trim();
                    }
                    if (rawSig == null || rawSig.isBlank()) {
                        rawSig = "otp-verified://" + genericRef.trim();
                    }
                }
                case SIGNATURE -> {
                    if (rawSig == null || rawSig.isBlank()) {
                        rawSig = genericRef.trim();
                    }
                }
            }
        }

        boolean hasSignature = rawSig != null && !rawSig.isBlank();
        boolean hasPhoto = rawPhoto != null && !rawPhoto.isBlank();
        boolean hasOtp = rawOtp != null && !rawOtp.isBlank();

        if (!hasSignature && !hasPhoto && !hasOtp) {
            throw new IllegalArgumentException(
                    "Proof of delivery requires signatureReference, photoEvidenceReference, or evidence reference"
            );
        }

        String storedSignatureRef = hasSignature
                ? normalizeOrPersistReference(trackingNumber, "sig", rawSig.trim())
                : null;
        String storedPhotoRef = hasPhoto
                ? normalizeOrPersistReference(trackingNumber, "photo", rawPhoto.trim())
                : null;
        String storedOtpRef = hasOtp ? rawOtp.trim() : null;

        return new ValidatedPodEvidence(
                recipientName,
                proofType,
                storedSignatureRef,
                storedPhotoRef,
                storedOtpRef
        );
    }

    /** Validates and stores an optional evidence reference (data URI, storage URI, or external URL). */
    public String storeEvidenceReference(String trackingNumber, String kind, String rawReference) {
        if (rawReference == null || rawReference.isBlank()) {
            return null;
        }
        String effectiveTracking = (trackingNumber != null && !trackingNumber.isBlank())
                ? trackingNumber.trim()
                : "EXC-GEN";
        return normalizeOrPersistReference(effectiveTracking, kind != null ? kind : "evidence", rawReference.trim());
    }

    private String normalizeOrPersistReference(String trackingNumber, String kind, String value) {
        if (value.startsWith("data:image/")) {
            return persistDataUriToSecureFile(trackingNumber, kind, value);
        }

        if (value.length() > MAX_REFERENCE_LENGTH) {
            throw new DispatchValidationException(
                    "POD_RAW_IMAGE_FORBIDDEN",
                    "Raw binary image payloads cannot be stored directly in PostgreSQL; provide a secure file reference or valid data URI"
            );
        }

        if (value.startsWith("http://")
                || value.startsWith("https://")
                || value.startsWith("pod-storage://")
                || value.startsWith("otp-verified://")
                || value.startsWith("/storage/pod/")) {
            return value;
        }

        // Normalize reference token into canonical secure storage URI
        String sanitized = value.replaceAll("[^a-zA-Z0-9._\\-/]", "_");
        return "pod-storage://" + kind + "/" + trackingNumber + "/" + sanitized;
    }

    private String persistDataUriToSecureFile(String trackingNumber, String kind, String dataUri) {
        int commaIdx = dataUri.indexOf(',');
        if (commaIdx <= 0 || !dataUri.substring(0, commaIdx).contains(";base64")) {
            throw new DispatchValidationException(
                    "INVALID_POD_EVIDENCE",
                    "Malformed image data URI for Proof of Delivery"
            );
        }
        String base64Part = dataUri.substring(commaIdx + 1).trim();
        byte[] decoded;
        try {
            decoded = Base64.getDecoder().decode(base64Part);
        } catch (IllegalArgumentException ex) {
            throw new DispatchValidationException(
                    "INVALID_POD_EVIDENCE",
                    "Invalid base64 encoding in Proof of Delivery evidence"
            );
        }

        String ext = dataUri.startsWith("data:image/jpeg") ? ".jpg" : ".png";
        String fileName = trackingNumber + "-" + kind + "-" + UUID.randomUUID().toString().substring(0, 8) + ext;
        try {
            Files.createDirectories(storageBaseDir);
            Path targetFile = storageBaseDir.resolve(fileName).normalize();
            if (!targetFile.startsWith(storageBaseDir)) {
                throw new DispatchValidationException("INVALID_STORAGE_PATH", "Invalid evidence storage path");
            }
            Files.write(targetFile, decoded);
        } catch (DispatchValidationException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("Could not write POD evidence file {} to disk ({}); recording virtual storage URI",
                    fileName, ex.getMessage());
        }
        return "pod-storage://" + kind + "/" + fileName;
    }

    public record ValidatedPodEvidence(
            String recipientName,
            ProofOfDeliveryType proofType,
            String signatureReference,
            String photoEvidenceReference,
            String otpReference
    ) {
        public String primaryReference() {
            if (signatureReference != null && !signatureReference.isBlank()) {
                return signatureReference;
            }
            if (photoEvidenceReference != null && !photoEvidenceReference.isBlank()) {
                return photoEvidenceReference;
            }
            return otpReference;
        }
    }
}

