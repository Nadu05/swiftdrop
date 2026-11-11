'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, Navigation, Star, Wallet } from 'lucide-react';
import AssignedJobCard from '@/components/courier/AssignedJobCard';
import AvailabilityToggle from '@/components/courier/AvailabilityToggle';
import {
  EmptyState,
  ErrorState,
  JobStatusBadge,
  LoadingState,
  PageHeader,
  StatCard,
  formatLkr,
  formatTime,
} from '@/components/courier/CourierUI';
import { isActiveJob, isToday, useCourierData } from '@/hooks/api/use-courier';

/**
 * Member 08: Courier Dashboard
 * Route: /courier
 *
 * The courier's home: availability (what the dispatcher sees), today's numbers,
 * the job in progress, new jobs from the branch, and today's finished jobs.
 */
export default function CourierDashboardPage() {
  const { profile, setProfile, jobs, replaceJob, loading, error, reload } = useCourierData();

  if (loading && !profile) return <LoadingState text="Loading your dashboard…" />;
  if (error || !profile) return <ErrorState message={error ?? 'Could not load your dashboard.'} onRetry={reload} />;

  const activeJobs = jobs.filter(isActiveJob);
  const newJobs = jobs.filter((j) => j.status === 'ASSIGNED');
  const finishedToday = jobs.filter((j) => (j.status === 'DELIVERED' || j.status === 'FAILED') && isToday(j.completedAt));
  const deliveredToday = finishedToday.filter((j) => j.status === 'DELIVERED');
  const earningsToday = deliveredToday.reduce((sum, j) => sum + j.payoutLkr, 0);
  const online = profile.status !== 'OFFLINE';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <PageHeader
        title={`Welcome back, ${profile.name.split(' ')[0]}`}
        subtitle={`${profile.courierCode} · ${profile.branchName} · ${profile.vehicleType} ${profile.vehiclePlate}`}
        action={<AvailabilityToggle profile={profile} onChange={setProfile} />}
      />

      <div className="grid-cols-4">
        <StatCard
          label="Delivered today"
          value={deliveredToday.length}
          hint={`${finishedToday.length - deliveredToday.length} failed attempts`}
          icon={<CheckCircle2 size={18} color="#10b981" />}
        />
        <StatCard label="Earnings today" value={formatLkr(earningsToday)} hint="From delivered jobs" icon={<Wallet size={18} color="#3b82f6" />} />
        <StatCard
          label="Active jobs"
          value={`${activeJobs.length} / ${profile.maxCapacity}`}
          hint={`${newJobs.length} waiting for you to accept`}
          icon={<Navigation size={18} color="#f59e0b" />}
        />
        <StatCard label="Rating" value={`${profile.rating.toFixed(1)} ★`} hint="Customer average" icon={<Star size={18} color="#8b5cf6" />} />
      </div>

      {activeJobs.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <SectionTitle title="In progress" subtitle="Jobs you have accepted" />
          {activeJobs.map((job) => (
            <AssignedJobCard key={job.assignmentId} job={job} canAccept={online} onUpdated={replaceJob} />
          ))}
        </section>
      )}

      <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <SectionTitle
          title="New assignments"
          subtitle="Jobs your branch dispatcher assigned to you"
          link={{ href: '/courier/deliveries', label: 'All deliveries' }}
        />
        {newJobs.length === 0 ? (
          <EmptyState text={online ? 'No new jobs right now. Your branch will assign one soon.' : 'You are offline. Go online to receive jobs.'} />
        ) : (
          newJobs.map((job) => <AssignedJobCard key={job.assignmentId} job={job} canAccept={online} onUpdated={replaceJob} />)
        )}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <SectionTitle title="Finished today" subtitle="Delivered and failed jobs" link={{ href: '/courier/history', label: 'Job history' }} />
        {finishedToday.length === 0 ? (
          <EmptyState text="No finished jobs yet today." />
        ) : (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            {finishedToday.map((job, i) => (
              <div
                key={job.assignmentId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.9rem 1.5rem',
                  borderTop: i === 0 ? 'none' : '1px solid rgba(59, 130, 246, 0.1)',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ color: '#ffffff', fontWeight: 600 }}>{job.trackingNumber}</span>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem', flex: 1 }}>
                  {job.recipient.city} · {formatTime(job.completedAt)}
                </span>
                <JobStatusBadge status={job.status} />
                <span style={{ color: '#e2e8f0', fontSize: '0.85rem', minWidth: '90px', textAlign: 'right' }}>
                  {job.status === 'DELIVERED' ? formatLkr(job.payoutLkr) : 'No payout'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionTitle({ title, subtitle, link }: { title: string; subtitle: string; link?: { href: string; label: string } }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem' }}>
      <div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>{title}</h2>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{subtitle}</p>
      </div>
      {link && (
        <Link href={link.href} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#60a5fa', fontSize: '0.85rem', textDecoration: 'none' }}>
          {link.label} <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}
