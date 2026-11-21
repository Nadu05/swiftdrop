'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  PackageCheck,
  Phone,
  RotateCcw,
  Upload,
} from 'lucide-react';
import { mapDeliveryJobDtoToCourierJob } from '@/api/services/courier.api';
import {
  describeActionError,
  isActiveJob,
  useCourierData,
  useDeliverCourierTaskMutation,
  useFailCourierTaskMutation,
  usePickupCourierTaskMutation,
  useUploadPodPhotoMutation,
} from '@/hooks/api/use-courier';
import ConfirmDialog from '@/components/courier/ConfirmDialog';
import { canDo } from '@/components/courier/courierActions';
import {
  deliveryFailureSchema,
  podSubmissionSchema,
  type DeliveryFailureFormValues,
  type PodSubmissionFormValues,
} from '@/schema/dispatch.schema';
import {
  EmptyState,
  ErrorState,
  Field,
  JobStatusBadge,
  LoadingState,
  PageHeader,
  PriorityTag,
  TaskTypeBadge,
  formatLkr,
  formatTime,
} from '@/components/courier/CourierUI';
import {
  FAILED_DELIVERY_REASONS,
  type CourierJob,
  type ProofOfDeliveryType,
} from '@/types/courier.types';

/**
 * Courier Active Delivery & Field Completion page (`/courier/active`).
 * Supports both Pickup Tasks (`PKP-*`) and Last-Mile Delivery Jobs (`DLV-*`)
 * with React Hook Form + Zod validated POD upload/OTP/signature and failure reporting.
 */
type PendingAction =
  | { kind: 'pickup' }
  | { kind: 'deliver'; values: PodSubmissionFormValues }
  | { kind: 'fail'; values: DeliveryFailureFormValues };

