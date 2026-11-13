'use client';

import { Bike, Building2, Mail, Phone, Star } from 'lucide-react';
import AvailabilityToggle from '@/components/courier/AvailabilityToggle';
import { ErrorState, Field, LoadingState, PageHeader } from '@/components/courier/CourierUI';
import { useCourierData } from '@/hooks/api/use-courier';

/**
 * Member 08: Courier Profile
 * Route: /courier/profile
 *
 * Read-only courier details (owned by dispatch-service / identity-service) and
 * the availability switch. Editing vehicle or documents is done by the branch.
 */
export default function CourierProfilePage() {
  const { profile, setProfile, loading, error, reload } = useCourierData();

  if (loading && !profile) return <LoadingState text="Loading your profile…" />;
  if (error || !profile) return <ErrorState message={error ?? 'Could not load your profile.'} onRetry={reload} />;

  const initials = profile.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <PageHeader title="My Profile" subtitle="Your courier details and availability" />

      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              color: '#ffffff',
              fontSize: '1.1rem',
            }}
            aria-hidden="true"
          >
            {initials}
          </div>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>{profile.name}</div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {profile.courierCode} · <Star size={14} color="#fbbf24" /> {profile.rating.toFixed(1)}
            </div>
          </div>
        </div>
        <AvailabilityToggle profile={profile} onChange={setProfile} />
      </div>

      <div className="grid-cols-3">
        <InfoCard icon={<Phone size={18} color="#3b82f6" />} title="Contact">
          <Field label="Phone">{profile.phone}</Field>
          <Field label="Email">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Mail size={14} /> {profile.email}
            </span>
          </Field>
        </InfoCard>
        <InfoCard icon={<Bike size={18} color="#10b981" />} title="Vehicle">
          <Field label="Type">{profile.vehicleType}</Field>
          <Field label="Registration">{profile.vehiclePlate}</Field>
          <Field label="Max parcels at once">{profile.maxCapacity}</Field>
        </InfoCard>
        <InfoCard icon={<Building2 size={18} color="#8b5cf6" />} title="Branch">
          <Field label="Assigned branch">{profile.branchName}</Field>
          <Field label="Service zone">{profile.zone}</Field>
        </InfoCard>
      </div>

      <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
        To change your vehicle, documents or branch, contact your branch dispatcher.
      </p>
    </div>
  );
}

function InfoCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        {icon}
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}
