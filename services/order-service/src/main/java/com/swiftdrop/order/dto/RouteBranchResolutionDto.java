package com.swiftdrop.order.dto;

import com.fasterxml.jackson.annotation.JsonAlias;

public class RouteBranchResolutionDto {

    private BranchResolutionInfoDto originBranch;
    private BranchResolutionInfoDto destinationBranch;
    private boolean sameBranch;

    @JsonAlias("interBranchStraightLineDistanceKm")
    private Double interBranchDistanceKm;

    public RouteBranchResolutionDto() {
    }

    public RouteBranchResolutionDto(
            BranchResolutionInfoDto originBranch,
            BranchResolutionInfoDto destinationBranch,
            boolean sameBranch,
            Double interBranchDistanceKm) {
        this.originBranch = originBranch;
        this.destinationBranch = destinationBranch;
        this.sameBranch = sameBranch;
        this.interBranchDistanceKm = interBranchDistanceKm;
    }

    public BranchResolutionInfoDto getOriginBranch() {
        return originBranch;
    }

    public void setOriginBranch(BranchResolutionInfoDto originBranch) {
        this.originBranch = originBranch;
    }

    public BranchResolutionInfoDto getDestinationBranch() {
        return destinationBranch;
    }

    public void setDestinationBranch(BranchResolutionInfoDto destinationBranch) {
        this.destinationBranch = destinationBranch;
    }

    public boolean isSameBranch() {
        return sameBranch;
    }

    public void setSameBranch(boolean sameBranch) {
        this.sameBranch = sameBranch;
    }

    public Double getInterBranchDistanceKm() {
        return interBranchDistanceKm;
    }

    public void setInterBranchDistanceKm(Double interBranchDistanceKm) {
        this.interBranchDistanceKm = interBranchDistanceKm;
    }
}
