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
  TriangleAlert,
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
import {
  isActiveJob,
  isToday,
  useCourierData,
  useCourierSummary,
  useFilteredCourierJobs,
} from '@/hooks/api/use-courier';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending (new or accepted)' },
  { value: 'IN_TRANSIT', label: 'In transit' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'FAILED', label: 'Failed' },
] as const;

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const filterInputStyle: React.CSSProperties = {
  padding: '0.5rem 0.65rem',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  color: '#0f172a',
  fontSize: '0.85rem',
};

const filterLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 600,
  color: '#64748b',
  marginBottom: '0.25rem',
  textTransform: 'uppercase',
};

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

  // Counts and workload come from the backend summary; the status/date filter is applied on the server.
  const summaryQuery = useCourierSummary();
  const summary = summaryQuery.data;
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>(todayIso());
  const [toDate, setToDate] = useState<string>(todayIso());
  const dateRangeInvalid = Boolean(fromDate && toDate && toDate < fromDate);
  const filtered = useFilteredCourierJobs({
    status: statusFilter,
    from: fromDate || undefined,
    to: toDate || undefined,
  });

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
  const loadActive = summary?.activeWorkload ?? activeJobs.length;
  const loadMax = summary?.maxConcurrent ?? (profile.maxCapacity || 1);
  const capacityPct =
    summary?.workloadPercent ?? Math.min(100, Math.round((activeJobs.length / (profile.maxCapacity || 1)) * 100));

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
              {loadActive} / {loadMax} Orders ({capacityPct}%)
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
          label="Assigned Today"
          value={summary ? summary.totalAssigned : assignedDeliveriesCount}
          hint={`${summary ? summary.inProgress : activeJobs.length} on the road · ${newJobs.length} awaiting acceptance`}
          icon={<Package size={18} />}
          iconBg="#eff6ff"
          iconColor="#2563eb"
        />
        <StatCard
          label="Pending"
          value={summary ? summary.pending : pendingPickupsCount}
          hint="Assigned or accepted, not yet collected"
          icon={<Clock size={18} />}
          iconBg="#fffbeb"
          iconColor="#d97706"
        />
        <StatCard
          label="Completed Today"
          value={summary ? summary.completed : deliveredToday.length}
          hint={`${completedDeliveries.length} delivered in total · ${formatLkr(earningsToday)} earned today`}
          icon={<CheckCircle2 size={18} />}
          iconBg="#f0fdf4"
          iconColor="#16a34a"
        />
        <StatCard
          label="Failed Today"
          value={summary ? summary.failed : finishedToday.length - deliveredToday.length}
          hint="Failed attempts reported today"
          icon={<TriangleAlert size={18} />}
          iconBg="#fef2f2"
          iconColor="#dc2626"
        />
      </section>

      {summaryQuery.isError && (
        <p role="alert" style={{ margin: 0, fontSize: '0.8125rem', color: '#b45309', fontWeight: 600 }}>
          Live counts could not be loaded, so the numbers shown are calculated from your task list.{' '}
          <button
            type="button"
            onClick={() => summaryQuery.refetch()}
            style={{ border: 0, background: 'none', color: '#2563eb', fontWeight: 700, cursor: 'pointer', padding: 0 }}
          >
            Try again
          </button>
        </p>
      )}

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

      {/* 6b. Deliveries filtered by status and assigned date (server side) */}
      <section className="dispatcher-table-card" aria-label="My deliveries with filters">
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>My Deliveries</h2>
          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.2rem 0 0.9rem' }}>
            Filter by status and the date the delivery was assigned. Select a row to see its details.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', alignItems: 'flex-end' }}>
            <div>
              <label style={filterLabelStyle} htmlFor="courier-flt-status">
                Status
              </label>
              <select
                id="courier-flt-status"
                style={filterInputStyle}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUS_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={filterLabelStyle} htmlFor="courier-flt-from">
                From
              </label>
              <input
                id="courier-flt-from"
                type="date"
                style={filterInputStyle}
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <label style={filterLabelStyle} htmlFor="courier-flt-to">
                To
              </label>
              <input
                id="courier-flt-to"
                type="date"
                style={filterInputStyle}
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setStatusFilter('ALL');
                setFromDate('');
                setToDate('');
              }}
            >
              Show all dates
            </button>
          </div>
        </div>

        {dateRangeInvalid ? (
          <p role="alert" style={{ padding: '1rem 1.25rem', margin: 0, color: '#b45309', fontWeight: 600 }}>
            The end date must not be before the start date.
          </p>
        ) : filtered.isLoading ? (
          <p style={{ padding: '1.25rem', margin: 0, color: '#64748b' }}>Loading deliveries…</p>
        ) : filtered.isError ? (
          <p role="alert" style={{ padding: '1.25rem', margin: 0, color: '#dc2626', fontWeight: 600 }}>
            {filtered.error instanceof Error ? filtered.error.message : 'Could not load your deliveries.'}{' '}
            <button
              type="button"
              onClick={() => filtered.refetch()}
              style={{ border: 0, background: 'none', color: '#2563eb', fontWeight: 700, cursor: 'pointer', padding: 0 }}
            >
              Try again
            </button>
          </p>
        ) : (
          <div className="dispatcher-table-wrapper">
            <table className="dispatcher-table">
              <thead>
                <tr>
                  <th>Tracking / Order</th>
                  <th>Recipient &amp; Address</th>
                  <th>Assigned</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(filtered.data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      No deliveries match these filters.
                    </td>
                  </tr>
                ) : (
                  (filtered.data ?? []).map((job) => (
                    <tr key={job.assignmentId}>
                      <td>
                        <Link
                          href={`/courier/deliveries/${encodeURIComponent(job.assignmentId)}`}
                          style={{ fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}
                        >
                          {job.trackingNumber}
                        </Link>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Order {job.orderId}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#334155' }}>{job.recipient.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {job.recipient.address}, {job.recipient.city}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8125rem', color: '#475569' }}>{formatDateTime(job.assignedAt)}</span>
                      </td>
                      <td>
                        <JobStatusBadge status={job.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
