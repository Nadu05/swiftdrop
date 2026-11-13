'use client';

import type { ReactNode } from 'react';
import { Bike, Building2, Phone, Star } from 'lucide-react';
import { useCourierProfile } from '@/hooks/api/use-courier';
import AvailabilityToggle from '../AvailabilityToggle';
import { ErrorState, Field, LoadingState, PageHeader, errorMessage } from '../CourierUI';

/**
 * Read-only courier details plus the availability switch. Vehicle, documents
 * and branch are changed by branch staff, not by the courier.
 */
export default function CourierProfileView() {
  const profileQuery = useCourierProfile();

  if (profileQuery.isPending) return <LoadingState text="Loading your profile…" />;
  if (profileQuery.isError) return <ErrorState message={errorMessage(profileQuery.error, 'Could not load your profile.')} onRetry={() => profileQuery.refetch()} />;

  const profile = profileQuery.data;
  const initials = profile.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);

  return (
    <div className="courier-page">
      <PageHeader title="My Profile" subtitle="Your courier details and availability" />

      <section className="glass-card courier-row courier-row--between" aria-label="Courier summary">
        <div className="courier-row">
          <span className="courier-avatar" aria-hidden="true">
            {initials}
          </span>
          <div>
            <p className="courier-profile__name">{profile.name}</p>
            <p className="courier-profile__meta">
              {profile.courierCode} · <Star size={14} className="courier-icon--warning" aria-hidden="true" /> {profile.rating.toFixed(1)} rating
            </p>
          </div>
        </div>
        <AvailabilityToggle profile={profile} />
      </section>

      <div className="grid-cols-3">
        <InfoCard icon={<Phone size={18} className="courier-icon--primary" aria-hidden="true" />} title="Contact">
          <Field label="Phone">{profile.phone}</Field>
          <Field label="Email">{profile.email}</Field>
        </InfoCard>
        <InfoCard icon={<Bike size={18} className="courier-icon--success" aria-hidden="true" />} title="Vehicle">
          <Field label="Type">{profile.vehicleType}</Field>
          <Field label="Registration">{profile.vehiclePlate}</Field>
          <Field label="Max parcels at once">{profile.maxCapacity}</Field>
        </InfoCard>
        <InfoCard icon={<Building2 size={18} className="courier-icon--purple" aria-hidden="true" />} title="Branch">
          <Field label="Assigned branch">{profile.branchName}</Field>
          <Field label="Service zone">{profile.zone}</Field>
        </InfoCard>
      </div>

      <p className="courier-hint">To change your vehicle, documents or branch, contact your branch dispatcher.</p>
    </div>
  );
}

function InfoCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="glass-card courier-stack">
      <div className="courier-row">
        {icon}
        <h2 className="courier-card-title">{title}</h2>
      </div>
      {children}
    </section>
  );
}
