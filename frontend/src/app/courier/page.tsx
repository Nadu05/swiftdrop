'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  Clock,
  Compass,
  Navigation,
  Package,
  Star,
  Wallet,
} from 'lucide-react';
import AssignedJobCard from '@/components/courier/AssignedJobCard';
import AvailabilityToggle from '@/components/courier/AvailabilityToggle';
import {
  EmptyState,
  ErrorState,
  JobStatusBadge,
  LoadingState,
  StatCard,
  formatLkr,
  formatTime,
} from '@/components/courier/CourierUI';
import OverviewHeader from '@/components/dispatcher/overview/OverviewHeader';
import { isActiveJob, isToday, useCourierData } from '@/hooks/api/use-courier';

export default function CourierDashboardPage() {
  const { profile, setProfile, jobs, replaceJob, loading, error, reload } = useCourierData();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await reload();
    } finally {
      setIsRefreshing(false);
    }
  };

  const activeJobs = useMemo(() => jobs.filter(isActiveJob), [jobs]);
  const newJobs = useMemo(() => jobs.filter((j) => j.status === 'ASSIGNED'), [jobs]);
  const assignedDeliveriesCount = newJobs.length + activeJobs.length;

  const pendingPickupsCount = useMemo(
    () =>
      jobs.filter(
        (j) =>
          (j.taskType === 'PICKUP' || j.status === 'ASSIGNED') &&
          (j.status === 'ASSIGNED' || isActiveJob(j))
      ).length,
    [jobs]
  );

  const completedDeliveries = useMemo(
    () => jobs.filter((j) => j.status === 'DELIVERED'),
    [jobs]
  );

  const finishedToday = useMemo(
    () =>
      jobs.filter(
        (j) => (j.status === 'DELIVERED' || j.status === 'FAILED') && isToday(j.completedAt)
      ),
    [jobs]
  );

  const deliveredToday = useMemo(
    () => finishedToday.filter((j) => j.status === 'DELIVERED'),
    [finishedToday]
  );

  const earningsToday = useMemo(
    () => deliveredToday.reduce((sum, j) => sum + j.payoutLkr, 0),
    [deliveredToday]
  );

  if (loading && !profile) return <LoadingState text="Loading your courier dashboard…" />;
  if (error || !profile)
    return (
      <ErrorState
        message={error ?? 'Could not load your courier dashboard from Dispatch Service.'}
        onRetry={reload}
      />
    );

  const online = profile.status !== 'OFFLINE';
  const capacityPct = Math.min(
    100,
    Math.round((activeJobs.length / (profile.maxCapacity || 1)) * 100)
  );

  return (
    <div className="dispatcher-overview">
      {/* 1. Header — matches OverviewHeader design system class pattern */}
      <header className="dispatcher-overview__header">
        <div className="dispatcher-overview__title-group">
          <h1 className="dispatcher-overview__title">Courier Operations Dashboard</h1>
          <p className="dispatcher-overview__subtitle">
            Welcome back, {profile.name} · {profile.courierCode} · {profile.branchName}
          </p>
        </div>

        <div className="dispatcher-overview__actions">
          <div className="dispatcher-overview__date-badge" title="Current operations date">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="dispatcher-overview__date-icon"
              aria-hidden="true"
            >
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
              <line x1="16" x2="16" y1="2" y2="6" />
              <line x1="8" x2="8" y1="2" y2="6" />
              <line x1="3" x2="21" y1="10" y2="10" />
            </svg>
            <span>
              {new Intl.DateTimeFormat('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              }).format(new Date())}
            </span>
          </div>

          <button
            type="button"
            className="dispatcher-overview__refresh-btn"
            onClick={handleManualRefresh}
            disabled={isRefreshing || loading}
            aria-label="Refresh dashboard data"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`dispatcher-overview__refresh-icon ${
                isRefreshing ? 'dispatcher-overview__refresh-icon--spinning' : ''
              }`}
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
            <span>{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>

          <AvailabilityToggle profile={profile} onChange={setProfile} />
        </div>
      </header>

      {/* 2. Courier Status & Vehicle Strip — using design system surface card style */}
      <section className="dispatcher-table-card" aria-label="Courier status details">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '0.85rem 1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Vehicle badge */}
            <span className="sd-badge sd-badge--info">
              <Bike size={13} style={{ marginRight: '0.3rem' }} />
              {profile.vehicleType}
              {profile.vehiclePlate ? ` · ${profile.vehiclePlate}` : ''}
            </span>

            {/* Hub badge */}
            <span className="sd-badge sd-badge--success">
              <Compass size={13} style={{ marginRight: '0.3rem' }} />
              Hub: {profile.branchName}
            </span>

            {/* Online/Offline status */}
            <span
              className={`sd-badge ${
                online
                  ? 'sd-badge--success'
                  : 'sd-badge--neutral'
              }`}
            >
              {online ? 'Online & Available' : 'Offline'}
            </span>
          </div>

          {/* Capacity bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem' }}>
              <span className="dispatcher-stats-card__title" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Load Capacity
              </span>
              <span style={{ fontSize: '0.8125rem', color: '#0f172a', fontWeight: 700 }}>
                {activeJobs.length} / {profile.maxCapacity} ({capacityPct}%)
              </span>
            </div>
            <div
              style={{
                width: '80px',
                height: '8px',
                background: '#e2e8f0',
                borderRadius: '999px',
                overflow: 'hidden',
              }}
              title={`Capacity: ${capacityPct}%`}
            >
              <div
                style={{
                  width: `${capacityPct}%`,
                  height: '100%',
                  background:
                    capacityPct > 80 ? '#ef4444' : capacityPct > 50 ? '#f59e0b' : '#2563eb',
                  borderRadius: '999px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Primary Operational Metrics Grid (4 KPI Cards) */}
      <section className="dispatcher-stats-grid" aria-label="Key courier metrics">
        <StatCard
          label="Assigned Deliveries"
          value={assignedDeliveriesCount}
          hint={`${newJobs.length} awaiting acceptance · ${activeJobs.length} en route`}
          icon={<Package size={18} />}
          iconBg="#eff6ff"
          iconColor="#2563eb"
        />
        <StatCard
          label="Pending Pickups"
          value={pendingPickupsCount}
          hint="Origin merchant & branch pickups"
          icon={<Clock size={18} />}
          iconBg="#fffbeb"
          iconColor="#d97706"
        />
        <StatCard
          label="Deliveries In Progress"
          value={`${activeJobs.length} / ${profile.maxCapacity}`}
          hint="Active parcels currently in transit"
          icon={<Navigation size={18} />}
          iconBg="#eef2ff"
          iconColor="#4f46e5"
        />
        <StatCard
          label="Completed Deliveries"
          value={completedDeliveries.length}
          hint={`${deliveredToday.length} completed today · ${formatLkr(earningsToday)}`}
          icon={<CheckCircle2 size={18} />}
          iconBg="#f0fdf4"
          iconColor="#16a34a"
        />
      </section>

      {/* 4. Secondary Performance Summary Cards */}
      <section className="dispatcher-stats-grid" aria-label="Courier performance summary">
        <StatCard
          label="Today's Payout Earnings"
          value={formatLkr(earningsToday)}
          hint={`Earned across ${deliveredToday.length} successfully delivered parcel(s) today`}
          icon={<Wallet size={18} />}
          iconBg="#f0fdf4"
          iconColor="#059669"
        />
        <StatCard
          label="Courier Service Rating"
          value={`${profile.rating.toFixed(1)} ★`}
          hint={`Branch fleet rating · Branch: ${profile.branchName}`}
          icon={<Star size={18} />}
          iconBg="#f5f3ff"
          iconColor="#7c3aed"
        />
      </section>

      {/* 5. Deliveries In Progress (Active Jobs) */}
      {activeJobs.length > 0 && (
        <section
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          aria-label="Active deliveries in progress"
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 className="dispatcher-overview__title" style={{ fontSize: '1.1rem', margin: 0 }}>
                  Deliveries In Progress ({activeJobs.length})
                </h2>
                <span className="sd-badge sd-badge--info">ACTIVE</span>
              </div>
              <p className="dispatcher-overview__subtitle" style={{ margin: '0.2rem 0 0' }}>
                Jobs you have accepted and are currently executing on your route.
              </p>
            </div>

            <Link
              href="/courier/active"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: '#2563eb',
                fontSize: '0.8125rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Open Active Delivery View <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {activeJobs.map((job) => (
              <AssignedJobCard
                key={job.assignmentId}
                job={job}
                canAccept={online}
                onUpdated={replaceJob}
              />
            ))}
          </div>
        </section>
      )}

      {/* 6. Delivery Task List (New Assignments) */}
      <section
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        aria-label="New delivery assignments"
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 className="dispatcher-overview__title" style={{ fontSize: '1.1rem', margin: 0 }}>
                Delivery Task List — New Assignments ({newJobs.length})
              </h2>
              {newJobs.length > 0 && (
                <span className="sd-badge sd-badge--warning">NEW</span>
              )}
            </div>
            <p className="dispatcher-overview__subtitle" style={{ margin: '0.2rem 0 0' }}>
              Jobs your branch dispatcher has assigned to you awaiting acceptance.
            </p>
          </div>

          <Link
            href="/courier/deliveries"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: '#2563eb',
              fontSize: '0.8125rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            All deliveries ({assignedDeliveriesCount}) <ArrowRight size={14} />
          </Link>
        </div>

        {newJobs.length === 0 ? (
          <EmptyState
            text={
              online
                ? 'No new assignments right now. Your branch dispatcher will assign a parcel soon.'
                : 'You are currently offline. Switch status to Online & Available to receive jobs.'
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {newJobs.map((job) => (
              <AssignedJobCard
                key={job.assignmentId}
                job={job}
                canAccept={online}
                onUpdated={replaceJob}
              />
            ))}
          </div>
        )}
      </section>

      {/* 7. Completed & Finished Today Summary Table */}
      <section className="dispatcher-table-card" aria-label="Completed today table">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #e2e8f0',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Completed &amp; Finished Today ({finishedToday.length})
            </h2>
            <p className="dispatcher-overview__subtitle" style={{ margin: '0.2rem 0 0' }}>
              Delivered and processed parcels from your shifts today.
            </p>
          </div>

          <Link
            href="/courier/history"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              color: '#2563eb',
              fontSize: '0.8125rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            View Job History <ArrowRight size={13} />
          </Link>
        </div>

        <div className="dispatcher-table-wrapper">
          <table className="dispatcher-table">
            <thead>
              <tr>
                <th>Tracking / Parcel ID</th>
                <th>Destination &amp; Route</th>
                <th>Completion Time</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Payout Earned</th>
              </tr>
            </thead>
            <tbody>
              {finishedToday.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No completed jobs yet today. Accepted deliveries will appear here upon completion.
                  </td>
                </tr>
              ) : (
                finishedToday.map((job) => (
                  <tr key={job.assignmentId}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{job.trackingNumber}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {job.merchantName}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#334155' }}>
                        {job.recipient.city}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {job.recipient.address}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8125rem', color: '#475569' }}>
                        {formatTime(job.completedAt)}
                      </span>
                    </td>
                    <td>
                      <JobStatusBadge status={job.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          color: job.status === 'DELIVERED' ? '#059669' : '#94a3b8',
                        }}
                      >
                        {job.status === 'DELIVERED' ? formatLkr(job.payoutLkr) : '—'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
