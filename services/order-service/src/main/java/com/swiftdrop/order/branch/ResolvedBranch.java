package com.swiftdrop.order.branch;

/**
 * The branch the Organization service chose for a pickup location.
 *
 * @param branchId   id in the Organization service (stored on the order)
 * @param branchCode short code, for logs
 * @param branchName display name, for logs
 * @param distanceKm distance from the pickup point to the branch
 */
public record ResolvedBranch(long branchId, String branchCode, String branchName, double distanceKm) {
}
