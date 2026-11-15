'use client';

import Link from 'next/link';
import { Building2, Truck } from 'lucide-react';
import BranchCouriersTab from '@/components/organization/branches/BranchCouriersTab';

export default function OrganizationCouriersPage() {
  return (
    <div className="org-page">
      <header className="org-page-header">
        <div className="org-page-header__titles">
          <p className="org-page-header__eyebrow">Admin / Fleet &amp; Couriers</p>
          <h1 className="org-page-header__title">Branch Couriers</h1>
          <p className="org-page-header__subtitle">
            Manage regional fleet couriers, vehicle assignments, active delivery status, and delivery
            performance across all SwiftDrop coverage zones.
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

      <BranchCouriersTab />
    </div>
  );
}

