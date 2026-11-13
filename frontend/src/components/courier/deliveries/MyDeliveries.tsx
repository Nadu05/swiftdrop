'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useCourierJobs, useCourierProfile } from '@/hooks/api/use-courier';
import AssignedJobCard from '../AssignedJobCard';
import { EmptyState, ErrorState, LoadingState, PageHeader, errorMessage } from '../CourierUI';
import { isActiveJob } from '../courierUtils';

const FILTERS = [
  { id: 'open', label: 'All open' },
  { id: 'new', label: 'New' },
  { id: 'active', label: 'In progress' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

/** Every job assigned to the courier that is not finished yet (finished ones are on Job History). */
export default function MyDeliveries() {
  const profileQuery = useCourierProfile();
  const jobsQuery = useCourierJobs();
  const [filter, setFilter] = useState<FilterId>('open');

  if (profileQuery.isPending || jobsQuery.isPending) return <LoadingState text="Loading your deliveries…" />;
  if (profileQuery.isError || jobsQuery.isError) {
    return (
      <ErrorState
        message={errorMessage(profileQuery.error ?? jobsQuery.error, 'Could not load your deliveries.')}
        onRetry={() => {
          profileQuery.refetch();
          jobsQuery.refetch();
        }}
      />
    );
  }

  const jobs = jobsQuery.data;
  const newJobs = jobs.filter((job) => job.status === 'ASSIGNED');
  const activeJobs = jobs.filter(isActiveJob);
  const shown = filter === 'new' ? newJobs : filter === 'active' ? activeJobs : [...activeJobs, ...newJobs];
  const counts: Record<FilterId, number> = { open: newJobs.length + activeJobs.length, new: newJobs.length, active: activeJobs.length };

  return (
    <div className="courier-page courier-page--compact">
      <PageHeader
        title="My Deliveries"
        subtitle="Jobs assigned to you by your branch that are not finished yet"
        action={
          <button type="button" className="btn btn-secondary" onClick={() => jobsQuery.refetch()} disabled={jobsQuery.isFetching}>
            <RotateCcw size={16} aria-hidden="true" /> {jobsQuery.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      <div className="courier-tabs" role="group" aria-label="Filter deliveries">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            className={filter === f.id ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => setFilter(f.id)}
          >
            {f.label} ({counts[f.id]})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState text={filter === 'active' ? 'No job in progress. Accept a new job to start.' : 'No open jobs right now.'} />
      ) : (
        shown.map((job) => <AssignedJobCard key={job.assignmentId} job={job} canAccept={profileQuery.data.status !== 'OFFLINE'} />)
      )}
    </div>
  );
}
