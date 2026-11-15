'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, PackageCheck } from 'lucide-react';
import { mapDeliveryJobDtoToCourierJob } from '@/api/services/courier.api';
import {
  isActiveJob,
  useCourierData,
  useDeliverCourierTaskMutation,
  useFailCourierTaskMutation,
  usePickupCourierTaskMutation,
} from '@/hooks/api/use-courier';
import type { DeliveryFailureFormValues, PodSubmissionFormValues } from '@/schema/dispatch.schema';
import type { CourierJob } from '@/types/courier.types';
import { EmptyState, ErrorState, LoadingState, Notice, PageHeader, PodSummary } from '@/components/courier/CourierUI';
import TaskSummary from '@/components/courier/active/TaskSummary';
import ProofOfDeliveryForm from '@/components/courier/active/ProofOfDeliveryForm';
import FailedAttemptForm from '@/components/courier/active/FailedAttemptForm';
import { DEFAULT_MAX_ATTEMPTS } from '@/components/courier/courierStatus';

/**
 * Active Task (/courier/active): confirm pickup, complete a delivery with proof of delivery,
 * or report a failed attempt. Handles pickup tasks (PKP-*) and delivery jobs (DLV-*).
 */
function ActiveTaskContent() {
  const requestedId = useSearchParams().get('job');
  const { jobs, replaceJob, loading, error, reload } = useCourierData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const pickupMutation = usePickupCourierTaskMutation();
  const deliverMutation = useDeliverCourierTaskMutation();
  const failMutation = useFailCourierTaskMutation();
  const busy = pickupMutation.isPending || deliverMutation.isPending || failMutation.isPending;

  const activeList = jobs.filter(isActiveJob);
  const currentId = selectedId || requestedId || activeList[0]?.assignmentId || jobs[0]?.assignmentId;
  const job: CourierJob | undefined = jobs.find((j) => j.assignmentId === currentId);
  const isPickupTask = job?.taskType === 'PICKUP';

  const run = async (action: () => Promise<string>) => {
    setActionError(null);
    setNotice(null);
    try {
      setNotice(await action());
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      return false;
    }
  };

  const confirmPickup = () =>
    job &&
    run(async () => {
      const updated = mapDeliveryJobDtoToCourierJob(await pickupMutation.mutateAsync(job.assignmentId));
      replaceJob(updated);
      return isPickupTask
        ? `Pickup confirmed for ${updated.trackingNumber}. Hand it over at your branch.`
        : `${updated.trackingNumber} is on its way. Deliver it and record proof of delivery.`;
    });

  const submitPod = async (values: PodSubmissionFormValues) => {
    if (!job) return;
    await run(async () => {
      const dto = await deliverMutation.mutateAsync({
        id: job.assignmentId,
        payload: { type: values.type, receivedBy: values.receivedBy, reference: values.reference, notes: values.notes || undefined },
      });
      const updated = mapDeliveryJobDtoToCourierJob(dto);
      replaceJob(updated);
      return `Delivery completed for ${updated.trackingNumber}.`;
    });
  };

  const submitFailure = async (values: DeliveryFailureFormValues) => {
    if (!job) return false;
    return run(async () => {
      const updated = mapDeliveryJobDtoToCourierJob(await failMutation.mutateAsync({ id: job.assignmentId, payload: values }));
      replaceJob(updated);
      const count = updated.attemptCount ?? (job.attemptCount ?? 0) + 1;
      const limit = updated.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
      return count >= limit
        ? `Attempt ${count} of ${limit} recorded. The parcel has been sent to dispatcher review.`
        : `Attempt ${count} of ${limit} recorded. The parcel goes back to the branch for another try.`;
    });
  };

  if (loading && jobs.length === 0) return <LoadingState text="Loading your task…" />;

  return (
    <div className="cp-page">
      <PageHeader
        title="Active Task"
        subtitle="Confirm pickups, record proof of delivery or report a failed attempt"
        action={
          <Link href="/courier/deliveries" className="cp-btn cp-btn--secondary">
            All tasks
          </Link>
        }
      />

      {activeList.length > 1 && (
        <div className="cp-tabs" role="tablist" aria-label="Tasks in progress">
          {activeList.map((item) => (
            <button
              key={item.assignmentId}
              type="button"
              role="tab"
              aria-selected={item.assignmentId === job?.assignmentId}
              className="cp-tab"
              onClick={() => setSelectedId(item.assignmentId)}
            >
              {item.trackingNumber} · {item.taskType === 'PICKUP' ? 'Pickup' : 'Delivery'}
            </button>
          ))}
        </div>
      )}

      {error && <ErrorState message={error} onRetry={reload} />}
      {notice && <Notice tone="success">{notice}</Notice>}

      {!error && !job && (
        <EmptyState
          text="No active task. Accept an assigned task to begin."
          action={
            <Link href="/courier/deliveries" className="cp-btn cp-btn--primary">
              View my tasks
            </Link>
          }
        />
      )}

      {job && (
        <>
          <TaskSummary job={job} />
          {actionError && <Notice tone="error">{actionError}</Notice>}

          {job.status === 'ASSIGNED' && (
            <Notice tone="info">
              Accept this task before you start it.{' '}
              <Link href="/courier/deliveries" className="cp-link">
                Go to my tasks
              </Link>
            </Notice>
          )}

          {job.status === 'ACCEPTED' && (
            <section className="cp-card cp-card--stack">
              <div>
                <h2 className="cp-section__title">{isPickupTask ? 'Collect the parcel' : 'Pick up for delivery'}</h2>
                <p className="cp-muted cp-small">
                  {isPickupTask
                    ? 'Confirm once you have the parcel from the sender. You will hand it over at your branch.'
                    : 'Confirm once the parcel is scanned out of the branch and loaded.'}
                </p>
              </div>
              <button type="button" className="cp-btn cp-btn--primary cp-btn--block" disabled={busy} onClick={confirmPickup}>
                {pickupMutation.isPending ? <Loader2 size={16} className="cp-spin" aria-hidden="true" /> : <PackageCheck size={16} aria-hidden="true" />}
                {pickupMutation.isPending ? 'Confirming…' : isPickupTask ? 'Confirm parcel collected' : 'Confirm picked up'}
              </button>
            </section>
          )}

          {job.status === 'IN_TRANSIT' && !isPickupTask && (
            <div className="cp-grid-2">
              <ProofOfDeliveryForm job={job} busy={busy} submitting={deliverMutation.isPending} onSubmit={submitPod} />
              <FailedAttemptForm job={job} busy={busy} submitting={failMutation.isPending} onSubmit={submitFailure} />
            </div>
          )}

          {(job.status === 'DELIVERED' || job.status === 'FAILED') && (
            <section className="cp-card cp-card--stack">
              <h2 className="cp-section__title">
                {job.status === 'DELIVERED' ? (isPickupTask ? 'Handed over to branch' : 'Delivery completed') : 'Delivery attempt failed'}
              </h2>
              {job.status === 'DELIVERED' && job.proofOfDelivery && (
                <p className="cp-small">
                  <PodSummary pod={job.proofOfDelivery} />
                </p>
              )}
              {job.status === 'FAILED' && job.failure && (
                <p className="cp-small cp-text-error">
                  {job.failure.reason}
                  {job.failure.notes ? ` · ${job.failure.notes}` : ''}
                </p>
              )}
              <div>
                <Link href="/courier/deliveries" className="cp-btn cp-btn--secondary">
                  Back to my tasks
                </Link>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default function ActiveTaskPage() {
  return (
    <Suspense fallback={<LoadingState text="Loading your task…" />}>
      <ActiveTaskContent />
    </Suspense>
  );
}
