'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import AssignedJobCard from '@/components/courier/AssignedJobCard';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/courier/CourierUI';
import { isActiveJob, useCourierData } from '@/hooks/api/use-courier';

const FILTERS = [
  { id: 'open', label: 'All open' },
  { id: 'new', label: 'New' },
  { id: 'active', label: 'In progress' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

/**
 * Member 08: My Deliveries
 * Route: /courier/deliveries
 *
 * Every job currently assigned to the courier that is not finished yet.
 * Finished jobs live on Job History.
 */
export default function MyDeliveriesPage() {
  const { profile, jobs, replaceJob, loading, error, reload } = useCourierData();
  const [filter, setFilter] = useState<FilterId>('open');

  if (loading && !profile) return <LoadingState text="Loading your deliveries…" />;
  if (error || !profile) return <ErrorState message={error ?? 'Could not load your deliveries.'} onRetry={reload} />;

  const newJobs = jobs.filter((j) => j.status === 'ASSIGNED');
  const activeJobs = jobs.filter(isActiveJob);
  const shown = filter === 'new' ? newJobs : filter === 'active' ? activeJobs : [...activeJobs, ...newJobs];
  const counts: Record<FilterId, number> = { open: newJobs.length + activeJobs.length, new: newJobs.length, active: activeJobs.length };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        title="My Deliveries"
        subtitle="Jobs assigned to you by your branch that are not finished yet"
        action={
          <button type="button" className="btn btn-secondary" onClick={reload} disabled={loading}>
            <RotateCcw size={16} /> {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }} role="tablist" aria-label="Filter deliveries">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={filter === f.id ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
            onClick={() => setFilter(f.id)}
          >
            {f.label} ({counts[f.id]})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState text={filter === 'active' ? 'No job in progress. Accept a new job to start.' : 'No open jobs right now.'} />
      ) : (
        shown.map((job) => (
          <AssignedJobCard key={job.assignmentId} job={job} canAccept={profile.status !== 'OFFLINE'} onUpdated={replaceJob} />
        ))
      )}
    </div>
  );
}
