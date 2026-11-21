package com.swiftdrop.dispatch.dto;

import jakarta.validation.constraints.NotBlank;

public class ExceptionDecisionRequest {

    @NotBlank(message = "Dispatcher decision action is required (RETURN_TO_SENDER, RESCHEDULE_DELIVERY, or HOLD_AT_BRANCH)")
    private String decisionAction;

    @NotBlank(message = "Decision reason is required")
    private String decisionReason;

    private String evidenceReference;

    public ExceptionDecisionRequest() {
    }

    public ExceptionDecisionRequest(String decisionAction, String decisionReason) {
        this.decisionAction = decisionAction;
        this.decisionReason = decisionReason;
    }

    public String getDecisionAction() {
        return decisionAction;
    }

    public void setDecisionAction(String decisionAction) {
        this.decisionAction = decisionAction;
    }

    public String getDecisionReason() {
        return decisionReason;
    }

    public void setDecisionReason(String decisionReason) {
        this.decisionReason = decisionReason;
    }

    public String getEvidenceReference() {
        return evidenceReference;
    }

    public void setEvidenceReference(String evidenceReference) {
        this.evidenceReference = evidenceReference;
    }
}

