'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, PackageCheck, X } from 'lucide-react';
import { useConfirmBranchDropoff, useDispatchBranches } from '@/hooks/api/use-dispatch';
import { branchDropoffSchema, type BranchDropoffFormValues } from '@/schema/dispatch.schema';

interface BranchDropoffDialogProps {
  isOpen: boolean;
  initialTrackingNumber?: string;
  initialBranchId?: number;
  onClose: () => void;
  onConfirmed: (message: string) => void;
}

export default function BranchDropoffDialog({
  isOpen,
  initialTrackingNumber = '',
  initialBranchId,
  onClose,
  onConfirmed,
}: BranchDropoffDialogProps) {
  const branchesQuery = useDispatchBranches();
  const confirmMutation = useConfirmBranchDropoff();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BranchDropoffFormValues>({
    resolver: zodResolver(branchDropoffSchema),
    defaultValues: {
      trackingNumber: initialTrackingNumber,
      parcelReference: '',
      branchId: initialBranchId ? String(initialBranchId) : '',
      notes: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      confirmMutation.reset();
      reset({
        trackingNumber: initialTrackingNumber,
        parcelReference: '',
        branchId: initialBranchId ? String(initialBranchId) : '',
        notes: '',
      });
    }
  }, [isOpen, initialTrackingNumber, initialBranchId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const onSubmit = handleSubmit(async (values) => {
    const task = await confirmMutation.mutateAsync({
      trackingNumber: values.trackingNumber,
      parcelReference: values.parcelReference || undefined,
      branchId: values.branchId ? Number(values.branchId) || undefined : undefined,
      notes: values.notes || undefined,
    });
    onConfirmed(
      `Branch drop-off confirmed for ${task.trackingNumber}. Order handed into dispatch custody.`
    );
    onClose();
  });

  return (
    <div
      className="dispatcher-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="branch-dropoff-title"
      onClick={() => !confirmMutation.isPending && onClose()}
    >
      <div
        className="dispatcher-modal-content"
        style={{ maxWidth: '520px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dispatcher-modal-header">
          <div>
            <h2 id="branch-dropoff-title" className="dispatcher-modal-title">
              Confirm Branch Drop-Off
            </h2>
            <p className="dispatcher-modal-subtitle">
              Record physical walk-in parcel intake at the origin branch and advance delivery state.
            </p>
          </div>
          <button
            type="button"
            className="dispatcher-modal-close"
            onClick={onClose}
            disabled={confirmMutation.isPending}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="dispatcher-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {confirmMutation.isError && (
            <div className="dispatcher-error-banner" role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              <div className="dispatcher-error-banner__body">
                <strong>Drop-off confirmation failed</strong>
                <p>
                  {confirmMutation.error instanceof Error
                    ? confirmMutation.error.message
                    : 'Could not confirm branch drop-off.'}
                </p>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="dropoff-tracking" className="dispatcher-label">
              Tracking Number <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              id="dropoff-tracking"
              type="text"
              placeholder="e.g. SD-20261114-1001"
              className="dispatcher-input"
              {...register('trackingNumber')}
            />
            {errors.trackingNumber && (
              <p className="mt-1 text-xs text-red-600">{errors.trackingNumber.message}</p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label htmlFor="dropoff-branch" className="dispatcher-label">
                Origin Branch (Optional)
              </label>
              <select id="dropoff-branch" className="dispatcher-select" style={{ width: '100%' }} {...register('branchId')}>
                <option value="">Auto-detect from task</option>
                {(branchesQuery.data || []).map((branch) => (
                  <option key={branch.id} value={String(branch.id)}>
                    {branch.name} ({branch.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="dropoff-ref" className="dispatcher-label">
                Parcel Intake Reference
              </label>
              <input
                id="dropoff-ref"
                type="text"
                placeholder="e.g. PKG-COUNTER-04"
                className="dispatcher-input"
                {...register('parcelReference')}
              />
              {errors.parcelReference && (
                <p className="mt-1 text-xs text-red-600">{errors.parcelReference.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="dropoff-notes" className="dispatcher-label">
              Intake Notes (Optional)
            </label>
            <textarea
              id="dropoff-notes"
              rows={2}
              placeholder="Package condition, weight check, counter clerk note..."
              className="dispatcher-input"
              {...register('notes')}
            />
          </div>

          <div className="dispatcher-modal-footer" style={{ padding: 0, borderTop: 'none', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="dispatcher-modal-btn-cancel"
              onClick={onClose}
              disabled={confirmMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="dispatcher-btn-primary"
              disabled={confirmMutation.isPending}
            >
              <PackageCheck size={16} aria-hidden="true" />
              <span>{confirmMutation.isPending ? 'Confirming...' : 'Confirm Drop-Off Intake'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

