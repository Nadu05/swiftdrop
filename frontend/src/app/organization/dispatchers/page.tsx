'use client';

import Link from 'next/link';
import { Building2, Headphones, Plus } from 'lucide-react';
import BranchDispatchersTab from '@/components/organization/branches/BranchDispatchersTab';

export default function OrganizationDispatchersPage() {
  return (
    <div className="org-page">
      <header className="org-page-header">
        <div className="org-page-header__titles">
          <p className="org-page-header__eyebrow">Admin / Dispatcher Management</p>
          <h1 className="org-page-header__title">Branch Dispatchers</h1>
          <p className="org-page-header__subtitle">
            Supervise stationed dispatchers, active shift status, order allocations, and courier
            supervision across SwiftDrop regional branches.
          </p>
        </div>

        <div className="org-page-header__actions">
          <Link
            href="/organization/branches"
            className="org-btn org-btn--secondary"
          >
            <Building2 size={14} aria-hidden="true" />
            <span>Branch Directory</span>
          </Link>
        </div>
      </header>

      <BranchDispatchersTab />
    </div>
  );
}

