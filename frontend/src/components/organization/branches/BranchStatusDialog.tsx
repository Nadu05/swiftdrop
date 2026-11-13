'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  Power,
  X,
} from 'lucide-react';
import { updateBranchStatus } from '@/api/services/organization.api';
import type { BranchResponse, BranchStatus } from '@/types/organization.types';

export interface BranchStatusDialogProps {
  branch: BranchResponse | null;
  isOpen: boolean;
  onClose: () => void;
  /** Invoked ONLY after the backend confirms HTTP 200 OK on PATCH /api/v1/organization/branches/{id}. */
  onStatusUpdated: (updatedBranch: BranchResponse) => void;
}

/**
 * Confirmation modal for activating or deactivating an Organization branch.
 * Member 04 — Organization Admin UI (Phase 3)
 *
 * Calls `PATCH /api/v1/organization/branches/{id}` with `{ status: "ACTIVE" | "INACTIVE" }`.
 */
export default function BranchStatusDialog({
  branch,
  isOpen,
  onClose,
  onStatusUpdated,
}: BranchStatusDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Reset internal state and move keyboard focus into the dialog when opened
  useEffect(() => {
    if (isOpen && branch) {
      setIsSubmitting(false);
      setApiError(null);
      cancelButtonRef.current?.focus();
    }
  }, [isOpen, branch]);

  // Allow Escape key to dismiss the modal unless a request is currently in flight
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !branch) {
    return null;
  }

  const isCurrentlyActive = branch.status === 'ACTIVE';
  const targetStatus: BranchStatus = isCurrentlyActive ? 'INACTIVE' : 'ACTIVE';

  const handleConfirm = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      const updated = await updateBranchStatus(branch.id, targetStatus);
      onStatusUpdated(updated);
    } catch (err: unknown) {
      setApiError(
        err instanceof Error
          ? err.message
          : `Unable to ${
              isCurrentlyActive ? 'deactivate' : 'activate'
            } branch "${branch.name}".`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  return (
    <div
      className="org-dialog-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className="org-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="org-status-dialog-title"
        aria-describedby="org-status-dialog-desc"
      >
        {/* Dialog Header */}
        <div className="org-dialog__header">
          <div className="org-dialog__header-left">
            <div
              className={`org-dialog__icon ${
                isCurrentlyActive
                  ? 'org-dialog__icon--deactivate'
                  : 'org-dialog__icon--activate'
              }`}
              aria-hidden="true"
            >
              {isCurrentlyActive ? (
                <AlertTriangle size={20} />
              ) : (
                <CheckCircle2 size={20} />
              )}
            </div>
            <div>
              <h2 id="org-status-dialog-title" className="org-dialog__title">
                {isCurrentlyActive ? 'Deactivate Branch' : 'Activate Branch'}
              </h2>
              <p className="org-dialog__subtitle">
                Confirm operational status change in Organization Service
              </p>
            </div>
          </div>

          <button
            type="button"
            className="org-dialog__close"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close confirmation dialog"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Dialog Body */}
        <div className="org-dialog__body">
          {/* Target Branch Summary Box */}
          <div className="org-dialog__branch-box">
            <div className="org-dialog__branch-info">
              <div className="org-dialog__branch-title-row">
                <Building2 size={15} className="org-dialog__branch-icon" aria-hidden="true" />
                <span className="org-dialog__branch-name">{branch.name}</span>
                <span className="org-branch-code">{branch.code}</span>
              </div>
              <div className="org-dialog__branch-meta">
                <MapPin size={13} aria-hidden="true" />
                <span>
                  {branch.addressLine1}, {branch.city}
                </span>
              </div>
            </div>

            {/* Status Transition Indicator */}
            <div className="org-dialog__transition" aria-label="Status transition">
              <span
                className={`org-status-badge ${
                  isCurrentlyActive
                    ? 'org-status-badge--active'
                    : 'org-status-badge--inactive'
                }`}
              >
                <span className="org-status-badge__dot" aria-hidden="true" />
                <span>{isCurrentlyActive ? 'Active' : 'Inactive'}</span>
              </span>

              <ArrowRight size={14} className="org-dialog__transition-arrow" aria-hidden="true" />

              <span
                className={`org-status-badge ${
                  isCurrentlyActive
                    ? 'org-status-badge--inactive'
                    : 'org-status-badge--active'
                }`}
              >
                <span className="org-status-badge__dot" aria-hidden="true" />
                <span>{isCurrentlyActive ? 'Inactive' : 'Active'}</span>
              </span>
            </div>
          </div>

          {/* Operational Impact Description */}
          <p id="org-status-dialog-desc" className="org-dialog__description">
            {isCurrentlyActive ? (
              <>
                Are you sure you want to deactivate <strong>{branch.name}</strong> (
                <code className="org-inline-code">{branch.code}</code>)? Once deactivated,
                this branch will be marked as <strong>INACTIVE</strong> in the Organization
                Service and will no longer be eligible for active branch operations until it
                is reactivated.
              </>
            ) : (
              <>
                Are you sure you want to activate <strong>{branch.name}</strong> (
                <code className="org-inline-code">{branch.code}</code>)? Once activated,
                this branch will be marked as <strong>ACTIVE</strong> in the Organization
                Service and will become available for active branch operations.
              </>
            )}
          </p>

          {/* API Error Alert */}
          {apiError && (
            <div className="org-form-alert org-form-alert--error" role="alert">
              <div className="org-form-alert__content">
                <AlertCircle size={18} className="org-form-alert__icon" aria-hidden="true" />
                <div className="org-form-alert__text">
                  <strong className="org-form-alert__title">
                    Status Update Failed
                  </strong>
                  <p className="org-form-alert__desc">{apiError}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dialog Footer Actions */}
        <div className="org-dialog__footer">
          <button
            ref={cancelButtonRef}
            type="button"
            className="org-btn org-btn--secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <span>Cancel</span>
          </button>

          <button
            type="button"
            className={`org-btn ${
              isCurrentlyActive ? 'org-btn--danger' : 'org-btn--success'
            }`}
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="org-icon--spinning" aria-hidden="true" />
                <span>
                  {isCurrentlyActive ? 'Deactivating...' : 'Activating...'}
                </span>
              </>
            ) : (
              <>
                <Power size={15} aria-hidden="true" />
                <span>
                  {isCurrentlyActive ? 'Deactivate Branch' : 'Activate Branch'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

