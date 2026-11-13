'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Package, Phone } from 'lucide-react';
import { completeDelivery, markPickedUp, reportFailedDelivery } from '@/api/services/courier.api';
import {
  EmptyState,
  ErrorState,
  Field,
  JobStatusBadge,
  LoadingState,
  PageHeader,
  PriorityTag,
  formatLkr,
  formatTime,
} from '@/components/courier/CourierUI';
import { isActiveJob, useCourierData } from '@/hooks/api/use-courier';
import { FAILED_DELIVERY_REASONS, type CourierJob, type ProofOfDeliveryType } from '@/types/courier.types';

/**
 * Member 08: Active Delivery
 * Route: /courier/active (optional ?job=<assignmentId>)
 *
 * Steps the courier through ACCEPTED -> IN_TRANSIT -> DELIVERED, or FAILED with
 * a reason. These are the updates the dispatcher sees on Active Deliveries /
 * Delivery History and the customer sees on tracking.
 */
export default function ActiveDeliveryPage() {
  return (
    <Suspense fallback={<LoadingState text="Loading your delivery…" />}>
      <ActiveDelivery />
    </Suspense>
  );
}

function ActiveDelivery() {
  const jobParam = useSearchParams().get('job');
  const { jobs, replaceJob, loading, error, reload, profile } = useCourierData();
  // Remember which job is open so it stays on screen after it is finished
  // (otherwise the result message would be replaced by the next active job).
  const [openedId, setOpenedId] = useState<string | null>(null);

  const active = jobs.filter(isActiveJob);
  const job =
    jobs.find((j) => j.assignmentId === (jobParam ?? openedId)) ?? active[0];

  useEffect(() => {
    if (!jobParam && job && openedId !== job.assignmentId) setOpenedId(job.assignmentId);
  }, [jobParam, job, openedId]);

  if (loading && !profile) return <LoadingState text="Loading your delivery…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <PageHeader title="Active Delivery" subtitle="Pick up, deliver and confirm the job you are working on" />

      {!job ? (
        <EmptyState
          text="You have no delivery in progress. Accept a job to start."
          action={
            <Link href="/courier/deliveries" className="btn btn-primary">
              View my deliveries
            </Link>
          }
        />
      ) : (
        <>
          {active.length > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {active.map((j) => (
                <Link
                  key={j.assignmentId}
                  href={`/courier/active?job=${j.assignmentId}`}
                  className={j.assignmentId === job.assignmentId ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}
                >
                  {j.trackingNumber}
                </Link>
              ))}
            </div>
          )}
          <DeliveryProgress job={job} />
          <div className="grid-cols-2" style={{ alignItems: 'start' }}>
            <JobDetails job={job} />
            <JobActions key={job.assignmentId} job={job} onUpdated={replaceJob} />
          </div>
        </>
      )}
    </div>
  );
}

const STEPS = ['Accepted', 'Picked up', 'Delivered'];