function ActiveDeliveryContent() {
  const params = useSearchParams();
  // Her job card links with ?assignmentId=, the dashboard with ?job=; accept both.
  const requestedId = params.get('job') ?? params.get('assignmentId');

  const { jobs, replaceJob, loading, error, reload } = useCourierData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showFailForm, setShowFailForm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [photoPreviewName, setPhotoPreviewName] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const pickupMutation = usePickupCourierTaskMutation();
  const deliverMutation = useDeliverCourierTaskMutation();
  const failMutation = useFailCourierTaskMutation();
  const uploadMutation = useUploadPodPhotoMutation();

  // A failed attempt that can still be retried stays in the list until it is delivered or escalated.
  const activeList = jobs.filter((j) => isActiveJob(j) || (j.status === 'FAILED' && canDo(j, 'DELIVER')));
  const currentId = requestedId || selectedId || activeList[0]?.assignmentId || jobs[0]?.assignmentId;
  const job: CourierJob | undefined = jobs.find((j) => j.assignmentId === currentId);

  const isPickupTask = job?.taskType === 'PICKUP';
  const busy =
    pickupMutation.isPending ||
    deliverMutation.isPending ||
    failMutation.isPending ||
    uploadMutation.isPending;

  const podForm = useForm<PodSubmissionFormValues>({
    resolver: zodResolver(podSubmissionSchema),
    defaultValues: {
      type: 'OTP',
      receivedBy: '',
      reference: '',
      notes: '',
    },
  });

  const failForm = useForm<DeliveryFailureFormValues>({
    resolver: zodResolver(deliveryFailureSchema),
    defaultValues: {
      reason: FAILED_DELIVERY_REASONS[0],
      notes: '',
    },
  });

  const podType = podForm.watch('type');
  const podReference = podForm.watch('reference');

  useEffect(() => {
    setShowFailForm(false);
    setActionError(null);
    setPhotoPreviewName(null);
    setPhotoError(null);
    setPending(null);
    if (job) {
      podForm.reset({
        type: 'OTP',
        receivedBy: job.recipient.name || '',
        reference: '',
        notes: '',
      });
      failForm.reset({
        reason: FAILED_DELIVERY_REASONS[0],
        notes: '',
      });
    }
  }, [job?.assignmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeDialog = () => {
    if (busy) return;
    setPending(null);
    setActionError(null);
  };

  /** Asks for confirmation first; nothing is sent to the backend until the courier confirms. */
  const handleConfirmPickup = () => {
    if (!job) return;
    setActionError(null);
    setPending({ kind: 'pickup' });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !job) return;
    setPhotoError(null);
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setPhotoError('Use a JPEG or PNG photo.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Photo must be 5 MB or smaller.');
      return;
    }
    try {
      // The photo is stored by the backend; the form only keeps the returned reference.
      const reference = await uploadMutation.mutateAsync({ id: job.assignmentId, file });
      podForm.setValue('reference', reference, { shouldValidate: true });
      setPhotoPreviewName(file.name);
    } catch (err) {
      setPhotoError(describeActionError(err, 'The photo could not be uploaded. Try again.'));
    }
  };

  const handlePodSubmit = podForm.handleSubmit((values) => {
    if (!job) return;
    setActionError(null);
    setPending({ kind: 'deliver', values });
  });

  const handleFailSubmit = failForm.handleSubmit((values) => {
    if (!job) return;
    setActionError(null);
    setPending({ kind: 'fail', values });
  });

  /** Runs the confirmed action. The success message appears only after the backend has answered successfully. */
  const executePending = async () => {
    if (!job || !pending) return;
    setActionError(null);
    setNotice(null);
    try {
      if (pending.kind === 'pickup') {
        const updated = mapDeliveryJobDtoToCourierJob(await pickupMutation.mutateAsync(job.assignmentId));
        replaceJob(updated);
        setNotice(
          isPickupTask
            ? `Pickup confirmed for ${updated.trackingNumber}. Parcel transferred to branch inbound queue.`
            : `Parcel ${updated.trackingNumber} marked IN TRANSIT for last-mile delivery.`
        );
      } else if (pending.kind === 'deliver') {
        const { values } = pending;
        const dto = await deliverMutation.mutateAsync({
          id: job.assignmentId,
          payload: {
            type: values.type,
            receivedBy: values.receivedBy,
            reference: values.reference,
            notes: values.notes || undefined,
          },
        });
        const updated = mapDeliveryJobDtoToCourierJob(dto);
        replaceJob(updated);
        setNotice(`Proof of delivery recorded for ${updated.trackingNumber}. Delivery completed!`);
      } else {
        const dto = await failMutation.mutateAsync({ id: job.assignmentId, payload: pending.values });
        const updated = mapDeliveryJobDtoToCourierJob(dto);
        replaceJob(updated);
        setShowFailForm(false);
        failForm.reset({ reason: FAILED_DELIVERY_REASONS[0], notes: '' });
        const nextCount = updated.attemptCount ?? (job.attemptCount ?? 0) + 1;
        const limit = updated.maxAttempts ?? 3;
        setNotice(
          nextCount >= limit
            ? `Failure recorded (${nextCount}/${limit}). Escalated to Dispatcher exception review.`
            : `Failure recorded (Attempt ${nextCount}/${limit}). You can try this delivery again.`
        );
      }
      setPending(null);
    } catch (err) {
      // Keep the dialog open and show the error; never show a success message for a failed request.
      setActionError(describeActionError(err));
    }
  };

  const dialog = (() => {
    if (!pending || !job) return null;
    if (pending.kind === 'pickup') {
      return {
        title: isPickupTask ? 'Confirm parcel collected?' : 'Confirm picked up?',
        message: isPickupTask
          ? `Confirm you have parcel ${job.trackingNumber} from the sender.`
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
    const limit = job.maxAttempts ?? 3;
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

  const attemptCount = job?.attemptCount ?? 0;
  const maxAttempts = job?.maxAttempts ?? 3;
  const podPlaceholder: Record<ProofOfDeliveryType, string> = {
    OTP: '6-digit recipient OTP (e.g. 482910)',
    SIGNATURE: 'Signature reference or signed recipient name',
    PHOTO: 'Upload image below or enter photo URL / reference',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        title="Active Task Execution"
        subtitle="Confirm pickups, upload proof of delivery, or report failed delivery attempts"
        action={
          <Link href="/courier/deliveries" className="btn btn-secondary">
            All Assigned Tasks
          </Link>
        }
      />

      {activeList.length > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {activeList.map((item) => {
            const active = item.assignmentId === job?.assignmentId;
            return (
              <button
                key={item.assignmentId}
                type="button"
                onClick={() => setSelectedId(item.assignmentId)}
                className={active ? 'btn btn-primary' : 'btn btn-secondary'}
              >
                {item.trackingNumber} ({item.taskType === 'PICKUP' ? 'Pickup' : 'Delivery'})
              </button>
            );
          })}
        </div>
      )}

      {loading && <LoadingState text="Loading active task..." />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {notice && (
        <div
          className="glass-card"
          style={{
            borderColor: 'rgba(16, 185, 129, 0.45)',
            color: '#047857',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{notice}</span>
        </div>
      )}

      {!loading && !error && !job && (
        <EmptyState
          text="You have no active task selected right now. Accept an assigned task to begin."
          action={
            <Link href="/courier/deliveries" className="btn btn-primary">
              View Assigned Tasks
            </Link>
          }
        />
      )}

      {job && (
        <>
          {/* Task Header Card */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '1.2rem', color: '#0f172a' }}>{job.trackingNumber}</strong>
                <JobStatusBadge status={job.status} />
                <TaskTypeBadge taskType={job.taskType} />
                <PriorityTag priority={job.priority} />
                {!isPickupTask && (
                  <span style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 600 }}>
                    Attempt {Math.min(attemptCount + (job.status === 'IN_TRANSIT' ? 1 : 0), maxAttempts)}/{maxAttempts}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0369a1' }}>
                {formatLkr(job.payoutLkr)}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <Field label={isPickupTask ? 'Collect From Sender' : 'Pickup Address'}>
                <strong>{job.merchantName}</strong>
                <div style={{ color: '#64748b', fontSize: '0.82rem' }}>{job.pickupAddress}</div>
              </Field>
              <Field label="Recipient & Drop-off">
                <strong>
                  {job.recipient.name} ({job.recipient.city})
                </strong>
                <div style={{ color: '#64748b', fontSize: '0.82rem' }}>{job.recipient.address}</div>
                {job.recipient.phone && job.recipient.phone !== '—' && (
                  <a
                    href={`tel:${job.recipient.phone}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      color: '#2563eb',
                      fontSize: '0.82rem',
                      textDecoration: 'none',
                      marginTop: '0.2rem',
                    }}
                  >
                    <Phone size={12} /> {job.recipient.phone}
                  </a>
                )}
              </Field>
              <Field label="Parcel Details">
                <span>
                  {job.parcel.category} · {job.parcel.weightKg} kg · {job.distanceKm} km
                </span>
                {job.paymentMethod === 'COD' && job.codAmount ? (
                  <div style={{ color: '#b45309', fontSize: '0.82rem', fontWeight: 600 }}>
                    Cash on Delivery: {formatLkr(job.codAmount)}
                  </div>
                ) : null}
                {job.parcel.handlingNotes && (
                  <div style={{ color: '#b45309', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                    Note: {job.parcel.handlingNotes}
                  </div>
                )}
              </Field>
              <Field label="Timestamps">
                <span>Assigned: {formatTime(job.assignedAt)}</span>
                {job.pickedUpAt && (
                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                    Collected: {formatTime(job.pickedUpAt)}
                  </span>
                )}
              </Field>
            </div>
          </div>

          {actionError && !pending && (
            <div className="glass-card" role="alert" style={{ borderColor: 'rgba(239, 68, 68, 0.45)', color: '#dc2626' }}>
              {actionError}
            </div>
          )}

          {/* Step 0: ASSIGNED -> must accept first */}
          {canDo(job, 'ACCEPT') && (
            <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ color: '#475569', fontSize: '0.9rem' }}>
                This task is still awaiting your acceptance. Accept it before confirming parcel collection.
              </span>
              <Link href="/courier/deliveries" className="btn btn-primary">
                Go to Assigned Tasks
              </Link>
            </div>
          )}

          {/* Step 1: ACCEPTED -> Confirm Pickup / Parcel Collection */}
          {canDo(job, 'PICKUP') && (
            <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                  {isPickupTask ? 'Confirm Customer/Merchant Parcel Pickup' : 'Confirm Parcel Picked Up for Delivery'}
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>
                  {isPickupTask
                    ? 'Confirm once you have collected the parcel from the sender and transferred it into origin branch custody.'
                    : 'Confirm once you have scanned and loaded the parcel from the origin/destination branch.'}
                </p>
              </div>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={handleConfirmPickup}>
                {pickupMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <PackageCheck size={16} />
                )}
                {pickupMutation.isPending
                  ? 'Confirming...'
                  : isPickupTask
                  ? 'Confirm Parcel Collected'
                  : 'Confirm Picked Up & Start Route'}
              </button>
            </div>
          )}

          {/* Step 2: IN_TRANSIT (Last-mile Delivery) -> Complete Delivery (POD) OR Report Failure */}
          {(canDo(job, 'DELIVER') || canDo(job, 'FAIL')) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {/* Proof of Delivery Form (RHF + Zod) */}
              <form onSubmit={handlePodSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                    Complete Delivery & Proof of Delivery
                  </h2>
                  <CheckCircle2 size={18} color="#10b981" />
                </div>

                <div>
                  <label style={labelStyle}>Verification Method</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                    {(['OTP', 'SIGNATURE', 'PHOTO'] as ProofOfDeliveryType[]).map((typeOption) => {
                      const active = podType === typeOption;
                      return (
                        <button
                          key={typeOption}
                          type="button"
                          onClick={() => {
                            podForm.setValue('type', typeOption, { shouldValidate: true });
                            podForm.setValue('reference', '');
                            setPhotoPreviewName(null);
                          }}
                          className={active ? 'btn btn-primary' : 'btn btn-secondary'}
                          style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                        >
                          {typeOption}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label style={labelStyle} htmlFor="pod-receivedBy">
                    Received By (Recipient Full Name)
                  </label>
                  <input
                    id="pod-receivedBy"
                    type="text"
                    {...podForm.register('receivedBy')}
                    placeholder="Full name of person receiving parcel"
                    style={inputStyle}
                  />
                  {podForm.formState.errors.receivedBy && (
                    <span style={errorTextStyle}>{podForm.formState.errors.receivedBy.message}</span>
                  )}
                </div>

                {podType === 'PHOTO' && (
                  <div>
                    <label style={labelStyle} htmlFor="pod-photo-upload">
                      Upload Delivery Photo (Optional if entering URL/reference)
                    </label>
                    <label
                      htmlFor="pod-photo-upload"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px dashed #93c5fd',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                    >
                      {uploadMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                      <span>
                        {uploadMutation.isPending
                          ? 'Uploading photo...'
                          : photoPreviewName
                          ? `Attached: ${photoPreviewName}`
                          : 'Choose delivery photo (JPEG/PNG, max 5 MB)'}
                      </span>
                    </label>
                    <input
                      id="pod-photo-upload"
                      type="file"
                      accept="image/jpeg,image/png"
                      disabled={uploadMutation.isPending}
                      onChange={handlePhotoUpload}
                      style={{ display: 'none' }}
                    />
                    {photoError && (
                      <span role="alert" style={errorTextStyle}>
                        {photoError}
                      </span>
                    )}
                  </div>
                )}

                <div>
                  <label style={labelStyle} htmlFor="pod-reference">
                    {podType === 'OTP'
                      ? 'OTP Verification Code'
                      : podType === 'SIGNATURE'
                      ? 'Signature Reference / Typed Sign-off'
                      : 'Photo Reference / Data URI'}
                  </label>
                  <input
                    id="pod-reference"
                    type="text"
                    {...podForm.register('reference')}
                    value={podReference?.startsWith('data:image/') ? photoPreviewName || '[Uploaded Photo Attached]' : podReference}
                    onChange={(e) => {
                      setPhotoPreviewName(null);
                      podForm.setValue('reference', e.target.value, { shouldValidate: true });
                    }}
                    placeholder={podPlaceholder[podType]}
                    style={inputStyle}
                  />
                  {podForm.formState.errors.reference && (
                    <span style={errorTextStyle}>{podForm.formState.errors.reference.message}</span>
                  )}
                </div>

                <div>
                  <label style={labelStyle} htmlFor="pod-notes">
                    Handover Notes (Optional)
                  </label>
                  <textarea
                    id="pod-notes"
                    rows={2}
                    {...podForm.register('notes')}
                    placeholder="e.g. Handed over at main gate reception"
                    style={inputStyle}
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {deliverMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  {deliverMutation.isPending ? 'Completing Delivery...' : 'Confirm Delivery Complete'}
                </button>
              </form>

              {/* Failed Delivery Form (RHF + Zod) */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                      Delivery Issue / Failed Attempt
                    </h2>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                      {attemptCount + 1 >= maxAttempts
                        ? `Warning: Recording this failure hits the ${maxAttempts}-attempt limit and escalates to Dispatcher review.`
                        : `Attempt ${attemptCount + 1} of ${maxAttempts} allowed before escalation.`}
                    </p>
                  </div>
                  <AlertTriangle size={18} color="#f59e0b" />
                </div>

                {job.attempts && job.attempts.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.78rem', color: '#475569', background: '#f8fafc', padding: '0.65rem', borderRadius: '8px' }}>
                    <strong style={{ color: '#b45309' }}>Previous Attempt History:</strong>
                    {job.attempts.map((a) => (
                      <div key={a.attemptNumber}>
                        Attempt #{a.attemptNumber}: {a.reason || a.failureReason || a.status}{' '}
                        {a.notes ? `— ${a.notes}` : ''}
                      </div>
                    ))}
                  </div>
                )}

                {!showFailForm ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ borderColor: 'rgba(245, 158, 11, 0.4)', color: '#b45309', alignSelf: 'flex-start' }}
                    onClick={() => setShowFailForm(true)}
                  >
                    <RotateCcw size={15} /> Report Failed Delivery Attempt
                  </button>
                ) : (
                  <form onSubmit={handleFailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div>
                      <label style={labelStyle} htmlFor="fail-reason">
                        Failure Reason
                      </label>
                      <select id="fail-reason" {...failForm.register('reason')} style={inputStyle}>
                        {FAILED_DELIVERY_REASONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      {failForm.formState.errors.reason && (
                        <span style={errorTextStyle}>{failForm.formState.errors.reason.message}</span>
                      )}
                    </div>

                    <div>
                      <label style={labelStyle} htmlFor="fail-notes">
                        Field Notes
                      </label>
                      <textarea
                        id="fail-notes"
                        rows={3}
                        {...failForm.register('notes')}
                        placeholder="Describe call attempts, gate status, or customer request..."
                        style={inputStyle}
                      />
                      {failForm.formState.errors.notes && (
                        <span style={errorTextStyle}>{failForm.formState.errors.notes.message}</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={busy}
                        style={{ background: '#d97706' }}
                      >
                        {failMutation.isPending ? 'Submitting...' : 'Submit Failed Attempt'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={busy}
                        onClick={() => setShowFailForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* Completed or Failed Terminal Summary */}
          {(job.status === 'DELIVERED' || (job.status === 'FAILED' && !canDo(job, 'DELIVER') && !canDo(job, 'FAIL'))) && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                {job.status === 'DELIVERED'
                  ? isPickupTask
                    ? 'Pickup Handed Over to Branch'
                    : 'Delivery Completed'
                  : 'Attempt Failed'}
              </h2>
              {job.status === 'DELIVERED' && job.proofOfDelivery && (
                <p style={{ fontSize: '0.88rem', color: '#475569' }}>
                  POD ({job.proofOfDelivery.type}) received by <strong>{job.proofOfDelivery.receivedBy}</strong>{' '}
                  — ref: <code>{job.proofOfDelivery.reference}</code>
                </p>
              )}
              {job.status === 'FAILED' && job.failure && (
                <p style={{ fontSize: '0.88rem', color: '#dc2626' }}>
                  Reason: <strong>{job.failure.reason}</strong> — {job.failure.notes}
                </p>
              )}
              <div style={{ marginTop: '0.4rem' }}>
                <Link href="/courier/deliveries" className="btn btn-secondary">
                  Back to My Assigned Tasks
                </Link>
              </div>
            </div>
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

export default function ActiveDeliveryPage() {
  return (
    <Suspense fallback={<LoadingState text="Loading active task..." />}>
      <ActiveDeliveryContent />
    </Suspense>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 600,
  color: '#64748b',
  marginBottom: '0.35rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.75rem',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  color: '#0f172a',
  fontSize: '0.88rem',
  outline: 'none',
};

const errorTextStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  color: '#dc2626',
  marginTop: '0.25rem',
};
