'use client';

import Link from 'next/link';
import { Building2, Users } from 'lucide-react';
import BranchUsersTab from '@/components/organization/branches/BranchUsersTab';

export default function OrganizationUsersPage() {
  return (
    <div className="org-page">
      <header className="org-page-header">
        <div className="org-page-header__titles">
          <p className="org-page-header__eyebrow">Admin / User Directory</p>
          <h1 className="org-page-header__title">Branch Users (Merchants &amp; Customers)</h1>
          <p className="org-page-header__subtitle">
            View commercial merchant partners and registered retail customers served across SwiftDrop
            regional branches and districts.
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

      <BranchUsersTab />
    </div>
  );
}

