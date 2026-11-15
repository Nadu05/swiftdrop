'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock, Gauge, Package, TriangleAlert, User, Wallet } from 'lucide-react';
import AssignedJobCard from '@/components/courier/AssignedJobCard';
import AvailabilityToggle from '@/components/courier/AvailabilityToggle';
import {
  EmptyState,
  ErrorState,
  JobStatusBadge,
  LoadingState,
  Notice,
  PageHeader,
  SectionHeader,
  StatCard,
  TaskTypeBadge,
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
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

/**
 * Courier dashboard (/courier, /courier/dashboard): availability, today's counts and workload from the
 * backend summary, the task in progress, new assignments and a deliveries list filtered by status and date.
 */
export default function CourierDashboardPage() {
  const { profile, setProfile, jobs, replaceJob, loading, error, reload } = useCourierData();
  const summaryQuery = useCourierSummary();
  const [status, setStatus] = useState<string>('ALL');
  const [from, setFrom] = useState<string>(todayIso());
  const [to, setTo] = useState<string>(todayIso());

  const dateRangeInvalid = Boolean(from && to && to < from);
  const filtered = useFilteredCourierJobs({ status, from: from || undefined, to: to || undefined });

  if (loading && !profile) return <LoadingState text="Loading your dashboard…" />;
  if (error || !profile) {
    return <ErrorState message={error ?? 'Could not load your dashboard. Please try again.'} onRetry={reload} />;
  }

  const online = profile.status !== 'OFFLINE';
  const summary = summaryQuery.data;
  const activeJobs = jobs.filter(isActiveJob);
  const newJobs = jobs.filter((j) => j.status === 'ASSIGNED');
  const finishedToday = jobs.filter((j) => (j.status === 'DELIVERED' || j.status === 'FAILED') && isToday(j.completedAt));
  const deliveredToday = finishedToday.filter((j) => j.status === 'DELIVERED');
  const earningsToday = deliveredToday.reduce((sum, j) => sum + j.payoutLkr, 0);
  const current = activeJobs[0];
  const level = summary?.workloadLevel ?? 'LOW';

  return (
    <div className="cp-page">
      <PageHeader
        title={`Welcome back, ${profile.name.split(' ')[0]}`}
        subtitle={`${profile.courierCode} · ${profile.branchName} · ${profile.vehicleType} ${profile.vehiclePlate}`}
        action={<AvailabilityToggle profile={profile} onChange={setProfile} />}
      />

      {summaryQuery.isError && (
        <Notice tone="error">
          Today&apos;s numbers could not be loaded.{' '}
          <button type="button" className="cp-link" onClick={() => summaryQuery.refetch()}>
            Try again
          </button>
        </Notice>
      )}

      <section className="cp-stats" aria-label="Today at a glance">
        <StatCard
          label="Assigned today"
          value={summary ? summary.totalAssigned : '—'}
          hint="Pending, on the road and finished today"
          icon={<Package size={16} />}
          tone="brand"
        />
        <StatCard
          label="Pending"
          value={summary ? summary.pending : '—'}
          hint={`${newJobs.length} waiting for you to accept`}
          icon={<Clock size={16} />}
          tone="warning"
        />
        <StatCard
          label="Completed"
          value={summary ? summary.completed : '—'}
          hint={formatLkr(earningsToday) + ' earned today'}
          icon={<CheckCircle2 size={16} />}
          tone="success"
        />
        <StatCard
          label="Failed"
          value={summary ? summary.failed : '—'}
          hint="Failed attempts reported today"
          icon={<TriangleAlert size={16} />}
          tone="error"
        />
      </section>

      <section className="cp-card cp-card--stack" aria-labelledby="cp-workload">
        <div className="cp-row cp-row--between">
          <h2 id="cp-workload" className="cp-section__title">
            <Gauge size={16} aria-hidden="true" /> Workload
          </h2>
          <span className={`cp-small ${level === 'HIGH' ? 'cp-text-error' : level === 'MEDIUM' ? 'cp-text-warning' : 'cp-muted'}`}>
            {summary ? `${summary.activeWorkload} of ${summary.maxConcurrent} tasks · ${level.toLowerCase()}` : 'Loading…'}
          </span>
        </div>
        <div
          className={`cp-meter cp-meter--${level.toLowerCase()}`}
          role="progressbar"
          aria-label="Workload"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={summary?.workloadPercent ?? 0}
        >
          <div className="cp-meter__fill" style={{ width: `${summary?.workloadPercent ?? 0}%` }} />
        </div>
        {level === 'HIGH' && <p className="cp-small cp-text-error">You are near your task limit. Finish a task before taking more.</p>}
      </section>

      {current && (
        <section className="cp-section" aria-labelledby="cp-current">
          <SectionHeader
            id="cp-current"
            title="Current task"
            subtitle={activeJobs.length > 1 ? `${activeJobs.length} tasks in progress` : 'The task you are working on'}
          />
          <div className="cp-card cp-row cp-row--between">
            <div className="cp-row">
              <span className="cp-job__id">{current.trackingNumber}</span>
              <TaskTypeBadge taskType={current.taskType} />
              <JobStatusBadge status={current.status} />
            </div>
            <span className="cp-muted cp-small">
              {current.status === 'ACCEPTED'
                ? `Next: collect from ${current.merchantName}`
                : `Next: deliver to ${current.recipient.name}, ${current.recipient.address}`}
            </span>
            <Link href={`/courier/active?job=${current.assignmentId}`} className="cp-btn cp-btn--primary">
              Continue <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}

      <section className="cp-section" aria-labelledby="cp-new">
        <SectionHeader
          id="cp-new"
          title="New assignments"
          subtitle="Tasks your branch dispatcher assigned to you"
          link={{ href: '/courier/deliveries', label: 'All tasks' }}
        />
        {newJobs.length === 0 ? (
          <EmptyState text={online ? 'No new tasks right now. Your branch will assign one soon.' : 'You are offline. Go online to receive tasks.'} />
        ) : (
          newJobs.map((job) => <AssignedJobCard key={job.assignmentId} job={job} canAccept={online} onUpdated={replaceJob} />)
        )}
      </section>

      <section className="cp-section" aria-labelledby="cp-deliveries">
        <SectionHeader id="cp-deliveries" title="My deliveries" subtitle="Filter by status and the date they were assigned" />
        <div className="cp-card cp-card--stack">
          <div className="cp-filters">
            <div className="cp-filters__field">
              <label className="cp-label" htmlFor="flt-status">
                Status
              </label>
              <select id="flt-status" className="cp-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="cp-filters__field">
              <label className="cp-label" htmlFor="flt-from">
                From
              </label>
              <input id="flt-from" type="date" className="cp-input" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="cp-filters__field">
              <label className="cp-label" htmlFor="flt-to">
                To
              </label>
              <input id="flt-to" type="date" className="cp-input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
            </div>
            <button
              type="button"
              className="cp-btn cp-btn--secondary"
              onClick={() => {
                setStatus('ALL');
                setFrom('');
                setTo('');
              }}
            >
              Show all dates
            </button>
          </div>

          {dateRangeInvalid ? (
            <Notice tone="warning">The end date must not be before the start date.</Notice>
          ) : filtered.isLoading ? (
            <LoadingState text="Loading deliveries…" />
          ) : filtered.isError ? (
            <ErrorState
              message={filtered.error instanceof Error ? filtered.error.message : 'Could not load your deliveries.'}
              onRetry={() => filtered.refetch()}
            />
          ) : (filtered.data ?? []).length === 0 ? (
            <EmptyState text="No deliveries match these filters." />
          ) : (
            <div className="cp-card cp-card--flush">
              {(filtered.data ?? []).map((job) => (
                <Link key={job.assignmentId} href={`/courier/deliveries/${encodeURIComponent(job.assignmentId)}`} className="cp-list__row">
                  <span className="cp-list__id">{job.trackingNumber}</span>
                  <span className="cp-list__meta">
                    {job.recipient.name} · {job.recipient.city} · {formatTime(job.assignedAt)}
                  </span>
                  <JobStatusBadge status={job.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <nav className="cp-grid-2" aria-label="More">
        <Link href="/courier/earnings" className="cp-card cp-row cp-row--between">
          <span className="cp-row">
            <Wallet size={18} className="cp-muted" aria-hidden="true" /> <span className="cp-strong">Earnings</span>
          </span>
          <span className="cp-muted cp-small">Today {formatLkr(earningsToday)}</span>
        </Link>
        <Link href="/courier/profile" className="cp-card cp-row cp-row--between">
          <span className="cp-row">
            <User size={18} className="cp-muted" aria-hidden="true" /> <span className="cp-strong">My profile</span>
          </span>
          <ArrowRight size={16} className="cp-muted" aria-hidden="true" />
        </Link>
      </nav>
    </div>
  );
}
