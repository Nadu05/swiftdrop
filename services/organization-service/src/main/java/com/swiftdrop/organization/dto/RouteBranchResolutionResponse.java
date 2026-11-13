package com.swiftdrop.organization.dto;

/**
 * Response payload containing both resolved origin (pickup) and destination branches.
 *
 * <p>Note: {@code interBranchDistanceKm} is the geographic Haversine reference distance
 * between the origin and destination branch coordinates. Authoritative delivery pricing
 * distance is owned and calculated by the Order Service.</p>
 */
public class RouteBranchResolutionResponse {

    private BranchResolutionResponse originBranch;
    private BranchResolutionResponse destinationBranch;
    private boolean sameBranch;
    private Double interBranchDistanceKm;

    public RouteBranchResolutionResponse() {}

    public RouteBranchResolutionResponse(BranchResolutionResponse originBranch,
                                         BranchResolutionResponse destinationBranch,
                                         boolean sameBranch,
                                         Double interBranchDistanceKm) {
        this.originBranch = originBranch;
        this.destinationBranch = destinationBranch;
        this.sameBranch = sameBranch;
        this.interBranchDistanceKm = interBranchDistanceKm;
    }

    public BranchResolutionResponse getOriginBranch() { return originBranch; }
    public void setOriginBranch(BranchResolutionResponse originBranch) { this.originBranch = originBranch; }

    public BranchResolutionResponse getDestinationBranch() { return destinationBranch; }
    public void setDestinationBranch(BranchResolutionResponse destinationBranch) { this.destinationBranch = destinationBranch; }

    public boolean isSameBranch() { return sameBranch; }
    public void setSameBranch(boolean sameBranch) { this.sameBranch = sameBranch; }

    public Double getInterBranchDistanceKm() { return interBranchDistanceKm; }
    public void setInterBranchDistanceKm(Double interBranchDistanceKm) { this.interBranchDistanceKm = interBranchDistanceKm; }
}

