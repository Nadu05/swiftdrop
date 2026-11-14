package com.swiftdrop.organization.service;

import com.swiftdrop.organization.dto.BranchCreateRequest;
import com.swiftdrop.organization.dto.BranchResponse;
import com.swiftdrop.organization.dto.BranchUpdateRequest;
import com.swiftdrop.organization.dto.MerchantValidationPatterns;
import com.swiftdrop.organization.entity.Branch;
import com.swiftdrop.organization.entity.enums.BranchStatus;
import com.swiftdrop.organization.exception.DuplicateResourceException;
import com.swiftdrop.organization.exception.ResourceNotFoundException;
import com.swiftdrop.organization.repository.BranchRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Service layer for branch management operations.
 * Handles creation, retrieval, update, and status changes (activate/deactivate) for branches.
 *
 * <p><strong>Security note:</strong> Spring Security and JWT validation are not yet implemented
 * in this service. All endpoints are currently unprotected. Production deployment requires
 * integration with the Identity Service's authentication and role-based access control
 * (SYSTEM_ADMIN / BRANCH_ADMIN roles for write operations).</p>
 */
@Service
@Transactional
public class BranchService {

    private static final Pattern BRANCH_CODE_PATTERN = Pattern.compile(MerchantValidationPatterns.BRANCH_CODE);
    private static final Pattern PHONE_PATTERN = Pattern.compile(MerchantValidationPatterns.PHONE);

    private final BranchRepository repository;

    public BranchService(BranchRepository repository) {
        this.repository = repository;
    }

    /**
     * Create a new branch with ACTIVE status.
     *
     * @param request validated branch creation data
     * @return the created branch
     * @throws DuplicateResourceException if a branch with the same code already exists
     */
    public BranchResponse create(BranchCreateRequest request) {
        String normalizedCode = validateAndNormalizeCode(request.getCode());
        if (repository.existsByCode(normalizedCode)) {
            throw new DuplicateResourceException(
                    "Branch with code '" + normalizedCode + "' already exists");
        }

        String normalizedPhone = validateAndTrimPhone(request.getPhone());

        Branch branch = new Branch();
        branch.setCode(normalizedCode);
        branch.setName(requireNonBlank(request.getName(), "Branch name"));
        branch.setAddressLine1(requireNonBlank(request.getAddressLine1(), "Address line 1"));
        branch.setAddressLine2(trimToNull(request.getAddressLine2()));
        branch.setCity(requireNonBlank(request.getCity(), "City"));
        branch.setPhone(normalizedPhone);
        branch.setEmail(trimToNull(request.getEmail()));
        branch.setLatitude(request.getLatitude());
        branch.setLongitude(request.getLongitude());
        branch.setStatus(BranchStatus.ACTIVE);

        return toResponse(repository.save(branch));
    }

    /**
     * Retrieve all branches, optionally filtered by status.
     * Results are ordered alphabetically by branch name.
     *
     * @param status optional status filter (ACTIVE or INACTIVE); null returns all branches
     * @return list of branch responses
     */
    @Transactional(readOnly = true)
    public List<BranchResponse> findAll(BranchStatus status) {
        List<Branch> branches;
        if (status != null) {
            branches = repository.findByStatusOrderByNameAsc(status);
        } else {
            branches = repository.findAllByOrderByNameAsc();
        }
        return branches.stream().map(this::toResponse).toList();
    }

    /**
     * Find a branch by its database ID.
     *
     * @param id the branch ID
     * @return the branch response
     * @throws ResourceNotFoundException if the branch does not exist
     */
    @Transactional(readOnly = true)
    public BranchResponse findById(Long id) {
        Branch branch = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Branch", id));
        return toResponse(branch);
    }

    /**
     * Partially update an existing branch. Only non-null fields in the request are applied.
     * Supports updating branch code, name, address, contact, coordinates, and status.
     *
     * @param id      the branch ID to update
     * @param request partial update data
     * @return the updated branch
     * @throws ResourceNotFoundException  if the branch does not exist
     * @throws DuplicateResourceException if the new code conflicts with another branch
     * @throws IllegalArgumentException   if the provided status value is invalid
     */
    public BranchResponse update(Long id, BranchUpdateRequest request) {
        Branch branch = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Branch", id));

        if (request.getCode() != null) {
            String normalizedCode = validateAndNormalizeCode(request.getCode());
            // Check for code conflict only if the code is changing
            if (!normalizedCode.equals(branch.getCode()) && repository.existsByCode(normalizedCode)) {
                throw new DuplicateResourceException(
                        "Branch with code '" + normalizedCode + "' already exists");
            }
            branch.setCode(normalizedCode);
        }

        if (request.getName() != null) {
            branch.setName(requireNonBlank(request.getName(), "Branch name"));
        }

        if (request.getAddressLine1() != null) {
            branch.setAddressLine1(requireNonBlank(request.getAddressLine1(), "Address line 1"));
        }

        // addressLine2 is optional: empty/blank string clears it to null, null leaves it unchanged
        if (request.getAddressLine2() != null) {
            branch.setAddressLine2(trimToNull(request.getAddressLine2()));
        }

        if (request.getCity() != null) {
            branch.setCity(requireNonBlank(request.getCity(), "City"));
        }

        if (request.getPhone() != null) {
            branch.setPhone(validateAndTrimPhone(request.getPhone()));
        }

        if (request.getEmail() != null) {
            branch.setEmail(trimToNull(request.getEmail()));
        }

        if (request.getLatitude() != null) {
            branch.setLatitude(request.getLatitude());
        }

        if (request.getLongitude() != null) {
            branch.setLongitude(request.getLongitude());
        }

        if (request.getStatus() != null) {
            String trimmedStatus = request.getStatus().trim();
            if (trimmedStatus.isEmpty()) {
                throw new IllegalArgumentException(
                        "Invalid branch status: '" + request.getStatus() + "'. Allowed values: ACTIVE, INACTIVE");
            }
            try {
                BranchStatus newStatus = BranchStatus.valueOf(trimmedStatus.toUpperCase(Locale.ROOT));
                branch.setStatus(newStatus);
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException(
                        "Invalid branch status: '" + request.getStatus() + "'. Allowed values: ACTIVE, INACTIVE");
            }
        }

        return toResponse(repository.save(branch));
    }

    static String validateAndNormalizeCode(String code) {
        if (code == null || code.isBlank() || !BRANCH_CODE_PATTERN.matcher(code).matches()) {
            throw new IllegalArgumentException(
                    "Branch code must not be blank and may contain only letters, numbers, hyphens, and underscores");
        }
        return code.trim().toUpperCase(Locale.ROOT);
    }

    private static String validateAndTrimPhone(String phone) {
        if (phone == null || phone.isBlank() || !PHONE_PATTERN.matcher(phone.trim()).matches()) {
            throw new IllegalArgumentException(
                    "Phone must be a valid phone number (e.g. +94 11 234 5678)");
        }
        return phone.trim();
    }

    private static String requireNonBlank(String value, String fieldLabel) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldLabel + " must not be blank");
        }
        return value.trim();
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /**
     * Map a Branch entity to a BranchResponse DTO.
     */
    private BranchResponse toResponse(Branch branch) {
        return new BranchResponse(
                branch.getId(),
                branch.getCode(),
                branch.getName(),
                branch.getAddressLine1(),
                branch.getAddressLine2(),
                branch.getCity(),
                branch.getPhone(),
                branch.getEmail(),
                branch.getLatitude(),
                branch.getLongitude(),
                branch.getStatus().name(),
                branch.getCreatedAt(),
                branch.getUpdatedAt()
        );
    }
}

