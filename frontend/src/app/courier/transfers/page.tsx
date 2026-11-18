'use client';

import { useState } from 'react';
import { ArrowRight, Loader2, RotateCcw, Truck } from 'lucide-react';
import type { TransferManifestDto } from '@/api/services/dispatch.api';
import {
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  ManifestStatusBadge,
  Notice,
  PageHeader,
  SectionHeader,
  formatDateTime,
} from '@/components/courier/CourierUI';
import { useDepartTransferMutation, useMyTransferManifests } from '@/hooks/api/use-courier';

const OPEN = new Set(['DRAFT', 'ASSIGNED', 'IN_TRANSIT']);
/** Statuses dispatch-service accepts for departure (see TransferManifestService.departManifest). */
const CAN_DEPART = new Set(['DRAFT', 'ASSIGNED']);

const branchLabel = (name?: string, code?: string, id?: number) => name || code || (id ? `Branch #${id}` : '—');

/**
 * Inter-branch Transfers (/courier/transfers): manifests the branch assigned to this courier.
 * The courier confirms departure at the origin branch; the destination branch receives it.
 */
export default function CourierTransfersPage() {
  const query = useMyTransferManifests();
  const depart = useDepartTransferMutation();
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (query.isPending) return <LoadingState text="Loading your transfers…" />;
  if (query.isError) {
    return (
      <div className="cp-page">
        <PageHeader title="Transfers" subtitle="Inter-branch transfers assigned to you" />
        <ErrorState
          message={query.error instanceof Error ? query.error.message : 'Could not load your transfers.'}
          onRetry={() => query.refetch()}
        />
      </div>
    );
  }

  const manifests = query.data ?? [];
  const open = manifests.filter((m) => OPEN.has(String(m.status).toUpperCase()));
  const done = manifests.filter((m) => !OPEN.has(String(m.status).toUpperCase()));

  const confirmDeparture = async (m: TransferManifestDto) => {
    setNotice(null);
    setActionError(null);
    try {
      await depart.mutateAsync({ manifestId: m.manifestCode || m.id });
      setNotice(`Departure confirmed for ${m.manifestCode}. Drive safely to ${branchLabel(m.destinationBranchName, m.destinationBranchCode)}.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not confirm departure.');
    }
  };

  return (
    <div className="cp-page">
      <PageHeader
        title="Transfers"
        subtitle="Inter-branch transfers assigned to you"
        action={
          <button type="button" className="cp-btn cp-btn--secondary" onClick={() => query.refetch()} disabled={query.isFetching}>
            <RotateCcw size={15} className={query.isFetching ? 'cp-spin' : undefined} aria-hidden="true" /> Refresh
          </button>
        }
      />

      {notice && <Notice tone="success">{notice}</Notice>}
      {actionError && <Notice tone="error">{actionError}</Notice>}

      <section className="cp-section" aria-labelledby="cp-open-transfers">
        <SectionHeader id="cp-open-transfers" title="Current transfers" subtitle="Collect at the origin branch and drive to the destination" />
        {open.length === 0 ? (
          <EmptyState text="No transfers assigned to you right now." />
        ) : (
          open.map((m) => {
            const canDepart = CAN_DEPART.has(String(m.status).toUpperCase());
            const pending = depart.isPending && depart.variables?.manifestId === (m.manifestCode || m.id);
            return (
              <article key={m.id} className="cp-card cp-job" aria-label={`Transfer ${m.manifestCode}`}>
                <div className="cp-job__head">
                  <div className="cp-job__badges">
                    <span className="cp-job__id">{m.manifestCode}</span>
                    <ManifestStatusBadge status={m.status} />
                  </div>
                  <span className="cp-muted cp-small">{m.expectedParcelCount} parcels</span>
                </div>

                <div className="cp-row">
                  <span className="cp-strong">{branchLabel(m.originBranchName, m.originBranchCode, m.originBranchId)}</span>
                  <ArrowRight size={16} className="cp-muted" aria-hidden="true" />
                  <span className="cp-strong">{branchLabel(m.destinationBranchName, m.destinationBranchCode, m.destinationBranchId)}</span>
                </div>

                <div className="cp-grid-auto">
                  {m.vehiclePlate && <Field label="Vehicle">{m.vehiclePlate}</Field>}
                  {m.departureAt && <Field label="Departed">{formatDateTime(m.departureAt)}</Field>}
                  {m.notes && <Field label="Notes">{m.notes}</Field>}
                </div>

                {m.parcels?.length > 0 && (
                  <details>
                    <summary className="cp-link">Show {m.parcels.length} parcels</summary>
                    <ul className="cp-stack cp-small cp-parcel-list">
                      {m.parcels.map((p) => (
                        <li key={p.id ?? p.trackingNumber} className="cp-row cp-row--between">
                          <span className="cp-mono">{p.trackingNumber}</span>
                          <span className="cp-muted">
                            {p.parcelCategory ?? 'Parcel'}
                            {p.weightKg ? ` · ${p.weightKg} kg` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                {canDepart && (
                  <div className="cp-job__foot">
                    <span className="cp-hint">Confirm once every parcel is loaded at the origin branch.</span>
                    <button type="button" className="cp-btn cp-btn--primary" disabled={depart.isPending} onClick={() => confirmDeparture(m)}>
                      {pending ? <Loader2 size={15} className="cp-spin" aria-hidden="true" /> : <Truck size={15} aria-hidden="true" />}
                      {pending ? 'Confirming…' : 'Confirm departure'}
                    </button>
                  </div>
                )}
                {String(m.status).toUpperCase() === 'IN_TRANSIT' && (
                  <p className="cp-hint">The destination branch confirms receipt when you arrive.</p>
                )}
              </article>
            );
          })
        )}
      </section>

      {done.length > 0 && (
        <section className="cp-section" aria-labelledby="cp-done-transfers">
          <SectionHeader id="cp-done-transfers" title="Completed transfers" />
          <div className="cp-card cp-card--flush">
            {done.map((m) => (
              <div key={m.id} className="cp-list__row">
                <span className="cp-list__id">{m.manifestCode}</span>
                <span className="cp-list__meta">
                  {branchLabel(m.originBranchName, m.originBranchCode, m.originBranchId)} →{' '}
                  {branchLabel(m.destinationBranchName, m.destinationBranchCode, m.destinationBranchId)}
                </span>
                <span className="cp-muted cp-small">{formatDateTime(m.completedAt ?? m.destinationReceivedAt ?? m.arrivalAt)}</span>
                <ManifestStatusBadge status={m.status} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
