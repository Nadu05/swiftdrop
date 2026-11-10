package com.swiftdrop.organization.service;

import com.swiftdrop.organization.dto.BranchCreateRequest;
import com.swiftdrop.organization.dto.BranchResponse;
import com.swiftdrop.organization.dto.BranchUpdateRequest;
import com.swiftdrop.organization.entity.Branch;
import com.swiftdrop.organization.entity.enums.BranchStatus;
import com.swiftdrop.organization.exception.DuplicateResourceException;
import com.swiftdrop.organization.exception.ResourceNotFoundException;
import com.swiftdrop.organization.repository.BranchRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

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
        if (repository.existsByCode(request.getCode())) {
            throw new DuplicateResourceException(
                    "Branch with code '" + request.getCode() + "' already exists");
        }

        Branch branch = new Branch();
        branch.setCode(request.getCode());
        branch.setName(request.getName());
        branch.setAddressLine1(request.getAddressLine1());
        branch.setAddressLine2(request.getAddressLine2());
        branch.setCity(request.getCity());
        branch.setPhone(request.getPhone());
        branch.setEmail(request.getEmail());
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
            if (!request.getCode().isBlank()) {
                // Check for code conflict only if the code is changing
                if (!request.getCode().equals(branch.getCode()) && repository.existsByCode(request.getCode())) {
                    throw new DuplicateResourceException(
                            "Branch with code '" + request.getCode() + "' already exists");
                }
                branch.setCode(request.getCode());
            }
        }

        if (request.getName() != null && !request.getName().isBlank()) {
            branch.setName(request.getName());
        }

        if (request.getAddressLine1() != null && !request.getAddressLine1().isBlank()) {
            branch.setAddressLine1(request.getAddressLine1());
        }

        // addressLine2 can be set to any value including empty (nullable column)
        if (request.getAddressLine2() != null) {
            branch.setAddressLine2(request.getAddressLine2());
        }

        if (request.getCity() != null && !request.getCity().isBlank()) {
            branch.setCity(request.getCity());
        }

        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            branch.setPhone(request.getPhone());
        }

        if (request.getEmail() != null) {
            branch.setEmail(request.getEmail());
        }

        if (request.getLatitude() != null) {
            branch.setLatitude(request.getLatitude());
        }

        if (request.getLongitude() != null) {
            branch.setLongitude(request.getLongitude());
        }

        if (request.getStatus() != null) {
            try {
                BranchStatus newStatus = BranchStatus.valueOf(request.getStatus().toUpperCase());
                branch.setStatus(newStatus);
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException(
                        "Invalid branch status: '" + request.getStatus() + "'. Allowed values: ACTIVE, INACTIVE");
            }
        }

        return toResponse(repository.save(branch));
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

