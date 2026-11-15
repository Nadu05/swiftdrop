'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2, Upload } from 'lucide-react';
import { podSubmissionSchema, type PodSubmissionFormValues } from '@/schema/dispatch.schema';
import type { CourierJob, ProofOfDeliveryType } from '@/types/courier.types';

const POD_TYPES: { value: ProofOfDeliveryType; label: string }[] = [
  { value: 'OTP', label: 'OTP' },
  { value: 'SIGNATURE', label: 'Signature' },
  { value: 'PHOTO', label: 'Photo' },
];

const REFERENCE_LABEL: Record<ProofOfDeliveryType, string> = {
  OTP: 'OTP code from the recipient',
  SIGNATURE: 'Signature reference or typed sign-off',
  PHOTO: 'Photo reference',
};

const REFERENCE_PLACEHOLDER: Record<ProofOfDeliveryType, string> = {
  OTP: 'e.g. 482910',
  SIGNATURE: 'Signature reference or signed name',
  PHOTO: 'Upload a photo above or enter a reference',
};

const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

interface Props {
  job: CourierJob;
  busy: boolean;
  submitting: boolean;
  onSubmit: (values: PodSubmissionFormValues) => Promise<void>;
}

/** Proof of delivery (OTP, signature or photo) for a delivery in transit. Validated with Zod. */
export default function ProofOfDeliveryForm({ job, busy, submitting, onSubmit }: Props) {
  const [photoName, setPhotoName] = useState<string | null>(null);
  const form = useForm<PodSubmissionFormValues>({
    resolver: zodResolver(podSubmissionSchema),
    defaultValues: { type: 'OTP', receivedBy: job.recipient.name || '', reference: '', notes: '' },
  });
  const podType = form.watch('type');
  const reference = form.watch('reference');
  const errors = form.formState.errors;

  useEffect(() => {
    setPhotoName(null);
    form.reset({ type: 'OTP', receivedBy: job.recipient.name || '', reference: '', notes: '' });
  }, [job.assignmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      form.setError('reference', { message: 'Photo must be 3 MB or smaller.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        form.setValue('reference', reader.result, { shouldValidate: true });
        setPhotoName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="cp-card cp-card--stack" noValidate>
      <div className="cp-row cp-row--between">
        <h2 className="cp-section__title">Complete delivery</h2>
        <CheckCircle2 size={18} className="cp-text-success" aria-hidden="true" />
      </div>

      <fieldset>
        <legend className="cp-label">Proof of delivery</legend>
        <div className="cp-segmented" role="radiogroup">
          {POD_TYPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={podType === value}
              className={`cp-btn ${podType === value ? 'cp-btn--primary' : 'cp-btn--secondary'}`}
              onClick={() => {
                form.setValue('type', value, { shouldValidate: true });
                form.setValue('reference', '');
                setPhotoName(null);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="cp-label" htmlFor="pod-receivedBy">
          Received by
        </label>
        <input
          id="pod-receivedBy"
          className="cp-input"
          placeholder="Full name of the person receiving the parcel"
          aria-invalid={Boolean(errors.receivedBy)}
          {...form.register('receivedBy')}
        />
        {errors.receivedBy && <span className="cp-error">{errors.receivedBy.message}</span>}
      </div>

      {podType === 'PHOTO' && (
        <div>
          <label className="cp-upload" htmlFor="pod-photo">
            <Upload size={16} aria-hidden="true" />
            <span>{photoName ? `Attached: ${photoName}` : 'Take or choose a photo (max 3 MB)'}</span>
          </label>
          <input id="pod-photo" type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="cp-sr-only" />
        </div>
      )}

      <div>
        <label className="cp-label" htmlFor="pod-reference">
          {REFERENCE_LABEL[podType]}
        </label>
        <input
          id="pod-reference"
          className="cp-input"
          inputMode={podType === 'OTP' ? 'numeric' : undefined}
          autoComplete="off"
          placeholder={REFERENCE_PLACEHOLDER[podType]}
          aria-invalid={Boolean(errors.reference)}
          {...form.register('reference')}
          value={reference?.startsWith('data:image/') ? photoName || 'Photo attached' : reference}
          onChange={(e) => {
            setPhotoName(null);
            form.setValue('reference', e.target.value, { shouldValidate: true });
          }}
        />
        {errors.reference && <span className="cp-error">{errors.reference.message}</span>}
      </div>

      <div>
        <label className="cp-label" htmlFor="pod-notes">
          Handover notes <span className="cp-muted">(optional)</span>
        </label>
        <textarea id="pod-notes" rows={2} className="cp-input" placeholder="e.g. Handed over at the main gate" {...form.register('notes')} />
      </div>

      <button type="submit" className="cp-btn cp-btn--primary cp-btn--block" disabled={busy}>
        {submitting ? <Loader2 size={16} className="cp-spin" aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
        {submitting ? 'Completing…' : 'Confirm delivery'}
      </button>
    </form>
  );
}
