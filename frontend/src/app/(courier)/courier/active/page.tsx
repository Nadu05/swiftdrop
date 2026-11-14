import { Suspense } from 'react';
import type { Metadata } from 'next';
import ActiveDelivery from '@/components/courier/active/ActiveDelivery';
import { LoadingState } from '@/components/courier/CourierUI';

export const metadata: Metadata = { title: 'Active Delivery' };

/** Member 08: Active Delivery — /courier/active (optional ?job=<assignmentId>) */
export default function ActiveDeliveryPage() {
  // useSearchParams in the client view needs a Suspense boundary.
  return (
    <Suspense fallback={<LoadingState text="Loading your delivery…" />}>
      <ActiveDelivery />
    </Suspense>
  );
}
