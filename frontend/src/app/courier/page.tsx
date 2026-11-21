'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bike,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Navigation,
  Package,
  RefreshCw,
  Star,
  Truck,
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
  formatDateTime,
  formatLkr,
  formatTime,
} from '@/components/courier/CourierUI';
import { isActiveJob, isToday, useCourierData } from '@/hooks/api/use-courier';

/**
 * SwiftDrop Courier Operations Dashboard
 * Routes: /courier/dashboard & /courier
 *
 * Displays:
 * - Operational Header with Date & Live Refresh
 * - Status & Vehicle Operations Strip
 * - Primary Operational Metrics (Assigned, Pickups, In Transit, Completed)
 * - Secondary Performance & Payout Summary
 * - Deliveries in Progress (Active Execution)
 * - Delivery Task List (New Dispatch Assignments)
 * - Finished & Delivered Today Summary Table
 */
export default function CourierDashboardPage() {
  const { profile, setProfile, jobs, replaceJob, loading, error, reload } = useCourierData();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [currentDate] = useState(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date());
  });

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
      {/* 1. Header with Title & Live Refresh / Date / Availability Action */}
      <header className="dispatcher-overview__header">
        <div className="dispatcher-overview__title-group">
          <h1 className="dispatcher-overview__title">Courier Operations Dashboard</h1>
          <p className="dispatcher-overview__subtitle">
            Welcome back, {profile.name} · {profile.courierCode} · {profile.branchName}
          </p>
        </div>

        <div className="dispatcher-overview__actions">
          <div className="dispatcher-overview__date-badge" title="Current operations date">
            <Calendar size={15} className="dispatcher-overview__date-icon" aria-hidden="true" />
            <span>{currentDate}</span>
          </div>

          <button
            type="button"
            className="dispatcher-overview__refresh-btn"
            onClick={handleManualRefresh}
            disabled={isRefreshing || loading}
            aria-label="Refresh dashboard data"
          >
            <RefreshCw
              size={14}
              className={`dispatcher-overview__refresh-icon ${
                isRefreshing ? 'dispatcher-overview__refresh-icon--spinning' : ''
              }`}
              aria-hidden="true"
            />
            <span>{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>

          <AvailabilityToggle profile={profile} onChange={setProfile} />
        </div>
      </header>

      {/* 2. Operations & Vehicle Status Attention Strip */}
      <section
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '0.85rem 1.25rem',
          background: 'var(--ds-surface, #ffffff)',
          border: '1px solid var(--ds-border, #e2e8f0)',
          borderRadius: '12px',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
        }}
        aria-label="Courier status details"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.3rem 0.65rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              color: '#334155',
              fontWeight: 600,
            }}
          >
            <Bike size={15} color="#2563eb" />
            <span>
              {profile.vehicleType} ({profile.vehiclePlate || 'Assigned'})
            </span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.3rem 0.65rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              color: '#334155',
              fontWeight: 600,
            }}
          >
            <Compass size={15} color="#059669" />
            <span>Hub: {profile.branchName}</span>
          </div>
        </div>

        {/* Capacity utilization indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Current Load Capacity
            </span>
            <span style={{ fontSize: '0.8125rem', color: '#0f172a', fontWeight: 700 }}>
              {activeJobs.length} / {profile.maxCapacity} Orders ({capacityPct}%)
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
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
        }}
        aria-label="Courier performance summary"
      >
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
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
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
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Deliveries In Progress ({activeJobs.length})
                </h2>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                  }}
                >
                  ACTIVE
                </span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.2rem 0 0' }}>
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
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
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
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Delivery Task List — New Assignments ({newJobs.length})
              </h2>
              {newJobs.length > 0 && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    background: '#fffbeb',
                    color: '#b45309',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                  }}
                >
                  NEW
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.2rem 0 0' }}>
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
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.2rem 0 0' }}>
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
