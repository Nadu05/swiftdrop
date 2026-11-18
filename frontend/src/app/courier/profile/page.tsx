'use client';

import type { ReactNode } from 'react';
import { Bike, Building2, Phone } from 'lucide-react';
import AvailabilityToggle from '@/components/courier/AvailabilityToggle';
import { ErrorState, Field, LoadingState, PageHeader, hasValue } from '@/components/courier/CourierUI';
import { useCourierData } from '@/hooks/api/use-courier';

/**
 * Courier Profile (/courier/profile): read-only courier details plus the availability switch.
 * Vehicle, documents and branch are changed by branch staff, not by the courier.
 */
export default function CourierProfilePage() {
  const { profile, setProfile, loading, error, reload } = useCourierData();

  if (loading && !profile) return <LoadingState text="Loading your profile…" />;
  if (error || !profile) return <ErrorState message={error ?? 'Could not load your profile.'} onRetry={reload} />;

  const initials = profile.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="cp-page">
      <PageHeader title="My Profile" subtitle="Your courier details and availability" />

      <section className="cp-card cp-row cp-row--between" aria-label="Courier summary">
        <div className="cp-row">
          <span className="cp-avatar" aria-hidden="true">
            {initials}
          </span>
          <div>
            <div className="cp-strong">{profile.name}</div>
            <div className="cp-muted cp-small">
              {profile.courierCode}
              {profile.rating > 0 ? ` · ${profile.rating.toFixed(1)} ★ rating` : ''}
            </div>
          </div>
        </div>
        <AvailabilityToggle profile={profile} onChange={setProfile} />
      </section>

      <div className="cp-grid-3">
        <InfoCard icon={<Phone size={16} />} title="Contact">
          <Field label="Phone">{profile.phone}</Field>
          {hasValue(profile.email) && <Field label="Email">{profile.email}</Field>}
        </InfoCard>
        <InfoCard icon={<Bike size={16} />} title="Vehicle">
          <Field label="Type">{profile.vehicleType}</Field>
          <Field label="Registration">{profile.vehiclePlate}</Field>
          <Field label="Max parcels at once">{profile.maxCapacity}</Field>
        </InfoCard>
        <InfoCard icon={<Building2 size={16} />} title="Branch">
          <Field label="Assigned branch">{profile.branchName}</Field>
          {hasValue(profile.zone) && <Field label="Service zone">{profile.zone}</Field>}
        </InfoCard>
      </div>

      <p className="cp-hint">To change your vehicle, documents or branch, contact your branch dispatcher.</p>
    </div>
  );
}

function InfoCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="cp-card cp-card--stack">
      <div className="cp-row">
        <span className="cp-stat__icon cp-tone--info" aria-hidden="true">
          {icon}
        </span>
        <h2 className="cp-section__title">{title}</h2>
      </div>
      {children}
    </section>
  );
}
