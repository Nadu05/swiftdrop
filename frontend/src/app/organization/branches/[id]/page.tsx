'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  SearchX,
  X,
} from 'lucide-react';
import BranchDetails from '@/components/organization/branches/BranchDetails';
import BranchStatusDialog from '@/components/organization/branches/BranchStatusDialog';
import {
  getBranchById,
  OrganizationApiError,
} from '@/api/services/organization.api';
import type { BranchResponse } from '@/types/organization.types';

/**
 * Branch Details Page (/organization/branches/[id])
 * Member 04 — Organization Admin UI (Phase 3)
 *
 * Fetches a single branch via `GET /api/v1/organization/branches/{id}`
 * and supports status activation/deactivation via `PATCH /api/v1/organization/branches/{id}`.
 */
export default function BranchDetailsPage() {
  const params = useParams<{ id: string }>();
  const rawId = params?.id ?? '';
  const numericId = Number(rawId);
  const isValidBranchId = Number.isInteger(numericId) && numericId > 0;

  const [branch, setBranch] = useState<BranchResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Status confirmation dialog state
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState<boolean>(false);
  const [statusSuccessMessage, setStatusSuccessMessage] = useState<string | null>(null);

  const fetchBranch = useCallback(async () => {
    if (!isValidBranchId) {
      setIsLoading(false);
      setIsNotFound(true);
      setLoadError(`Invalid branch ID "${rawId}". Branch ID must be a positive integer.`);
      return;
    }

    setIsLoading(true);
    setIsNotFound(false);
    setLoadError(null);

    try {
      const data = await getBranchById(numericId);
      setBranch(data);
    } catch (err: unknown) {
      setBranch(null);
      if (err instanceof OrganizationApiError && err.status === 404) {
        setIsNotFound(true);
        setLoadError(err.message);
      } else {
        setLoadError(
          err instanceof Error
            ? err.message
            : `Unable to load branch #${numericId} from the Organization Service.`
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [isValidBranchId, numericId, rawId]);

  useEffect(() => {
    fetchBranch();
  }, [fetchBranch]);

  const handleStatusUpdated = (updatedBranch: BranchResponse) => {
    setBranch(updatedBranch);
    setIsStatusDialogOpen(false);
    const actionWord =
      updatedBranch.status === 'ACTIVE' ? 'activated' : 'deactivated';
    setStatusSuccessMessage(
      `Branch "${updatedBranch.name}" (${updatedBranch.code}) has been ${actionWord} and is now ${updatedBranch.status}.`
    );
  };

  return (
    <div className="org-page">
      {/* In-page Back Navigation */}
      <div className="org-subpage-topbar">
        <Link href="/organization/branches" className="org-back-link">
          <ArrowLeft size={15} aria-hidden="true" />
          <span>Back to Branch Directory</span>
        </Link>
      </div>

      {/* Confirmed Status Update Success Banner */}
      {statusSuccessMessage && (
        <div className="org-success-banner" role="status" aria-live="polite">
          <div className="org-success-banner__left">
            <CheckCircle2 size={17} className="org-success-banner__icon" aria-hidden="true" />
            <span>{statusSuccessMessage}</span>
          </div>
          <button
            type="button"
            className="org-success-banner__close"
            onClick={() => setStatusSuccessMessage(null)}
            aria-label="Dismiss status notification"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Page Heading */}
      <header className="org-page-header">
        <div className="org-page-header__titles">
          <p className="org-page-header__eyebrow">
            Admin / Branch Directory / {branch ? branch.code : `Branch #${rawId}`}
          </p>
          <h1 className="org-page-header__title">
            {branch ? branch.name : 'Branch Details'}
          </h1>
          <p className="org-page-header__subtitle">
            View complete branch identity, physical address, geographic coordinates, contact
            channels, and operational status.
          </p>
        </div>
      </header>

      {/* 1. Loading State */}
      {isLoading ? (
        <section className="org-directory-card" role="status" aria-live="polite">
          <div className="org-state-box">
            <span className="org-spinner" aria-hidden="true" />
            <p className="org-state-box__title">Loading branch #{rawId}...</p>
            <p className="org-state-box__desc">
              Fetching branch details from{' '}
              <code>GET /api/v1/organization/branches/{rawId}</code>.
            </p>
          </div>
        </section>
      ) : isNotFound ? (
        /* 2. Branch Not Found State (HTTP 404 or Invalid ID) */
        <section className="org-directory-card" role="alert">
          <div className="org-state-box">
            <div className="org-state-box__icon" aria-hidden="true">
              <SearchX size={22} />
            </div>
            <h2 className="org-state-box__title">Branch Not Found</h2>
            <p className="org-state-box__desc">
              {loadError ||
                `No branch record was found with ID "${rawId}" in the Organization Service.`}
            </p>
            <div className="org-state-box__actions">
              <Link href="/organization/branches" className="org-btn org-btn--primary">
                <ArrowLeft size={15} aria-hidden="true" />
                <span>Return to Branch Directory</span>
              </Link>
            </div>
          </div>
        </section>
      ) : loadError ? (
        /* 3. API Failure State */
        <section className="org-directory-card" role="alert">
          <div className="org-state-box org-state-box--error">
            <div className="org-state-box__icon org-state-box__icon--error" aria-hidden="true">
              <AlertCircle size={22} />
            </div>
            <h2 className="org-state-box__title">Unable to Load Branch Details</h2>
            <p className="org-state-box__desc">{loadError}</p>
            <div className="org-state-box__actions">
              <button
                type="button"
                className="org-btn org-btn--primary"
                onClick={fetchBranch}
              >
                <RefreshCw size={15} aria-hidden="true" />
                <span>Retry Loading</span>
              </button>

              <Link href="/organization/branches" className="org-btn org-btn--secondary">
                <ArrowLeft size={15} aria-hidden="true" />
                <span>Return to Branch Directory</span>
              </Link>
            </div>
          </div>
        </section>
      ) : branch ? (
        /* 4. Populated Branch Details View */
        <>
          <BranchDetails
            branch={branch}
            onRequestStatusToggle={() => setIsStatusDialogOpen(true)}
          />

          <BranchStatusDialog
            branch={branch}
            isOpen={isStatusDialogOpen}
            onClose={() => setIsStatusDialogOpen(false)}
            onStatusUpdated={handleStatusUpdated}
          />
        </>
      ) : null}
    </div>
  );
}

