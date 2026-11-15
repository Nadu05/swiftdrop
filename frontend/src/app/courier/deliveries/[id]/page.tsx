'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useCourierJob } from '@/hooks/api/use-courier';
import TaskSummary from '@/components/courier/active/TaskSummary';
import { canDo } from '@/components/courier/courierStatus';
import {
  ErrorState,
  LoadingState,
  PageHeader,
  PodSummary,
  formatDateTime,
} from '@/components/courier/CourierUI';

/**
 * Delivery details (/courier/deliveries/[id]): one of the courier own deliveries with the recipient,
 * address, current status, every delivery attempt and the proof of delivery. The backend answers 403
 * for another courier delivery, which is shown as an error and never as an empty page.
 */
export default function DeliveryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const assignmentId = decodeURIComponent(id);
  const { data: job, isLoading, isError, error, refetch } = useCourierJob(assignmentId);

  if (isLoading) return <LoadingState text="Loading delivery details…" />;
  if (isError || !job) {
    return (
      <div className="cp-page">
        <ErrorState
          message={error instanceof Error ? error.message : 'Could not load this delivery.'}
          onRetry={() => refetch()}
        />
        <Link href="/courier/deliveries" className="cp-btn cp-btn--secondary">
          <ArrowLeft size={15} aria-hidden="true" /> Back to my tasks
        </Link>
      </div>
    );
  }

  const canWork = canDo(job, 'ACCEPT') || canDo(job, 'PICKUP') || canDo(job, 'DELIVER') || canDo(job, 'FAIL');
  const attempts = job.attempts ?? [];

  return (
    <div className="cp-page">
      <PageHeader
        title={`Delivery ${job.trackingNumber}`}
        subtitle={`Order ${job.orderId}`}
        action={
          canWork ? (
            <Link href={`/courier/active?job=${encodeURIComponent(job.assignmentId)}`} className="cp-btn cp-btn--primary">
              Work on this task <ArrowRight size={15} aria-hidden="true" />
            </Link>
          ) : (
            <Link href="/courier/history" className="cp-btn cp-btn--secondary">
              Job history
            </Link>
          )
        }
      />

      <TaskSummary job={job} />

      <section className="cp-card cp-card--stack" aria-labelledby="cp-attempts">
        <h2 id="cp-attempts" className="cp-section__title">
          Delivery attempts
        </h2>
        {attempts.length === 0 ? (
          <p className="cp-muted cp-small">No delivery attempts yet.</p>
        ) : (
          <ol className="cp-timeline">
            {attempts.map((a) => (
              <li key={a.attemptNumber} className="cp-timeline__item is-done">
                <span className="cp-timeline__dot" aria-hidden="true" />
                <div>
                  <div className="cp-timeline__label">
                    Attempt {a.attemptNumber} · {a.outcome === 'SUCCESS' ? 'Delivered' : 'Failed'}
                    {a.outcome !== 'SUCCESS' && (a.failureReason || a.reason) ? `: ${a.failureReason || a.reason}` : ''}
                  </div>
                  {a.notes && <div className="cp-small">{a.notes}</div>}
                  {a.attemptedAt && <div className="cp-timeline__time">{formatDateTime(a.attemptedAt)}</div>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {job.proofOfDelivery && (
        <section className="cp-card cp-card--stack" aria-labelledby="cp-pod">
          <h2 id="cp-pod" className="cp-section__title">
            Proof of delivery
          </h2>
          <p className="cp-small">
            <PodSummary pod={job.proofOfDelivery} />
          </p>
          {job.completedAt && <p className="cp-muted cp-small">Delivered {formatDateTime(job.completedAt)}</p>}
        </section>
      )}

      <div>
        <Link href="/courier/deliveries" className="cp-btn cp-btn--secondary">
          <ArrowLeft size={15} aria-hidden="true" /> Back to my tasks
        </Link>
      </div>
    </div>
  );
}
