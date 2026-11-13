'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useReportFailedDelivery } from '@/hooks/api/use-courier';
import { failedDeliverySchema, type FailedDeliveryFormValues } from '@/schema/courier.schema';
import { FAILED_DELIVERY_REASONS, type CourierJob } from '@/types/courier.types';
import { errorMessage } from '../CourierUI';

/** ACCEPTED / IN_TRANSIT -> FAILED with a reason (design: Courier App / Failed Delivery Reason). */
export default function FailedDeliveryForm({ job, onCancel }: { job: CourierJob; onCancel: () => void }) {
  const mutation = useReportFailedDelivery();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FailedDeliveryFormValues>({
    resolver: zodResolver(failedDeliverySchema),
    defaultValues: { reason: FAILED_DELIVERY_REASONS[0], notes: '' },
  });

  return (
    <form
      className="glass-card courier-stack"
      noValidate
      onSubmit={handleSubmit((values) => mutation.mutate({ assignmentId: job.assignmentId, input: values }))}
    >
      <h2 className="courier-card-title">Report failed delivery</h2>
      <p className="courier-muted">Your branch dispatcher will see this reason and reschedule or return the parcel.</p>

      <label className="courier-form-field">
        Reason
        <select className="input-field" aria-invalid={!!errors.reason} {...register('reason')}>
          {FAILED_DELIVERY_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {reason}
            </option>
          ))}
        </select>
        {errors.reason && (
          <span className="courier-field-error" role="alert">
            {errors.reason.message}
          </span>
        )}
      </label>

      <label className="courier-form-field">
        Notes for your branch
        <textarea
          className="input-field"
          rows={3}
          placeholder="e.g. Called twice, no answer. Gate locked."
          aria-invalid={!!errors.notes}
          aria-describedby={errors.notes ? 'fail-notes-error' : undefined}
          {...register('notes')}
        />
        {errors.notes && (
          <span id="fail-notes-error" className="courier-field-error" role="alert">
            {errors.notes.message}
          </span>
        )}
      </label>

      <div className="courier-row">
        <button type="submit" className="btn btn-danger" disabled={mutation.isPending}>
          {mutation.isPending ? 'Submitting…' : 'Submit failed delivery'}
        </button>
        <button type="button" className="btn btn-secondary" disabled={mutation.isPending} onClick={onCancel}>
          Cancel
        </button>
      </div>

      {mutation.isError && (
        <p className="courier-alert" role="alert">
          {errorMessage(mutation.error, 'Could not report this failed delivery.')}
        </p>
      )}
    </form>
  );
}
