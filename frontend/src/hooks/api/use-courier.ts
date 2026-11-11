'use client';

import { useCallback, useEffect, useState } from 'react';
import { getMyCourierProfile, getMyJobs } from '@/api/services/courier.api';
import type { CourierJob, CourierProfile } from '@/types/courier.types';

/**
 * Loads the signed-in courier's profile and assigned jobs.
 * Follows the same useEffect + api/services pattern as the customer pages
 * (TanStack Query is not set up in the app yet).
 */
export function useCourierData() {
  const [profile, setProfile] = useState<CourierProfile | null>(null);
  const [jobs, setJobs] = useState<CourierJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, j] = await Promise.all([getMyCourierProfile(), getMyJobs()]);
      setProfile(p);
      setJobs(j);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your courier data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  /** Replace one job after a successful action, without refetching everything. */
  const replaceJob = useCallback((updated: CourierJob) => {
    setJobs((list) => list.map((j) => (j.assignmentId === updated.assignmentId ? updated : j)));
  }, []);

  return { profile, setProfile, jobs, replaceJob, loading, error, reload };
}

export const isActiveJob = (job: CourierJob) => job.status === 'ACCEPTED' || job.status === 'IN_TRANSIT';

export const isToday = (iso?: string) => {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
};
