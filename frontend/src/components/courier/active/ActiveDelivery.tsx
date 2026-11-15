'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Package, Phone } from 'lucide-react';
import { useCourierJobs, useMarkPickedUp } from '@/hooks/api/use-courier';
import type { CourierJob } from '@/types/courier.types';
import { EmptyState, ErrorState, Field, JobStatusBadge, LoadingState, PageHeader, PriorityTag, errorMessage } from '../CourierUI';
import { formatLkr, formatTime, isActiveJob } from '../courierUtils';
import DeliveryProgress from './DeliveryProgress';
import FailedDeliveryForm from './FailedDeliveryForm';
import ProofOfDeliveryForm from './ProofOfDeliveryForm';

/**
 * Steps the courier through ACCEPTED -> IN_TRANSIT -> DELIVERED, or FAILED with
 * a reason. These are the updates the dispatcher sees on Active Deliveries /
 * Delivery History and the customer sees on tracking.
 */
export default function ActiveDelivery() {
  const jobParam = useSearchParams().get('job');
  const jobsQuery = useCourierJobs();
  // Remember the open job so its result stays on screen after it is finished.
  const [openedId, setOpenedId] = useState<string | null>(null);

  const jobs = jobsQuery.data ?? [];
  const active = jobs.filter(isActiveJob);
  const job = jobs.find((j) => j.assignmentId === (jobParam ?? openedId)) ?? active[0];

  useEffect(() => {
    if (!jobParam && job && openedId !== job.assignmentId) setOpenedId(job.assignmentId);
  }, [jobParam, job, openedId]);

  if (jobsQuery.isPending) return <LoadingState text="Loading your delivery…" />;
  if (jobsQuery.isError) return <ErrorState message={errorMessage(jobsQuery.error, 'Could not load your delivery.')} onRetry={() => jobsQuery.refetch()} />;

  return (
    <div className="courier-page">
      <PageHeader title="Active Delivery" subtitle="Pick up, deliver and confirm the job you are working on" />

      {!job ? (
        <EmptyState
          text="You have no delivery in progress. Accept a job to start."
          action={
            <Link href="/courier/deliveries" className="btn btn-primary">
              View my deliveries
            </Link>
          }
        />
      ) : (
        <>
          {active.length > 1 && (
            <nav className="courier-tabs" aria-label="Jobs in progress">
              {active.map((j) => (
                <Link
                  key={j.assignmentId}
                  href={`/courier/active?job=${j.assignmentId}`}
                  aria-current={j.assignmentId === job.assignmentId ? 'page' : undefined}
                  className={j.assignmentId === job.assignmentId ? 'btn btn-primary' : 'btn btn-secondary'}
                >
                  {j.trackingNumber}
                </Link>
              ))}
            </nav>
          )}
          <DeliveryProgress job={job} />
          <div className="grid-cols-2 courier-grid-top">
            <JobDetails job={job} />
            <JobActions key={job.assignmentId} job={job} />
          </div>
        </>
      )}
    </div>
  );
}

function JobDetails({ job }: { job: CourierJob }) {
  return (
    <section className="glass-card courier-stack" aria-label="Job details">
      <div className="courier-row courier-row--between">
        <div className="courier-row">
          <Package size={20} className="courier-icon--primary" aria-hidden="true" />
          <span className="courier-job__id">{job.trackingNumber}</span>
          <PriorityTag priority={job.priority} />
        </div>
        <JobStatusBadge status={job.status} />
      </div>

      <Field label="Pickup">
        {job.merchantName} — {job.pickupAddress}
      </Field>
      <Field label="Deliver to">
        {job.recipient.name} — {job.recipient.address}, {job.recipient.city}
      </Field>
      <Field label="Recipient phone">
        <a href={`tel:${job.recipient.phone.replace(/\s/g, '')}`}>
          <Phone size={14} aria-hidden="true" /> {job.recipient.phone}
        </a>
      </Field>
      <div className="grid-cols-2">
        <Field label="Parcel">
          {job.parcel.category} · {job.parcel.weightKg} kg
        </Field>
        <Field label="Payout">{formatLkr(job.payoutLkr)}</Field>
        <Field label="Assigned">{formatTime(job.assignedAt)}</Field>
        <Field label="Picked up">{formatTime(job.pickedUpAt)}</Field>
      </div>
      {job.parcel.handlingNotes && <span className="badge badge-warning">Handling: {job.parcel.handlingNotes}</span>}
    </section>
  );
}

function JobActions({ job }: { job: CourierJob }) {
  const [reportingFailure, setReportingFailure] = useState(false);
  const pickup = useMarkPickedUp();

  if (job.status === 'DELIVERED' || job.status === 'FAILED') {
    const ok = job.status === 'DELIVERED';
    return (
      <section className="glass-card courier-stack" role="status">
        <p className={`courier-result ${ok ? 'courier-result--ok' : 'courier-result--failed'}`}>
          {ok ? <CheckCircle2 size={20} aria-hidden="true" /> : <AlertTriangle size={20} aria-hidden="true" />}
          {ok ? 'Delivery completed' : 'Delivery marked as failed'}
        </p>
        <p className="courier-muted">
          {ok
            ? `Proof recorded (${job.proofOfDelivery?.type} · ${job.proofOfDelivery?.reference}). Your branch and the customer can now see it as delivered.`
            : `Reason sent to your branch: ${job.failure?.reason}. The dispatcher will reschedule or return the parcel.`}
        </p>
        <div className="courier-row">
          <Link href="/courier" className="btn btn-primary">
            Back to dashboard
          </Link>
          <Link href="/courier/history" className="btn btn-secondary">
            Job history
          </Link>
        </div>
      </section>
    );
  }

  if (reportingFailure) return <FailedDeliveryForm job={job} onCancel={() => setReportingFailure(false)} />;

  if (job.status === 'IN_TRANSIT') return <ProofOfDeliveryForm job={job} onCannotDeliver={() => setReportingFailure(true)} />;

  if (job.status === 'ACCEPTED') {
    return (
      <section className="glass-card courier-stack">
        <h2 className="courier-card-title">Next step: pick up the parcel</h2>
        <p className="courier-muted">Go to {job.merchantName} and collect the parcel. Mark it picked up once it is with you.</p>
        <button type="button" className="btn btn-primary" disabled={pickup.isPending} onClick={() => pickup.mutate(job.assignmentId)}>
          {pickup.isPending ? 'Saving…' : 'Mark as picked up'}
        </button>
        <p className="courier-hint">Can&apos;t collect it? Contact your branch dispatcher to reassign the job.</p>
        {pickup.isError && (
          <p className="courier-alert" role="alert">
            {errorMessage(pickup.error, 'Could not mark this parcel as picked up.')}
          </p>
        )}
      </section>
    );
  }

  // ASSIGNED: opened via a link before accepting.
  return (
    <section className="glass-card courier-stack">
      <h2 className="courier-card-title">Not accepted yet</h2>
      <p className="courier-muted">Accept this job from My Deliveries before starting it.</p>
      <Link href="/courier/deliveries" className="btn btn-primary">
        Go to My Deliveries
      </Link>
    </section>
  );
}
