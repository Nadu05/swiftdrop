'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCompleteDelivery } from '@/hooks/api/use-courier';
import { proofOfDeliverySchema, type ProofOfDeliveryFormValues } from '@/schema/courier.schema';
import type { CourierJob } from '@/types/courier.types';
import { errorMessage } from '../CourierUI';

const REFERENCE_LABEL: Record<ProofOfDeliveryFormValues['type'], string> = {
  OTP: 'One-time code the customer received',
  SIGNATURE: 'Signature reference',
  PHOTO: 'Photo reference',
};

/** IN_TRANSIT -> DELIVERED with proof of delivery (React Hook Form + Zod). */
export default function ProofOfDeliveryForm({ job, onCannotDeliver }: { job: CourierJob; onCannotDeliver: () => void }) {
  const mutation = useCompleteDelivery();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ProofOfDeliveryFormValues>({
    resolver: zodResolver(proofOfDeliverySchema),
    defaultValues: { type: 'OTP', reference: '', receivedBy: job.recipient.name },
  });
  const type = watch('type');

  return (
    <form
      className="glass-card courier-stack"
      noValidate
      onSubmit={handleSubmit((values) => mutation.mutate({ assignmentId: job.assignmentId, pod: values }))}
    >
      <h2 className="courier-card-title">Confirm delivery</h2>

      <label className="courier-form-field">
        Proof of delivery
        <select className="input-field" {...register('type')}>
          <option value="OTP">OTP code</option>
          <option value="SIGNATURE">Signature</option>
          <option value="PHOTO">Photo</option>
        </select>
      </label>

      <label className="courier-form-field">
        {REFERENCE_LABEL[type]}
        <input
          className="input-field"
          inputMode={type === 'OTP' ? 'numeric' : undefined}
          placeholder={type === 'OTP' ? 'e.g. 4417' : 'Reference'}
          aria-invalid={!!errors.reference}
          aria-describedby={errors.reference ? 'pod-reference-error' : undefined}
          {...register('reference')}
        />
        {errors.reference && (
          <span id="pod-reference-error" className="courier-field-error" role="alert">
            {errors.reference.message}
          </span>
        )}
      </label>

      <label className="courier-form-field">
        Received by
        <input
          className="input-field"
          aria-invalid={!!errors.receivedBy}
          aria-describedby={errors.receivedBy ? 'pod-received-error' : undefined}
          {...register('receivedBy')}
        />
        {errors.receivedBy && (
          <span id="pod-received-error" className="courier-field-error" role="alert">
            {errors.receivedBy.message}
          </span>
        )}
      </label>

      <div className="courier-row">
        <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Confirming…' : 'Confirm delivered'}
        </button>
        <button type="button" className="btn btn-secondary" disabled={mutation.isPending} onClick={onCannotDeliver}>
          Could not deliver
        </button>
      </div>

      {mutation.isError && (
        <p className="courier-alert" role="alert">
          {errorMessage(mutation.error, 'Could not complete this delivery.')}
        </p>
      )}
    </form>
  );
}
