import React from 'react';
import CustomerSidebar from '@/components/customer/CustomerSidebar';

/**
 * CustomerShell layout wrapper
 * 
 * Provides the dedicated Customer Role experience across all customer pages:
 * - Customer Dashboard (/customer/dashboard)
 * - Booking Form (/book, /book/confirmation)
 * - Customer Bookings & History (/bookings, /bookings/[id], /bookings/[id]/receipt)
 * - Live Tracking (/tracking)
 * - Customer Profile (/customer/profile)
 *
 * Keeps the dedicated Customer Navigation persistently accessible on both
 * desktop and mobile screens.
 */
export default function CustomerShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="customer-app-shell">
      <CustomerSidebar />
      <main className="main-content customer-main-content">
        {children}
      </main>
    </div>
  );
}
