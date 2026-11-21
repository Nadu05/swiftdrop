'use client';

import { Bike, Building2, Mail, Phone, Star } from 'lucide-react';
import AvailabilityToggle from '@/components/courier/AvailabilityToggle';
import { ErrorState, Field, LoadingState, PageHeader } from '@/components/courier/CourierUI';
import { useCourierData } from '@/hooks/api/use-courier';

/**
 * Member 08: Courier Profile
 * Route: /courier/profile
 *
 * Read-only courier details and availability management.
 */
export default function CourierProfilePage() {
  const { profile, setProfile, loading, error, reload } = useCourierData();

  if (loading && !profile) return <LoadingState text="Loading your profile…" />;
  if (error || !profile) return <ErrorState message={error ?? 'Could not load your profile.'} onRetry={reload} />;

  const initials = profile.name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <PageHeader
        title="Courier Profile"
        subtitle="Operational profile details, assigned fleet vehicle, and duty availability"
      />

      {/* Hero profile card */}
      <section
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          flexWrap: 'wrap',
          background: 'var(--ds-surface, #ffffff)',
          border: '1px solid var(--ds-border, #e2e8f0)',
          borderRadius: '14px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              color: '#ffffff',
              fontSize: '1.15rem',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
            }}
            aria-hidden="true"
          >
            {initials}
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              {profile.name}
            </div>
            <div
              style={{
                fontSize: '0.85rem',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                marginTop: '0.15rem',
              }}
            >
              <span style={{ fontWeight: 600, color: '#2563eb' }}>{profile.courierCode}</span> ·{' '}
              <Star size={14} color="#d97706" fill="#f59e0b" />{' '}
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{profile.rating.toFixed(1)}</span> ·{' '}
              <span>Branch: {profile.branchName}</span>
            </div>
          </div>
        </div>
        <AvailabilityToggle profile={profile} onChange={setProfile} />
      </section>

      {/* Profile Detail Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
        }}
      >
        <InfoCard icon={<Phone size={18} color="#2563eb" />} title="Contact Details">
          <Field label="Phone Number">{profile.phone}</Field>
          <Field label="Email Address">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Mail size={14} color="#64748b" /> {profile.email}
            </span>
          </Field>
        </InfoCard>

        <InfoCard icon={<Bike size={18} color="#059669" />} title="Assigned Fleet Vehicle">
          <Field label="Vehicle Type">{profile.vehicleType}</Field>
          <Field label="License Plate">{profile.vehiclePlate || 'Assigned'}</Field>
          <Field label="Max Parcel Capacity">{profile.maxCapacity} simultaneous packages</Field>
        </InfoCard>

        <InfoCard icon={<Building2 size={18} color="#7c3aed" />} title="Branch & Coverage Area">
          <Field label="Operating Branch">{profile.branchName}</Field>
          <Field label="Assigned Zone">{profile.zone}</Field>
        </InfoCard>
      </div>

      <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>
        To update your vehicle assignment, documents, or branch transfer, please contact your branch dispatcher.
      </p>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        background: 'var(--ds-surface, #ffffff)',
        border: '1px solid var(--ds-border, #e2e8f0)',
        borderRadius: '14px',
        padding: '1.35rem',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{title}</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>{children}</div>
    </article>
  );
}
