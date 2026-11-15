'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RotateCcw, TriangleAlert } from 'lucide-react';
import { deliveryFailureSchema, type DeliveryFailureFormValues } from '@/schema/dispatch.schema';
import { FAILED_DELIVERY_REASONS, type CourierJob } from '@/types/courier.types';
import { AttemptHistory } from '../CourierUI';
import { DEFAULT_MAX_ATTEMPTS } from '../courierStatus';

interface Props {
  job: CourierJob;
  busy: boolean;
  submitting: boolean;
  onSubmit: (values: DeliveryFailureFormValues) => Promise<boolean>;
}

/**
 * Failed delivery attempt with a reason. Shows the attempt count against the
 * three-attempt limit; the last attempt escalates to dispatcher exception review.
 */
export default function FailedAttemptForm({ job, busy, submitting, onSubmit }: Props) {
  const [open, setOpen] = useState(false);
  const form = useForm<DeliveryFailureFormValues>({
    resolver: zodResolver(deliveryFailureSchema),
    defaultValues: { reason: FAILED_DELIVERY_REASONS[0], notes: '' },
  });
  const errors = form.formState.errors;
  const attempt = (job.attemptCount ?? 0) + 1;
  const max = job.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const isLast = attempt >= max;

  useEffect(() => {
    setOpen(false);
    form.reset({ reason: FAILED_DELIVERY_REASONS[0], notes: '' });
  }, [job.assignmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = form.handleSubmit(async (values) => {
    if (await onSubmit(values)) setOpen(false);
  });

  return (
    <section className="cp-card cp-card--stack" aria-labelledby="cp-fail-title">
      <div className="cp-row cp-row--between">
        <div>
          <h2 id="cp-fail-title" className="cp-section__title">
            Can&apos;t deliver?
          </h2>
          <p className={`cp-small ${isLast ? 'cp-text-error' : 'cp-muted'}`}>
            {isLast
              ? `This is attempt ${attempt} of ${max}. Reporting it sends the parcel to dispatcher review.`
              : `Attempt ${attempt} of ${max}. The parcel goes back to the branch for another try.`}
          </p>
        </div>
        <TriangleAlert size={18} className="cp-text-warning" aria-hidden="true" />
      </div>

      <AttemptHistory job={job} />

      {!open ? (
        <button type="button" className="cp-btn cp-btn--warning cp-btn--block" onClick={() => setOpen(true)}>
          <RotateCcw size={15} aria-hidden="true" /> Report failed attempt
        </button>
      ) : (
        <form onSubmit={submit} className="cp-stack" noValidate>
          <div>
            <label className="cp-label" htmlFor="fail-reason">
              Reason
            </label>
            <select id="fail-reason" className="cp-input" aria-invalid={Boolean(errors.reason)} {...form.register('reason')}>
              {FAILED_DELIVERY_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {errors.reason && <span className="cp-error">{errors.reason.message}</span>}
          </div>
          <div>
            <label className="cp-label" htmlFor="fail-notes">
              What happened
            </label>
            <textarea
              id="fail-notes"
              rows={3}
              className="cp-input"
              placeholder="Calls made, gate status, what the recipient asked…"
              aria-invalid={Boolean(errors.notes)}
              {...form.register('notes')}
            />
            {errors.notes && <span className="cp-error">{errors.notes.message}</span>}
          </div>
          <div className="cp-actions cp-actions--stack-mobile">
            <button type="button" className="cp-btn cp-btn--secondary" disabled={busy} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="cp-btn cp-btn--danger" disabled={busy}>
              {submitting ? 'Submitting…' : 'Submit failed attempt'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
