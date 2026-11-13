'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import BranchForm from '@/components/organization/branches/BranchForm';
import { createBranch } from '@/api/services/organization.api';
import {
  DEFAULT_BRANCH_FORM_VALUES,
  toBranchCreatePayload,
  type BranchFormValues,
} from '@/schema/branch.schema';
import type { BranchResponse } from '@/types/organization.types';

/**
 * Create Branch Page (/organization/branches/create)
 * Member 04 — Organization Admin UI (Phase 2)
 *
 * Submits validated branch data to `POST /api/v1/organization/branches`.
 */
export default function CreateBranchPage() {
  const router = useRouter();

  const handleCreateSubmit = async (
    values: BranchFormValues
  ): Promise<BranchResponse> => {
    const payload = toBranchCreatePayload(values);
    return createBranch(payload);
  };

  const handleCancel = () => {
    router.push('/organization/branches');
  };

  const handleSuccessNavigate = (savedBranch: BranchResponse) => {
    router.push(
      `/organization/branches?created=${encodeURIComponent(savedBranch.code)}`
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

      {/* Page Heading */}
      <header className="org-page-header">
        <div className="org-page-header__titles">
          <p className="org-page-header__eyebrow">
            Admin / Branch Directory / Create New Branch
          </p>
          <h1 className="org-page-header__title">Create New Branch</h1>
          <p className="org-page-header__subtitle">
            Register a new regional branch hub in the SwiftDrop Organization Service. New
            branches are created with an Active operational status by default.
          </p>
        </div>
      </header>

      {/* Branch Creation Form */}
      <BranchForm
        mode="create"
        initialValues={DEFAULT_BRANCH_FORM_VALUES}
        onSubmit={handleCreateSubmit}
        onCancel={handleCancel}
        onSuccessNavigate={handleSuccessNavigate}
      />
    </div>
  );
}

