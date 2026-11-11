import React from 'react';
import Sidebar from '@/components/Sidebar';

/**
 * CustomerShell layout wrapper
 * 
 * Ensures that the SwiftDrop sidebar navigation remains persistently visible
 * across all customer pages (Dashboard, Deliveries/Bookings, Booking form,
 * Tracking, and Customer Profile).
 */
export default function CustomerShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content customer-main-content">
        {children}
      </main>
    </div>
  );
}

