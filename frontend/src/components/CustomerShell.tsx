'use client';

import React from 'react';
import CustomerSidebar from '@/components/customer/CustomerSidebar';
import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar';
import '@/app/customer/customer.css';

/**
 * CustomerShell layout wrapper
 *
 * Provides the dedicated Customer Role experience across customer pages:
 * - Customer Dashboard (/customer/dashboard)
 * - Booking Form (/book, /book/confirmation)
 * - Customer Bookings & History (/bookings, /bookings/[id], /bookings/[id]/receipt)
 * - Live Tracking (/tracking)
 * - Customer Profile (/customer/profile)
 */
export default function CustomerShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="customer-app-shell">
      <CustomerSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardTopBar portalLabel="Customer Portal" theme="light" />
        <main className="main-content customer-main-content flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
