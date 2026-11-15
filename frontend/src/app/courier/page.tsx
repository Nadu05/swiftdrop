'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock, Navigation, Package, User, Wallet } from 'lucide-react';
import AssignedJobCard from '@/components/courier/AssignedJobCard';
import AvailabilityToggle from '@/components/courier/AvailabilityToggle';
import {
  EmptyState,
  ErrorState,
  JobStatusBadge,
  LoadingState,
  PageHeader,
  SectionHeader,
  StatCard,
  TaskTypeBadge,
  formatLkr,
  formatTime,
} from '@/components/courier/CourierUI';
import { isActiveJob, isToday, useCourierData } from '@/hooks/api/use-courier';

/**
 * Courier dashboard (/courier, /courier/dashboard): availability, today's numbers,
 * the task in progress, new assignments and today's finished work.
 */
export default function CourierDashboardPage() {
  const { profile, setProfile, jobs, replaceJob, loading, error, reload } = useCourierData();

  if (loading && !profile) return <LoadingState text="Loading your dashboard…" />;
  if (error || !profile) {
    return <ErrorState message={error ?? 'Could not load your dashboard. Please try again.'} onRetry={reload} />;
  }

  const online = profile.status !== 'OFFLINE';
  const activeJobs = jobs.filter(isActiveJob);
  const newJobs = jobs.filter((j) => j.status === 'ASSIGNED');
  const pendingPickups = jobs.filter((j) => j.taskType === 'PICKUP' && (j.status === 'ASSIGNED' || isActiveJob(j)));
  const finishedToday = jobs.filter((j) => (j.status === 'DELIVERED' || j.status === 'FAILED') && isToday(j.completedAt));
  const deliveredToday = finishedToday.filter((j) => j.status === 'DELIVERED');
  const earningsToday = deliveredToday.reduce((sum, j) => sum + j.payoutLkr, 0);
  const current = activeJobs[0];

  return (
    <div className="cp-page">
      <PageHeader
        title={`Welcome back, ${profile.name.split(' ')[0]}`}
        subtitle={`${profile.courierCode} · ${profile.branchName} · ${profile.vehicleType} ${profile.vehiclePlate}`}
        action={<AvailabilityToggle profile={profile} onChange={setProfile} />}
      />

      <section className="cp-stats" aria-label="Today at a glance">
        <StatCard label="New assignments" value={newJobs.length} hint="Waiting for you to accept" icon={<Package size={16} />} tone="warning" />
        <StatCard label="Pending pickups" value={pendingPickups.length} hint="Sender and merchant pickups" icon={<Clock size={16} />} tone="brand" />
        <StatCard
          label="In progress"
          value={`${activeJobs.length} / ${profile.maxCapacity}`}
          hint="Accepted or on the road"
          icon={<Navigation size={16} />}
          tone="info"
        />
        <StatCard
          label="Delivered today"
          value={deliveredToday.length}
          hint={`${finishedToday.length - deliveredToday.length} failed · ${formatLkr(earningsToday)}`}
          icon={<CheckCircle2 size={16} />}
          tone="success"
        />
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

      <section className="cp-section" aria-labelledby="cp-finished">
        <SectionHeader id="cp-finished" title="Finished today" subtitle="Delivered and failed tasks" link={{ href: '/courier/history', label: 'Job history' }} />
        {finishedToday.length === 0 ? (
          <EmptyState text="Nothing finished yet today." />
        ) : (
          <div className="cp-card cp-card--flush">
            {finishedToday.map((job) => (
              <div key={job.assignmentId} className="cp-list__row">
                <span className="cp-list__id">{job.trackingNumber}</span>
                <span className="cp-list__meta">
                  {job.recipient.city} · {formatTime(job.completedAt)}
                </span>
                <JobStatusBadge status={job.status} />
                <span className="cp-list__amount">{job.status === 'DELIVERED' ? formatLkr(job.payoutLkr) : 'No payout'}</span>
              </div>
            ))}
          </div>
        )}
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
