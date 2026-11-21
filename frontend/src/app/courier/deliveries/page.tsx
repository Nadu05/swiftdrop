'use client';

import { useState } from 'react';
import { Package, RefreshCw } from 'lucide-react';
import AssignedJobCard from '@/components/courier/AssignedJobCard';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '@/components/courier/CourierUI';
import { isActiveJob, useCourierData } from '@/hooks/api/use-courier';

const FILTERS = [
  { id: 'open', label: 'All Open Tasks' },
  { id: 'new', label: 'New Assignments' },
  { id: 'active', label: 'In Progress' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

/**
 * Member 08: My Deliveries
 * Route: /courier/deliveries
 *
 * Every job currently assigned to the courier that is not finished yet.
 */
export default function MyDeliveriesPage() {
  const { profile, jobs, replaceJob, loading, error, reload } = useCourierData();
  const [filter, setFilter] = useState<FilterId>('open');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await reload();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading && !profile) return <LoadingState text="Loading your deliveries…" />;
  if (error || !profile) return <ErrorState message={error ?? 'Could not load your deliveries.'} onRetry={reload} />;

  const newJobs = jobs.filter((j) => j.status === 'ASSIGNED');
  const activeJobs = jobs.filter(isActiveJob);
  const shown = filter === 'new' ? newJobs : filter === 'active' ? activeJobs : [...activeJobs, ...newJobs];
  const counts: Record<FilterId, number> = {
    open: newJobs.length + activeJobs.length,
    new: newJobs.length,
    active: activeJobs.length,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <PageHeader
        title="My Deliveries"
        subtitle="Active deliveries and new jobs assigned to you awaiting pickup and delivery execution"
        action={
          <button
            type="button"
            className="dispatcher-overview__refresh-btn"
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
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
        }
      />

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }} role="tablist" aria-label="Filter deliveries">
        {FILTERS.map((f) => {
          const isSelected = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.95rem',
                borderRadius: '10px',
                border: isSelected ? '1px solid #2563eb' : '1px solid var(--ds-border, #e2e8f0)',
                background: isSelected ? '#2563eb' : 'var(--ds-surface, #ffffff)',
                color: isSelected ? '#ffffff' : '#475569',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onClick={() => setFilter(f.id)}
            >
              <span>{f.label}</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '999px',
                  background: isSelected ? 'rgba(255, 255, 255, 0.25)' : '#f1f5f9',
                  color: isSelected ? '#ffffff' : '#64748b',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                }}
              >
                {counts[f.id]}
              </span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          text={
            filter === 'active'
              ? 'No jobs currently in transit. Accept a new job from your task list to start.'
              : 'No open jobs right now. Your branch dispatcher will assign a parcel soon.'
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {shown.map((job) => (
            <AssignedJobCard
              key={job.assignmentId}
              job={job}
              canAccept={profile.status !== 'OFFLINE'}
              onUpdated={replaceJob}
            />
          ))}
        </div>
      )}
    </div>
  );
}
