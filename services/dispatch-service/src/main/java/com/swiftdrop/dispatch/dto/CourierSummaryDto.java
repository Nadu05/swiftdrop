package com.swiftdrop.dispatch.dto;

/** Dashboard counters for the logged-in courier, scoped to a single day. */
public class CourierSummaryDto {
    private String date;
    private long totalAssigned;
    private long pending;
    private long inProgress;
    private long completed;
    private long failed;
    private int activeWorkload;
    private int maxConcurrent;
    private int workloadPercent;
    private String workloadLevel;

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
    public long getTotalAssigned() { return totalAssigned; }
    public void setTotalAssigned(long totalAssigned) { this.totalAssigned = totalAssigned; }
    public long getPending() { return pending; }
    public void setPending(long pending) { this.pending = pending; }
    public long getInProgress() { return inProgress; }
    public void setInProgress(long inProgress) { this.inProgress = inProgress; }
    public long getCompleted() { return completed; }
    public void setCompleted(long completed) { this.completed = completed; }
    public long getFailed() { return failed; }
    public void setFailed(long failed) { this.failed = failed; }
    public int getActiveWorkload() { return activeWorkload; }
    public void setActiveWorkload(int activeWorkload) { this.activeWorkload = activeWorkload; }
    public int getMaxConcurrent() { return maxConcurrent; }
    public void setMaxConcurrent(int maxConcurrent) { this.maxConcurrent = maxConcurrent; }
    public int getWorkloadPercent() { return workloadPercent; }
    public void setWorkloadPercent(int workloadPercent) { this.workloadPercent = workloadPercent; }
    public String getWorkloadLevel() { return workloadLevel; }
    public void setWorkloadLevel(String workloadLevel) { this.workloadLevel = workloadLevel; }
}
