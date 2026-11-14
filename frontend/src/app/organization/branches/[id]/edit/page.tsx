'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import BranchForm from '@/components/organization/branches/BranchForm';
import { useBranch, useUpdateBranch } from '@/hooks/api/use-organization';
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
 * Loads an existing branch via `GET /api/v1/organization/branches/{id}` using TanStack Query
 * and submits partial updates via `PATCH /api/v1/organization/branches/{id}`.
 */
export default function EditBranchPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const rawId = params?.id ?? '';
  const numericId = Number(rawId);
  const isValidBranchId = Number.isInteger(numericId) && numericId > 0;

  const {
    data: branch,
    isLoading: isQueryLoading,
    error: queryError,
    refetch,
  } = useBranch(numericId);

  const updateMutation = useUpdateBranch();

  const isLoading = isValidBranchId && isQueryLoading;

  const loadError = !isValidBranchId
    ? `Invalid branch ID "${rawId}". Branch ID must be a positive integer.`
    : queryError
    ? queryError instanceof Error
      ? queryError.message
      : `Unable to load branch #${numericId} from the Organization Service.`
    : null;

  const initialFormValues = useMemo(
    () => (branch ? branchResponseToFormValues(branch) : undefined),
    [branch]
  );

  const handleEditSubmit = async (
    values: BranchFormValues
  ): Promise<BranchResponse> => {
    const payload = toBranchUpdatePayload(values);
    return updateMutation.mutateAsync({ id: numericId, payload });
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

  const fetchBranch = () => {
    refetch();
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

