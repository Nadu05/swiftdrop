'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Gavel, X } from 'lucide-react';
import type { DeliveryExceptionDto } from '@/api/services/dispatch.api';
import { useDecideException } from '@/hooks/api/use-dispatch';
import {
  exceptionDecisionSchema,
  type ExceptionDecisionFormValues,
} from '@/schema/dispatch.schema';

interface ExceptionDecisionDialogProps {
  exceptionItem: DeliveryExceptionDto | null;
  onClose: () => void;
  onResolved: (updated: DeliveryExceptionDto) => void;
}

const DECISION_OPTIONS: Array<{
  value: ExceptionDecisionFormValues['decisionAction'];
  label: string;
  description: string;
}> = [
  {
    value: 'RETURN_TO_SENDER',
    label: 'Return to Sender',
    description: 'Finalize failure and initiate return transit to origin branch/sender.',
  },
  {
    value: 'RESCHEDULE_DELIVERY',
    label: 'Reschedule Final Delivery',
    description: 'Re-queue job as UNASSIGNED for a dispatcher-approved follow-up attempt.',
  },
  {
    value: 'HOLD_AT_BRANCH',
    label: 'Hold at Destination Branch',
    description: 'Hold parcel at branch counter for customer self-collection or instructions.',
  },
];

export default function ExceptionDecisionDialog({
  exceptionItem,
  onClose,
  onResolved,
}: ExceptionDecisionDialogProps) {
  const decideMutation = useDecideException();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ExceptionDecisionFormValues>({
    resolver: zodResolver(exceptionDecisionSchema),
    defaultValues: {
      decisionAction: 'RETURN_TO_SENDER',
      decisionReason: '',
    },
  });

  const selectedAction = watch('decisionAction');

  useEffect(() => {
    if (exceptionItem) {
      decideMutation.reset();
      reset({
        decisionAction: 'RETURN_TO_SENDER',
        decisionReason: '',
      });
    }
  }, [exceptionItem?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!exceptionItem) return null;

  const onSubmit = handleSubmit(async (values) => {
    const updated = await decideMutation.mutateAsync({
      id: exceptionItem.id,
      payload: values,
    });
    onResolved(updated);
    onClose();
  });

  return (
    <div
      className="dispatcher-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exception-decision-title"
      onClick={() => !decideMutation.isPending && onClose()}
    >
      <div
        className="dispatcher-modal-content"
        style={{ maxWidth: '560px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dispatcher-modal-header">
          <div>
            <div className="dispatcher-modal-header-top">
              <span className="dispatcher-modal-order-tag">{exceptionItem.exceptionCode}</span>
              <span className="dispatcher-status-badge dispatcher-status-badge--danger">
                {exceptionItem.failedAttemptCount} Failed Attempts
              </span>
            </div>
            <h2 id="exception-decision-title" className="dispatcher-modal-title">
              Dispatcher Exception Decision
            </h2>
            <p className="dispatcher-modal-subtitle">
              Tracking {exceptionItem.trackingNumber} · {exceptionItem.recipientName || 'Recipient'}
            </p>
          </div>
          <button
            type="button"
            className="dispatcher-modal-close"
            onClick={onClose}
            disabled={decideMutation.isPending}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="dispatcher-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#991b1b' }}>
            <strong>Latest Courier Failure:</strong>{' '}
            {exceptionItem.lastFailureReason || 'Maximum delivery retry limit reached (3/3).'}
            {exceptionItem.deliveryAddress && (
              <div style={{ color: '#7f1d1d', marginTop: '0.2rem' }}>
                Address: {exceptionItem.deliveryAddress}
              </div>
            )}
          </div>

          {decideMutation.isError && (
            <div className="dispatcher-error-banner" role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              <div className="dispatcher-error-banner__body">
                <strong>Decision submission failed</strong>
                <p>
                  {decideMutation.error instanceof Error
                    ? decideMutation.error.message
                    : 'Could not submit exception decision.'}
                </p>
              </div>
            </div>
          )}

          <div>
            <span className="dispatcher-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Select Operational Resolution <span style={{ color: '#dc2626' }}>*</span>
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {DECISION_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.6rem',
                    padding: '0.7rem 0.85rem',
                    borderRadius: '8px',
                    border:
                      selectedAction === opt.value
                        ? '1.5px solid #2563eb'
                        : '1px solid #e2e8f0',
                    background: selectedAction === opt.value ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    value={opt.value}
                    {...register('decisionAction')}
                    style={{ marginTop: '3px' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{opt.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="decision-reason" className="dispatcher-label">
              Audit Justification &amp; Dispatcher Notes <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              id="decision-reason"
              rows={3}
              placeholder="Document customer contact verification, branch supervisor approval, or return instruction..."
              className="dispatcher-input"
              {...register('decisionReason')}
            />
            {errors.decisionReason && (
              <p className="mt-1 text-xs text-red-600">{errors.decisionReason.message}</p>
            )}
          </div>

          <div className="dispatcher-modal-footer" style={{ padding: 0, borderTop: 'none' }}>
            <button
              type="button"
              className="dispatcher-modal-btn-cancel"
              onClick={onClose}
              disabled={decideMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="dispatcher-btn-primary"
              disabled={decideMutation.isPending}
            >
              <Gavel size={15} aria-hidden="true" />
              <span>
                {decideMutation.isPending ? 'Recording Decision...' : 'Confirm Decision'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

