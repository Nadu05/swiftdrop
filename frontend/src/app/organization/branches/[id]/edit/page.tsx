'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  FlaskConical,
  RefreshCw,
} from 'lucide-react';
import BranchForm from '@/components/organization/branches/BranchForm';
import {
  getBranchById,
  getIsolatedMockBranchById,
  updateBranch,
} from '@/api/services/organization.api';
import {
  branchResponseToFormValues,
  toBranchUpdatePayload,
  type BranchFormValues,
} from '@/schema/branch.schema';
import type { BranchResponse } from '@/types/organization.types';

/**
 * Edit Branch Page (/organization/branches/[id]/edit)
 * Member 04 — Organization Admin UI (Phase 2)
 *
 * Loads an existing branch via `GET /api/v1/organization/branches/{id}`
 * and submits partial updates via `PATCH /api/v1/organization/branches/{id}`.
 */
export default function EditBranchPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const rawId = params?.id ?? '';
  const numericId = Number(rawId);
  const isValidBranchId = Number.isInteger(numericId) && numericId > 0;

  const [branch, setBranch] = useState<BranchResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isMockPreview, setIsMockPreview] = useState<boolean>(false);

  const fetchBranch = useCallback(async () => {
    if (!isValidBranchId) {
      setIsLoading(false);
      setLoadError(`Invalid branch ID "${rawId}". Branch ID must be a positive integer.`);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    setIsMockPreview(false);

    try {
      const data = await getBranchById(numericId);
      setBranch(data);
    } catch (err: unknown) {
      setBranch(null);
      setLoadError(
        err instanceof Error
          ? err.message
          : `Unable to load branch #${numericId} from the Organization Service.`
      );
    } finally {
      setIsLoading(false);
    }
  }, [isValidBranchId, numericId, rawId]);

  useEffect(() => {
    fetchBranch();
  }, [fetchBranch]);

  const availableMockBranch = useMemo(
    () => (isValidBranchId ? getIsolatedMockBranchById(numericId) : null),
    [isValidBranchId, numericId]
  );

  const handleEnableMockPreview = () => {
    if (!availableMockBranch) return;
    setIsMockPreview(true);
    setLoadError(null);
    setIsLoading(false);
    setBranch(availableMockBranch);
  };

  const initialFormValues = useMemo(
    () => (branch ? branchResponseToFormValues(branch) : undefined),
    [branch]
  );

  const handleEditSubmit = async (
    values: BranchFormValues
  ): Promise<BranchResponse> => {
    const payload = toBranchUpdatePayload(values);
    return updateBranch(numericId, payload);
  };

  const handleCancel = () => {
    router.push('/organization/branches');
  };

  const handleSuccessNavigate = (savedBranch: BranchResponse) => {
    router.push(
      `/organization/branches?updated=${encodeURIComponent(savedBranch.code)}`
    );
    router.refresh();
  };

  return (
    <div className="org-page">
      {/* In-page Breadcrumb & Back Navigation */}
      <div className="org-subpage-topbar">
        <Link href="/organization/branches" className="org-back-link">
          <ArrowLeft size={15} aria-hidden="true" />
          <span>Back to Branch Directory</span>
        </Link>
      </div>

      {/* Isolated Mock Mode Banner (only if developer explicitly opted in after an API error) */}
      {isMockPreview && (
        <div className="org-mock-banner" role="status">
          <div className="org-mock-banner__content">
            <FlaskConical size={17} className="org-mock-banner__icon" aria-hidden="true" />
            <div>
              <strong>Isolated Development Mock Preview:</strong> Populated with mock branch{' '}
              <code>#{numericId}</code> for visual inspection. Submitting the form still calls
              the live backend endpoint (<code>PATCH /api/v1/organization/branches/{numericId}</code>)
              and will never simulate a fake save.
            </div>
          </div>
          <button
            type="button"
            className="org-mock-banner__btn"
            onClick={fetchBranch}
          >
            <RefreshCw size={13} aria-hidden="true" />
            <span>Retry Live API</span>
          </button>
        </div>
      )}

      {/* Page Heading */}
      <header className="org-page-header">
        <div className="org-page-header__titles">
          <p className="org-page-header__eyebrow">
            Admin / Branch Directory / Edit Branch {branch ? `(${branch.code})` : `#${rawId}`}
          </p>
          <h1 className="org-page-header__title">
            {branch ? `Edit Branch: ${branch.name}` : 'Edit Branch'}
          </h1>
          <p className="org-page-header__subtitle">
            Update branch identity, street address, geographic coordinates, or contact
            information in the Organization Service.
          </p>
        </div>
      </header>

      {/* 1. Initial Loading State */}
      {isLoading ? (
        <section className="org-directory-card" aria-live="polite" role="status">
          <div className="org-state-box">
            <span className="org-spinner" aria-hidden="true" />
            <p className="org-state-box__title">Loading branch #{rawId}...</p>
            <p className="org-state-box__desc">
              Fetching existing branch record from{' '}
              <code>GET /api/v1/organization/branches/{rawId}</code>.
            </p>
          </div>
        </section>
      ) : loadError ? (
        /* 2. API Load Error State */
        <section className="org-directory-card" role="alert">
          <div className="org-state-box org-state-box--error">
            <div className="org-state-box__icon org-state-box__icon--error" aria-hidden="true">
              <AlertCircle size={22} />
            </div>
            <h2 className="org-state-box__title">Unable to Load Branch Details</h2>
            <p className="org-state-box__desc">{loadError}</p>

            <div className="org-state-box__actions">
              {isValidBranchId && (
                <button
                  type="button"
                  className="org-btn org-btn--primary"
                  onClick={fetchBranch}
                >
                  <RefreshCw size={15} aria-hidden="true" />
                  <span>Retry Loading</span>
                </button>
              )}

              {availableMockBranch && (
                <button
                  type="button"
                  className="org-btn org-btn--ghost"
                  onClick={handleEnableMockPreview}
                >
                  <FlaskConical size={15} aria-hidden="true" />
                  <span>Preview Mock Branch #{numericId}</span>
                </button>
              )}

              <Link href="/organization/branches" className="org-btn org-btn--secondary">
                <ArrowLeft size={15} aria-hidden="true" />
                <span>Return to Branch Directory</span>
              </Link>
            </div>
          </div>
        </section>
      ) : branch && initialFormValues ? (
        /* 3. Populated Edit Branch Form */
        <BranchForm
          mode="edit"
          initialValues={initialFormValues}
          branchStatus={branch.status}
          onSubmit={handleEditSubmit}
          onCancel={handleCancel}
          onSuccessNavigate={handleSuccessNavigate}
        />
      ) : null}
    </div>
  );
}