function DeliveryProgress({ job }: { job: CourierJob }) {
  const reached = job.status === 'DELIVERED' ? 3 : job.status === 'IN_TRANSIT' ? 2 : job.status === 'FAILED' ? (job.pickedUpAt ? 2 : 1) : 1;
  const failed = job.status === 'FAILED';

  return (
    <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
      {STEPS.map((label, i) => {
        const done = i < reached;
        const isFailStep = failed && i === reached;
        const color = isFailStep ? '#f87171' : done ? '#34d399' : '#475569';
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: i < STEPS.length - 1 ? 1 : undefined }}>
            <span
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${color}`,
                color,
                fontSize: '0.8rem',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {isFailStep ? '!' : done ? '✓' : i + 1}
            </span>
            <span style={{ color: done || isFailStep ? '#ffffff' : '#64748b', fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {isFailStep ? 'Failed' : label}
            </span>
            {i < STEPS.length - 1 && <span style={{ flex: 1, minWidth: '20px', height: '2px', background: i < reached - 1 ? '#34d399' : '#1e293b' }} />}
          </div>
        );
      })}
    </div>
  );
}

function JobDetails({ job }: { job: CourierJob }) {
  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Package size={20} color="#60a5fa" />
          <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>{job.trackingNumber}</span>
          <PriorityTag priority={job.priority} />
        </div>
        <JobStatusBadge status={job.status} />
      </div>

      <Field label="Pickup">
        {job.merchantName} — {job.pickupAddress}
      </Field>
      <Field label="Deliver to">
        {job.recipient.name} — {job.recipient.address}, {job.recipient.city}
      </Field>
      <Field label="Recipient phone">
        <a href={`tel:${job.recipient.phone.replace(/\s/g, '')}`} style={{ color: '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <Phone size={14} /> {job.recipient.phone}
        </a>
      </Field>
      <div className="grid-cols-2" style={{ gap: '1rem' }}>
        <Field label="Parcel">
          {job.parcel.category} · {job.parcel.weightKg} kg
        </Field>
        <Field label="Payout">{formatLkr(job.payoutLkr)}</Field>
        <Field label="Assigned">{formatTime(job.assignedAt)}</Field>
        <Field label="Picked up">{formatTime(job.pickedUpAt)}</Field>
      </div>
      {job.parcel.handlingNotes && (
        <div className="badge badge-warning" style={{ alignSelf: 'flex-start' }}>
          Handling: {job.parcel.handlingNotes}
        </div>
      )}
    </div>
  );
}

const POD_HINT: Record<ProofOfDeliveryType, string> = {
  OTP: 'One-time code the customer received',
  SIGNATURE: 'Signature reference',
  PHOTO: 'Photo reference',
};

function JobActions({ job, onUpdated }: { job: CourierJob; onUpdated: (job: CourierJob) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'deliver' | 'fail'>('deliver');

  const [podType, setPodType] = useState<ProofOfDeliveryType>('OTP');
  const [receivedBy, setReceivedBy] = useState(job.recipient.name);
  const [reference, setReference] = useState('');

  const [reason, setReason] = useState<string>(FAILED_DELIVERY_REASONS[0]);
  const [notes, setNotes] = useState('');

  const run = async (action: () => Promise<CourierJob>) => {
    setBusy(true);
    setError(null);
    try {
      onUpdated(await action());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (job.status === 'DELIVERED' || job.status === 'FAILED') {
    const ok = job.status === 'DELIVERED';
    return (
      <div className="glass-card" role="status" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: ok ? '#34d399' : '#f87171', fontWeight: 700 }}>
          {ok ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          {ok ? 'Delivery completed' : 'Delivery marked as failed'}
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          {ok
            ? `Proof recorded (${job.proofOfDelivery?.type} · ${job.proofOfDelivery?.reference}). Your branch and the customer can now see it as delivered.`
            : `Reason sent to your branch: ${job.failure?.reason}. The dispatcher will reschedule or return the parcel.`}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/courier" className="btn btn-primary">
            Back to dashboard
          </Link>
          <Link href="/courier/history" className="btn btn-secondary">
            Job history
          </Link>
        </div>
      </div>
    );
  }

  const errorText = error && (
    <p role="alert" style={{ fontSize: '0.85rem', color: '#fca5a5' }}>
      {error}
    </p>
  );

  if (job.status === 'ACCEPTED' && mode === 'deliver') {
    return (
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>Next step: pick up the parcel</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          Go to {job.merchantName} and collect the parcel. Mark it picked up once it is with you.
        </p>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => run(() => markPickedUp(job.assignmentId))}>
          {busy ? 'Saving…' : 'Mark as picked up'}
        </button>
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setMode('fail')}>
          Report a problem
        </button>
        {errorText}
      </div>
    );
  }

  if (mode === 'fail') {
    return (
      <form
        className="glass-card"
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        onSubmit={(e) => {
          e.preventDefault();
          run(() => reportFailedDelivery(job.assignmentId, { reason, notes: notes.trim() }));
        }}
      >
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>Report failed delivery</h2>
        <label style={labelStyle}>
          Reason
          <select className="input-field" value={reason} onChange={(e) => setReason(e.target.value)}>
            {FAILED_DELIVERY_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Notes for your branch
          <textarea
            className="input-field"
            rows={3}
            required
            minLength={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Called twice, no answer. Gate locked."
          />
        </label>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-danger" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit failed delivery'}
          </button>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setMode('deliver')}>
            Cancel
          </button>
        </div>
        {errorText}
      </form>
    );
  }

  // IN_TRANSIT: confirm delivery with proof
  return (
    <form
      className="glass-card"
      style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      onSubmit={(e) => {
        e.preventDefault();
        run(() => completeDelivery(job.assignmentId, { type: podType, receivedBy: receivedBy.trim(), reference: reference.trim() }));
      }}
    >
      <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>Confirm delivery</h2>
      <label style={labelStyle}>
        Proof of delivery
        <select className="input-field" value={podType} onChange={(e) => setPodType(e.target.value as ProofOfDeliveryType)}>
          <option value="OTP">OTP code</option>
          <option value="SIGNATURE">Signature</option>
          <option value="PHOTO">Photo</option>
        </select>
      </label>
      <label style={labelStyle}>
        {POD_HINT[podType]}
        <input className="input-field" required value={reference} onChange={(e) => setReference(e.target.value)} placeholder={podType === 'OTP' ? 'e.g. 4417' : 'Reference'} />
      </label>
      <label style={labelStyle}>
        Received by
        <input className="input-field" required value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} />
      </label>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Confirming…' : 'Confirm delivered'}
        </button>
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setMode('fail')}>
          Could not deliver
        </button>
      </div>
      {errorText}
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#94a3b8',
};
