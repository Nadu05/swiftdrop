'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import AssignedJobCard from '@/components/courier/AssignedJobCard';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/courier/CourierUI';
import { isActiveJob, useCourierData } from '@/hooks/api/use-courier';
import type { CourierJob } from '@/types/courier.types';

const FILTERS = [
  { id: 'open', label: 'All open' },
  { id: 'new', label: 'New' },
  { id: 'pickup', label: 'Pickups' },
  { id: 'delivery', label: 'Deliveries' },
  { id: 'active', label: 'In progress' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

const isOpen = (j: CourierJob) => j.status === 'ASSIGNED' || isActiveJob(j);

const FILTER_FN: Record<FilterId, (j: CourierJob) => boolean> = {
  open: isOpen,
  new: (j) => j.status === 'ASSIGNED',
  pickup: (j) => isOpen(j) && j.taskType === 'PICKUP',
  delivery: (j) => isOpen(j) && j.taskType !== 'PICKUP',
  active: isActiveJob,
};

/**
 * My Tasks (/courier/deliveries): every open pickup task and delivery job assigned to the courier.
 * Finished work is on Job History.
 */
export default function MyTasksPage() {
  const { profile, jobs, replaceJob, loading, isFetching, error, reload } = useCourierData();
  const [filter, setFilter] = useState<FilterId>('open');

  if (loading && !profile) return <LoadingState text="Loading your tasks…" />;
  if (error || !profile) return <ErrorState message={error ?? 'Could not load your tasks.'} onRetry={reload} />;

  // In-progress first, then newest assignments.
  const shown = jobs
    .filter(FILTER_FN[filter])
    .sort((a, b) => Number(isActiveJob(b)) - Number(isActiveJob(a)) || (b.assignedAt ?? '').localeCompare(a.assignedAt ?? ''));

  return (
    <div className="cp-page">
      <PageHeader
        title="My Tasks"
        subtitle="Pickups and deliveries assigned to you that are not finished yet"
        action={
          <button type="button" className="cp-btn cp-btn--secondary" onClick={reload} disabled={isFetching}>
            <RotateCcw size={15} className={isFetching ? 'cp-spin' : undefined} aria-hidden="true" /> Refresh
          </button>
        }
      />

      <div className="cp-tabs" role="tablist" aria-label="Filter tasks">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} className="cp-tab" onClick={() => setFilter(f.id)}>
            {f.label} ({jobs.filter(FILTER_FN[f.id]).length})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState text={filter === 'active' ? 'Nothing in progress. Accept a new task to start.' : 'No open tasks right now.'} />
      ) : (
        shown.map((job) => (
          <AssignedJobCard key={job.assignmentId} job={job} canAccept={profile.status !== 'OFFLINE'} onUpdated={replaceJob} />
        ))
      )}
    </div>
  );
}
