'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, Navigation, Star, Wallet } from 'lucide-react';
import { useCourierJobs, useCourierProfile } from '@/hooks/api/use-courier';
import AssignedJobCard from '../AssignedJobCard';
import AvailabilityToggle from '../AvailabilityToggle';
import {
  EmptyState,
  ErrorState,
  Field,
  JobStatusBadge,
  LoadingState,
  PageHeader,
  SectionHeader,
  StatCard,
  errorMessage,
} from '../CourierUI';
import { formatLkr, formatTime, isActiveJob, isFinishedJob, isToday, sumPayout } from '../courierUtils';

/**
 * Courier home: availability (what the dispatcher sees), today's numbers,
 * the delivery in progress, new jobs from the branch and today's finished jobs.
 */
export default function CourierDashboard() {
  const profileQuery = useCourierProfile();
  const jobsQuery = useCourierJobs();

  if (profileQuery.isPending || jobsQuery.isPending) return <LoadingState text="Loading your dashboard…" />;
  if (profileQuery.isError || jobsQuery.isError) {
    return (
      <ErrorState
        message={errorMessage(profileQuery.error ?? jobsQuery.error, 'Could not load your dashboard.')}
        onRetry={() => {
          profileQuery.refetch();
          jobsQuery.refetch();
        }}
      />
    );
  }

  const profile = profileQuery.data;
  const jobs = jobsQuery.data;
  const online = profile.status !== 'OFFLINE';
  const activeJobs = jobs.filter(isActiveJob);
  const newJobs = jobs.filter((job) => job.status === 'ASSIGNED');
  const finishedToday = jobs.filter((job) => isFinishedJob(job) && isToday(job.completedAt));
  const deliveredToday = finishedToday.filter((job) => job.status === 'DELIVERED');
  const current = activeJobs[0];

  return (
    <div className="courier-page">
      <PageHeader
        title={`Welcome back, ${profile.name.split(' ')[0]}`}
        subtitle={`${profile.courierCode} · ${profile.branchName} · ${profile.vehicleType} ${profile.vehiclePlate}`}
        action={<AvailabilityToggle profile={profile} />}
      />

      <section className="grid-cols-4" aria-label="Today at a glance">
        <StatCard
          label="Delivered today"
          value={deliveredToday.length}
          hint={`${finishedToday.length - deliveredToday.length} failed attempts`}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard label="Earnings today" value={formatLkr(sumPayout(deliveredToday))} hint="From delivered jobs" icon={Wallet} tone="primary" />
        <StatCard
          label="Active jobs"
          value={`${activeJobs.length} / ${profile.maxCapacity}`}
          hint={`${newJobs.length} waiting for you to accept`}
          icon={Navigation}
          tone="warning"
        />
        <StatCard label="Rating" value={profile.rating != null ? `${profile.rating.toFixed(1)} ★` : '—'} hint="Customer average" icon={Star} tone="purple" />
      </section>

      {current && (
        <section className="courier-section" aria-labelledby="courier-current">
          <SectionHeader
            id="courier-current"
            title="Current delivery"
            subtitle={activeJobs.length > 1 ? `${activeJobs.length} jobs in progress` : 'The job you are working on'}
            link={{ href: '/courier/deliveries', label: 'All in progress' }}
          />
          <div className="glass-card courier-row courier-row--between">
            <div className="courier-row">
              <span className="courier-job__id">{current.trackingNumber}</span>
              <JobStatusBadge status={current.status} />
            </div>
            <Field label={current.status === 'ACCEPTED' ? 'Next: pick up from' : 'Next: deliver to'}>
              {current.status === 'ACCEPTED'
                ? `${current.merchantName}, ${current.pickupAddress}`
                : `${current.recipient.name}, ${current.recipient.address}`}
            </Field>
            <Link href={`/courier/active?job=${current.assignmentId}`} className="btn btn-primary">
              Continue <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}

      <section className="courier-section" aria-labelledby="courier-new">
        <SectionHeader
          id="courier-new"
          title="New assignments"
          subtitle="Jobs your branch dispatcher assigned to you"
          link={{ href: '/courier/deliveries', label: 'All deliveries' }}
        />
        {newJobs.length === 0 ? (
          <EmptyState text={online ? 'No new jobs right now. Your branch will assign one soon.' : 'You are offline. Go online to receive jobs.'} />
        ) : (
          newJobs.map((job) => <AssignedJobCard key={job.assignmentId} job={job} canAccept={online} />)
        )}
      </section>

      <section className="courier-section" aria-labelledby="courier-finished">
        <SectionHeader
          id="courier-finished"
          title="Finished today"
          subtitle="Delivered and failed jobs"
          link={{ href: '/courier/history', label: 'Job history' }}
        />
        {finishedToday.length === 0 ? (
          <EmptyState text="No finished jobs yet today." />
        ) : (
          <ul className="glass-card courier-list">
            {finishedToday.map((job) => (
              <li key={job.assignmentId} className="courier-list__row">
                <span className="courier-list__id">{job.trackingNumber}</span>
                <span className="courier-list__meta">
                  {job.recipient.city} · {formatTime(job.completedAt)}
                </span>
                <JobStatusBadge status={job.status} />
                <span className="courier-list__amount">{job.status === 'DELIVERED' ? formatLkr(job.payoutLkr) : 'No payout'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
