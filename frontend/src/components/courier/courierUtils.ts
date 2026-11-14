import type { CourierJob } from '@/types/courier.types';

/** Job is accepted and being worked on (shown on Active Delivery). */
export const isActiveJob = (job: CourierJob) => job.status === 'ACCEPTED' || job.status === 'IN_TRANSIT';

/** Job is finished either way (shown on Job History). */
export const isFinishedJob = (job: CourierJob) => job.status === 'DELIVERED' || job.status === 'FAILED';

export const isToday = (iso?: string) => !!iso && new Date(iso).toDateString() === new Date().toDateString();

export const byCompletedDesc = (a: CourierJob, b: CourierJob) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '');

export const sumPayout = (jobs: CourierJob[]) => jobs.reduce((total, job) => total + (job.payoutLkr ?? 0), 0);

export const formatLkr = (amount: number | null | undefined) =>
  amount == null ? '—' : `LKR ${amount.toLocaleString('en-LK')}`;

export const formatTime = (iso?: string) =>
  iso ? new Intl.DateTimeFormat('en-LK', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso)) : '—';

export const formatDateTime = (iso?: string) =>
  iso
    ? new Intl.DateTimeFormat('en-LK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
    : '—';
