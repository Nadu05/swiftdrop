'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Loader2, PackageCheck } from 'lucide-react';
import { mapDeliveryJobDtoToCourierJob } from '@/api/services/courier.api';
import {
  describeActionError,
  isActiveJob,
  useAcceptCourierTaskMutation,
  useCourierData,
  useDeliverCourierTaskMutation,
  useFailCourierTaskMutation,
  usePickupCourierTaskMutation,
} from '@/hooks/api/use-courier';
import type { DeliveryFailureFormValues, PodSubmissionFormValues } from '@/schema/dispatch.schema';
import type { CourierJob } from '@/types/courier.types';
import { EmptyState, ErrorState, LoadingState, Notice, PageHeader, PodSummary } from '@/components/courier/CourierUI';
import ConfirmDialog from '@/components/courier/ConfirmDialog';
import TaskSummary from '@/components/courier/active/TaskSummary';
import ProofOfDeliveryForm from '@/components/courier/active/ProofOfDeliveryForm';
import FailedAttemptForm from '@/components/courier/active/FailedAttemptForm';
import { DEFAULT_MAX_ATTEMPTS, canDo } from '@/components/courier/courierStatus';

type PendingAction =
  | { kind: 'pickup' }
  | { kind: 'deliver'; values: PodSubmissionFormValues }
  | { kind: 'fail'; values: DeliveryFailureFormValues };

/**
 * Active Task (/courier/active): confirm pickup, complete a delivery with proof of delivery,
 * or report a failed attempt. Only the actions the backend allows for the job's state are shown, every
 * consequential action asks for confirmation, and a success message appears only after the backend confirms.
 */
