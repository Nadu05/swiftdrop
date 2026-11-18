package com.swiftdrop.organization.service;

import com.swiftdrop.organization.dto.BranchCreateRequest;
import com.swiftdrop.organization.dto.BranchResponse;
import com.swiftdrop.organization.dto.BranchUpdateRequest;
import com.swiftdrop.organization.dto.PostalAreaDto;
import com.swiftdrop.organization.entity.Branch;
import com.swiftdrop.organization.entity.BranchPostalArea;
import com.swiftdrop.organization.entity.District;
import com.swiftdrop.organization.entity.DsDivision;
import com.swiftdrop.organization.entity.PostalArea;
import com.swiftdrop.organization.entity.Province;
import com.swiftdrop.organization.entity.enums.BranchStatus;
import com.swiftdrop.organization.exception.DuplicateResourceException;
import com.swiftdrop.organization.exception.ResourceNotFoundException;
import com.swiftdrop.organization.repository.BranchPostalAreaRepository;
import com.swiftdrop.organization.repository.BranchRepository;
import com.swiftdrop.organization.repository.DistrictRepository;
import com.swiftdrop.organization.repository.DsDivisionRepository;
import com.swiftdrop.organization.repository.PostalAreaRepository;
import com.swiftdrop.organization.repository.ProvinceRepository;
import com.swiftdrop.organization.security.OrganizationUserPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

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
    private final ProvinceRepository provinceRepository;
    private final DistrictRepository districtRepository;
    private final DsDivisionRepository dsDivisionRepository;
    private final PostalAreaRepository postalAreaRepository;
    private final BranchPostalAreaRepository branchPostalAreaRepository;

    public BranchService(
            BranchRepository repository,
            ProvinceRepository provinceRepository,
            DistrictRepository districtRepository,
            DsDivisionRepository dsDivisionRepository,
            PostalAreaRepository postalAreaRepository,
            BranchPostalAreaRepository branchPostalAreaRepository
    ) {
        this.repository = repository;
        this.provinceRepository = provinceRepository;
        this.districtRepository = districtRepository;
        this.dsDivisionRepository = dsDivisionRepository;
        this.postalAreaRepository = postalAreaRepository;
        this.branchPostalAreaRepository = branchPostalAreaRepository;
    }

    /**
     * Create a new branch and its initial active Postal Area assignments atomically.
     *
     * @param request validated branch creation data
     * @return the created branch
     * @throws DuplicateResourceException if branch code exists or a postal area is actively assigned elsewhere
     * @throws IllegalArgumentException   if an ACTIVE branch has zero assigned postal areas or invalid area IDs
     */
    public BranchResponse create(BranchCreateRequest request) {
        if (repository.existsByCode(request.getCode())) {
            throw new DuplicateResourceException(
                    "Branch with code '" + request.getCode() + "' already exists");
        }

        BranchStatus targetStatus = request.getStatus() != null ? request.getStatus() : BranchStatus.ACTIVE;
        Set<Long> distinctPostalAreaIds = request.getPostalAreaIds() == null
                ? Set.of()
                : new LinkedHashSet<>(request.getPostalAreaIds());

        if (targetStatus == BranchStatus.ACTIVE && distinctPostalAreaIds.isEmpty()) {
            throw new IllegalArgumentException(
                    "An ACTIVE branch must have at least one assigned Postal Area");
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
        branch.setStatus(targetStatus);
        branch.setPostalCode(
                request.getPostalCode() != null && !request.getPostalCode().isBlank()
                        ? request.getPostalCode().trim()
                        : null
        );

        if (request.getProvinceId() != null) {
            Province province = provinceRepository.findById(request.getProvinceId())
                    .orElseThrow(() -> new ResourceNotFoundException("Province", request.getProvinceId()));
            branch.setProvince(province);
        }
        if (request.getDistrictId() != null) {
            District district = districtRepository.findById(request.getDistrictId())
                    .orElseThrow(() -> new ResourceNotFoundException("District", request.getDistrictId()));
            branch.setDistrict(district);
        }
        if (request.getDsDivisionId() != null) {
            DsDivision dsDivision = dsDivisionRepository.findById(request.getDsDivisionId())
                    .orElseThrow(() -> new ResourceNotFoundException("DsDivision", request.getDsDivisionId()));
            branch.setDsDivision(dsDivision);
        }

        Branch savedBranch = repository.save(branch);

        List<PostalAreaDto> assignedDtos = new ArrayList<>();
        if (!distinctPostalAreaIds.isEmpty()) {
            List<PostalArea> foundAreas = postalAreaRepository.findAllById(distinctPostalAreaIds);
            Map<Long, PostalArea> areaById = foundAreas.stream()
                    .collect(Collectors.toMap(PostalArea::getId, Function.identity()));

            for (Long areaId : distinctPostalAreaIds) {
                PostalArea area = areaById.get(areaId);
                if (area == null) {
                    throw new ResourceNotFoundException("PostalArea", areaId);
                }
                if (!area.isActive()) {
                    throw new IllegalArgumentException(
                            "Postal Area '" + area.getPostalCode() + "' is inactive and cannot be assigned");
                }
            }

            List<BranchPostalArea> conflicts = branchPostalAreaRepository.findActiveByPostalAreaIdIn(distinctPostalAreaIds);
            if (!conflicts.isEmpty()) {
                BranchPostalArea conflict = conflicts.get(0);
                throw new DuplicateResourceException(
                        String.format("Postal Area '%s' (%s) is already actively assigned to branch '%s' (%s)",
                                conflict.getPostalArea().getPostalCode(),
                                conflict.getPostalArea().getAreaName(),
                                conflict.getBranch().getName(),
                                conflict.getBranch().getCode()));
            }

            String assignedBy = resolveCurrentActor();
            LocalDateTime now = LocalDateTime.now();
            List<BranchPostalArea> assignments = new ArrayList<>();
            for (Long areaId : distinctPostalAreaIds) {
                PostalArea area = areaById.get(areaId);
                BranchPostalArea bpa = new BranchPostalArea();
                bpa.setBranch(savedBranch);
                bpa.setPostalArea(area);
                bpa.setActive(true);
                bpa.setAssignedAt(now);
                bpa.setAssignedBy(assignedBy);
                assignments.add(bpa);
                assignedDtos.add(toPostalAreaDto(area));
            }
            branchPostalAreaRepository.saveAll(assignments);
        }

        return toResponse(savedBranch, assignedDtos);
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
        return toResponse(branch, null);
    }

    private BranchResponse toResponse(Branch branch, List<PostalAreaDto> assignedPostalAreas) {
        BranchResponse response = new BranchResponse(
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
        response.setProvinceId(branch.getProvince() != null ? branch.getProvince().getId() : null);
        response.setDistrictId(branch.getDistrict() != null ? branch.getDistrict().getId() : null);
        response.setDsDivisionId(branch.getDsDivision() != null ? branch.getDsDivision().getId() : null);
        response.setPostalCode(branch.getPostalCode());
        response.setAssignedPostalAreas(assignedPostalAreas);
        return response;
    }

    private PostalAreaDto toPostalAreaDto(PostalArea area) {
        return new PostalAreaDto(
                area.getId(),
                area.getPostalCode(),
                area.getAreaName(),
                area.getProvince().getId(),
                area.getProvince().getName(),
                area.getDistrict().getId(),
                area.getDistrict().getName(),
                area.getDsDivision() != null ? area.getDsDivision().getId() : null,
                area.getDsDivision() != null ? area.getDsDivision().getName() : null,
                area.getLatitude(),
                area.getLongitude(),
                area.isActive()
        );
    }

    private String resolveCurrentActor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return "system";
        }
        if (auth.getPrincipal() instanceof OrganizationUserPrincipal principal && principal.email() != null) {
            return principal.email();
        }
        return auth.getName() != null ? auth.getName() : "system";
    }
}