function ActiveTaskContent() {
  const requestedId = useSearchParams().get('job');
  const { jobs, replaceJob, loading, error, reload } = useCourierData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const acceptMutation = useAcceptCourierTaskMutation();
  const pickupMutation = usePickupCourierTaskMutation();
  const deliverMutation = useDeliverCourierTaskMutation();
  const failMutation = useFailCourierTaskMutation();
  const busy =
    acceptMutation.isPending || pickupMutation.isPending || deliverMutation.isPending || failMutation.isPending;

  // A failed attempt that can still be retried stays in the courier task list until it is delivered or escalated.
  const activeList = jobs.filter((j) => isActiveJob(j) || (j.status === 'FAILED' && canDo(j, 'DELIVER')));
  const currentId = selectedId || requestedId || activeList[0]?.assignmentId || jobs[0]?.assignmentId;
  const job: CourierJob | undefined = jobs.find((j) => j.assignmentId === currentId);
  const isPickupTask = job?.taskType === 'PICKUP';

  const closeDialog = () => {
    if (busy) return;
    setPending(null);
    setActionError(null);
  };

  /** Runs one backend action. The message is shown only after the backend has answered successfully. */
  const run = async (action: () => Promise<string>): Promise<boolean> => {
    setActionError(null);
    setNotice(null);
    try {
      const message = await action();
      setNotice(message);
      return true;
    } catch (err) {
      setActionError(describeActionError(err));
      return false;
    }
  };

  const acceptJob = () =>
    job &&
    run(async () => {
      const updated = mapDeliveryJobDtoToCourierJob(await acceptMutation.mutateAsync(job.assignmentId));
      replaceJob(updated);
      return `You accepted ${updated.trackingNumber}. Collect the parcel when you are ready.`;
    });

  const executePending = async () => {
    if (!job || !pending) return;
    const ok = await run(async () => {
      if (pending.kind === 'pickup') {
        const updated = mapDeliveryJobDtoToCourierJob(await pickupMutation.mutateAsync(job.assignmentId));
        replaceJob(updated);
        return isPickupTask
          ? `Pickup confirmed for ${updated.trackingNumber}. Hand it over at your branch.`
          : `${updated.trackingNumber} is on its way. Deliver it and record proof of delivery.`;
      }
      if (pending.kind === 'deliver') {
        const { values } = pending;
        const dto = await deliverMutation.mutateAsync({
          id: job.assignmentId,
          payload: { type: values.type, receivedBy: values.receivedBy, reference: values.reference, notes: values.notes || undefined },
        });
        const updated = mapDeliveryJobDtoToCourierJob(dto);
        replaceJob(updated);
        return `Delivery completed for ${updated.trackingNumber}.`;
      }
      const updated = mapDeliveryJobDtoToCourierJob(
        await failMutation.mutateAsync({ id: job.assignmentId, payload: pending.values })
      );
      replaceJob(updated);
      const count = updated.attemptCount ?? (job.attemptCount ?? 0) + 1;
      const limit = updated.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
      return count >= limit
        ? `Attempt ${count} of ${limit} recorded. The parcel has been sent to dispatcher review.`
        : `Attempt ${count} of ${limit} recorded. You can try this delivery again.`;
    });
    if (ok) setPending(null);
  };

  const requestPod = async (values: PodSubmissionFormValues) => {
    setActionError(null);
    setPending({ kind: 'deliver', values });
  };

  const requestFailure = async (values: DeliveryFailureFormValues) => {
    setActionError(null);
    setPending({ kind: 'fail', values });
    return false; // the form closes itself once the attempt is recorded (it is re-keyed by attempt count)
  };

  if (loading && jobs.length === 0) return <LoadingState text="Loading your task…" />;

  const dialog = (() => {
    if (!pending || !job) return null;
    if (pending.kind === 'pickup') {
      return {
        title: isPickupTask ? 'Confirm parcel collected?' : 'Confirm picked up?',
        message: isPickupTask
          ? `Confirm you have the parcel ${job.trackingNumber} from the sender.`
          : `Confirm parcel ${job.trackingNumber} is loaded and you are leaving the branch.`,
        confirmLabel: isPickupTask ? 'Yes, collected' : 'Yes, picked up',
        tone: 'primary' as const,
      };
    }
    if (pending.kind === 'deliver') {
      return {
        title: 'Complete this delivery?',
        message: `Parcel ${job.trackingNumber} will be marked as delivered to ${pending.values.receivedBy}. This cannot be undone.`,
        confirmLabel: 'Yes, mark delivered',
        tone: 'primary' as const,
      };
    }
    const attempt = (job.attemptCount ?? 0) + 1;
    const limit = job.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    return {
      title: 'Report a failed attempt?',
      message:
        attempt >= limit
          ? `Reason: ${pending.values.reason}. This is attempt ${attempt} of ${limit}, so the parcel goes to dispatcher review.`
          : `Reason: ${pending.values.reason}. This is attempt ${attempt} of ${limit}.`,
      confirmLabel: 'Yes, report failure',
      tone: 'danger' as const,
    };
  })();

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
          {actionError && !pending && <Notice tone="error">{actionError}</Notice>}

          {canDo(job, 'ACCEPT') && (
            <section className="cp-card cp-card--stack">
              <div>
                <h2 className="cp-section__title">New task</h2>
                <p className="cp-muted cp-small">Accept this task before you start it.</p>
              </div>
              <button type="button" className="cp-btn cp-btn--primary cp-btn--block" disabled={busy} onClick={acceptJob}>
                {acceptMutation.isPending ? <Loader2 size={16} className="cp-spin" aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
                {acceptMutation.isPending ? 'Accepting…' : isPickupTask ? 'Accept pickup' : 'Accept delivery'}
              </button>
            </section>
          )}

          {canDo(job, 'PICKUP') && (
            <section className="cp-card cp-card--stack">
              <div>
                <h2 className="cp-section__title">{isPickupTask ? 'Collect the parcel' : 'Pick up for delivery'}</h2>
                <p className="cp-muted cp-small">
                  {isPickupTask
                    ? 'Confirm once you have the parcel from the sender. You will hand it over at your branch.'
                    : 'Confirm once the parcel is scanned out of the branch and loaded.'}
                </p>
              </div>
              <button
                type="button"
                className="cp-btn cp-btn--primary cp-btn--block"
                disabled={busy}
                onClick={() => {
                  setActionError(null);
                  setPending({ kind: 'pickup' });
                }}
              >
                <PackageCheck size={16} aria-hidden="true" />
                {isPickupTask ? 'Confirm parcel collected' : 'Confirm picked up'}
              </button>
            </section>
          )}

          {(canDo(job, 'DELIVER') || canDo(job, 'FAIL')) && (
            <div className="cp-grid-2">
              {canDo(job, 'DELIVER') && (
                <ProofOfDeliveryForm job={job} busy={busy} submitting={deliverMutation.isPending} onSubmit={requestPod} />
              )}
              {canDo(job, 'FAIL') && (
                <FailedAttemptForm
                  key={`${job.assignmentId}-${job.attemptCount ?? 0}`}
                  job={job}
                  busy={busy}
                  submitting={failMutation.isPending}
                  onSubmit={requestFailure}
                />
              )}
            </div>
          )}

          {job.status === 'FAILED' && !canDo(job, 'DELIVER') && !canDo(job, 'FAIL') && (
            <Notice tone="warning">
              The maximum number of delivery attempts has been reached. A dispatcher will decide what happens to this parcel.
            </Notice>
          )}

          {(job.status === 'DELIVERED' || (job.status === 'FAILED' && !canDo(job, 'DELIVER') && !canDo(job, 'FAIL'))) && (
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

      <ConfirmDialog
        open={Boolean(pending && dialog)}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        confirmLabel={dialog?.confirmLabel ?? 'Confirm'}
        tone={dialog?.tone}
        busy={busy}
        error={pending ? actionError : null}
        onConfirm={executePending}
        onCancel={closeDialog}
      />
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
