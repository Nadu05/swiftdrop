'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  AlertTriangle,
  Printer,
  ShieldCheck,
  Truck,
  Building2,
  Lock,
  Clock,
  Package,
  FileText,
  XCircle,
  HelpCircle,
  Camera,
} from 'lucide-react';
import {
  dispatchApi,
  TransferManifestDto,
  ReceiveManifestRequest,
  ParcelVerificationItem,
} from '@/api/services/dispatch.api';
import { useAuthStore } from '@/store/auth.store';

export default function TransferManifestDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const manifestId = params?.id as string;
  const user = useAuthStore((s) => s.user);

  const [manifest, setManifest] = useState<TransferManifestDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Verification state per parcel key: { status: 'RECEIVED' | 'MISSING' | 'DAMAGED', notes: string, evidence: string }
  const [verifications, setVerifications] = useState<
    Record<string, { status: 'RECEIVED' | 'MISSING' | 'DAMAGED'; notes: string; evidence: string }>
  >({});
  const [generalDiscrepancyNotes, setGeneralDiscrepancyNotes] = useState('');

  const loadManifest = async () => {
    if (!manifestId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await dispatchApi.getTransferManifest(manifestId);
      setManifest(data);

      // Pre-initialize verifications state from parcel status if already verified
      const initVerifications: Record<
        string,
        { status: 'RECEIVED' | 'MISSING' | 'DAMAGED'; notes: string; evidence: string }
      > = {};

      (data.parcels || []).forEach((p) => {
        const key = p.parcelReference || p.trackingNumber || String(p.orderId);
        if (p.status === 'RECEIVED' || p.status === 'MISSING' || p.status === 'DAMAGED') {
          initVerifications[key] = {
            status: p.status,
            notes: p.discrepancyNotes || '',
            evidence: '',
          };
        } else {
          // Default to RECEIVED for convenience
          initVerifications[key] = {
            status: 'RECEIVED',
            notes: '',
            evidence: '',
          };
        }
      });
      setVerifications(initVerifications);
    } catch (err: any) {
      setError(err?.message || 'Failed to load transfer manifest');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadManifest();
  }, [manifestId]);

  const handleStatusChange = (
    key: string,
    status: 'RECEIVED' | 'MISSING' | 'DAMAGED'
  ) => {
    setVerifications((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        status,
      },
    }));
  };

  const handleNotesChange = (key: string, notes: string) => {
    setVerifications((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        notes,
      },
    }));
  };

  const handleEvidenceChange = (key: string, evidence: string) => {
    setVerifications((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        evidence,
      },
    }));
  };

  const handleSetAllReceived = () => {
    if (!manifest) return;
    const updated: Record<
      string,
      { status: 'RECEIVED' | 'MISSING' | 'DAMAGED'; notes: string; evidence: string }
    > = {};
    manifest.parcels.forEach((p) => {
      const key = p.parcelReference || p.trackingNumber || String(p.orderId);
      updated[key] = {
        status: 'RECEIVED',
        notes: '',
        evidence: '',
      };
    });
    setVerifications(updated);
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manifest) return;

    try {
      setSubmitting(true);
      setError(null);

      const parcelVerifications: ParcelVerificationItem[] = [];
      const receivedOrderIds: string[] = [];
      const missingOrderIds: string[] = [];
      const damagedParcels: Array<{ parcelKey: string; discrepancyNotes?: string; evidenceReference?: string }> = [];

      manifest.parcels.forEach((p) => {
        const key = p.parcelReference || p.trackingNumber || String(p.orderId);
        const v = verifications[key] || { status: 'RECEIVED', notes: '', evidence: '' };

        parcelVerifications.push({
          parcelKey: key,
          status: v.status,
          discrepancyNotes: v.notes,
          evidenceReference: v.evidence,
        });

        if (v.status === 'RECEIVED') {
          receivedOrderIds.push(String(p.orderId));
        } else if (v.status === 'MISSING') {
          missingOrderIds.push(String(p.orderId));
        } else if (v.status === 'DAMAGED') {
          damagedParcels.push({
            parcelKey: key,
            discrepancyNotes: v.notes,
            evidenceReference: v.evidence,
          });
        }
      });

      const payload: ReceiveManifestRequest = {
        parcelVerifications,
        receivedOrderIds,
        missingOrderIds,
        damagedParcels,
        discrepancyNotes: generalDiscrepancyNotes,
      };

      const updated = await dispatchApi.receiveTransferManifest(manifest.id, payload);
      setManifest(updated);
      setSuccessToast(
        `Manifest ${updated.manifestCode} successfully received and verified!`
      );
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit receiving verification');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading transfer manifest #{manifestId}...</span>
        </div>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="p-8 text-slate-800 max-w-4xl mx-auto space-y-4">
        <Link
          href="/dispatcher/transfers"
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-semibold"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Transfers
        </Link>
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800">
          Transfer manifest not found or could not be loaded.
        </div>
      </div>
    );
  }

  const isEditable =
    manifest.status === 'IN_TRANSIT' ||
    manifest.status === 'ASSIGNED' ||
    manifest.status === 'DRAFT';

  const counts = Object.values(verifications).reduce(
    (acc, cur) => {
      if (cur.status === 'RECEIVED') acc.received++;
      if (cur.status === 'MISSING') acc.missing++;
      if (cur.status === 'DAMAGED') acc.damaged++;
      return acc;
    },
    { received: 0, missing: 0, damaged: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/dispatcher/transfers"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Line-Haul Transfers
        </Link>

        <button
          onClick={() => window.print()}
          className="sd-btn sd-btn--secondary sd-btn--sm"
        >
          <Printer className="h-4 w-4" />
          Print Physical Manifest
        </button>
      </div>

      {/* Notifications */}
      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-medium">{successToast}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Manifest Header Card */}
      <div className="sd-card space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl md:text-3xl font-extrabold text-slate-900 font-mono">
                {manifest.manifestCode}
              </span>
              <span
                className={`sd-badge ${
                  manifest.status === 'COMPLETED'
                    ? 'sd-badge--success'
                    : manifest.status === 'RECEIVED_WITH_DISCREPANCY'
                    ? 'sd-badge--warning'
                    : manifest.status === 'IN_TRANSIT'
                    ? 'sd-badge--info'
                    : 'sd-badge--neutral'
                }`}
              >
                {manifest.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Line-Haul Inter-Branch Transfer Sheet &amp; Custody Handover Document
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400">Created At</span>
            <div className="text-sm font-semibold text-slate-800">
              {manifest.createdAt ? new Date(manifest.createdAt).toLocaleString() : '—'}
            </div>
          </div>
        </div>

        {/* Transfer Route & Vehicle Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Building2 className="h-4 w-4 text-blue-600" />
              Origin Branch
            </div>
            <div className="mt-2 text-base font-bold text-slate-900">
              {manifest.originBranchName || `Branch #${manifest.originBranchId}`}
            </div>
            <div className="text-xs text-slate-500">Code: {manifest.originBranchCode || '—'}</div>
            <div className="text-xs text-slate-600 mt-2">
              Handover by: <span className="text-slate-800 font-medium">{manifest.originHandoverByName || 'Pending'}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Building2 className="h-4 w-4 text-indigo-600" />
              Destination Hub
            </div>
            <div className="mt-2 text-base font-bold text-slate-900">
              {manifest.destinationBranchName || `Branch #${manifest.destinationBranchId}`}
            </div>
            <div className="text-xs text-slate-500">Code: {manifest.destinationBranchCode || '—'}</div>
            <div className="text-xs text-slate-600 mt-2">
              Received by:{' '}
              <span className="text-slate-800 font-medium">{manifest.destinationReceivedByName || 'Pending arrival'}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Truck className="h-4 w-4 text-sky-600" />
              Assigned Line-Haul Driver
            </div>
            <div className="mt-2 text-base font-bold text-slate-900">
              {manifest.assignedCourierName || 'Unassigned'}
            </div>
            <div className="text-xs text-slate-500">
              {manifest.vehicleType || 'Vehicle'} • {manifest.vehiclePlate || 'No Plate Recorded'}
            </div>
            <div className="text-xs text-slate-600 mt-2">
              Departure: {manifest.departureAt ? new Date(manifest.departureAt).toLocaleTimeString() : 'Pending'}
            </div>
          </div>
        </div>

        {/* Security & Notes */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <Lock className="h-4 w-4 text-blue-600 shrink-0" />
            <div>
              <span className="text-slate-500">Security Container Seal:</span>{' '}
              <span className="font-mono font-bold text-blue-600">
                {manifest.notes?.match(/Seal:\s*([^\s;]+)/i)?.[1] || 'Affixed at Dispatch'}
              </span>
            </div>
          </div>

          {manifest.notes && (
            <div className="text-slate-500">
              <span className="font-semibold text-slate-700">Notes:</span> {manifest.notes}
            </div>
          )}
        </div>
      </div>

      {/* Parcels Receiving & Verification Section */}
      <div className="sd-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              Receiving Verification &amp; Parcel Inspection
            </h2>
            <p className="text-xs text-slate-500">
              Verify each manifest parcel upon physical unloading. Mark missing or damaged parcels to record discrepancies.
            </p>
          </div>

          {isEditable && (
            <button
              type="button"
              onClick={handleSetAllReceived}
              className="sd-btn sd-btn--secondary sd-btn--sm"
            >
              Mark All as Received Intact
            </button>
          )}
        </div>

        {/* Counts Status Pills */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          <span className="text-slate-500">
            Total Expected: <strong className="text-slate-900">{manifest.parcels?.length || 0}</strong>
          </span>
          <span className="text-emerald-700">
            Received Intact: <strong>{counts.received}</strong>
          </span>
          <span className="text-amber-700">
            Missing: <strong>{counts.missing}</strong>
          </span>
          <span className="text-rose-700">
            Damaged: <strong>{counts.damaged}</strong>
          </span>
        </div>

        <form onSubmit={handleSubmitVerification} className="space-y-6">
          <div className="sd-table-container">
            <table className="sd-table">
              <thead>
                <tr>
                  <th>Parcel / Order</th>
                  <th>Category / Weight</th>
                  <th>Condition Verification</th>
                  <th>Discrepancy Notes / Evidence</th>
                </tr>
              </thead>
              <tbody>
                {(manifest.parcels || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      No parcel items associated with this manifest.
                    </td>
                  </tr>
                ) : (
                  manifest.parcels.map((p) => {
                    const key = p.parcelReference || p.trackingNumber || String(p.orderId);
                    const current = verifications[key] || {
                      status: 'RECEIVED',
                      notes: '',
                      evidence: '',
                    };

                    return (
                      <tr key={key}>
                        <td className="font-mono">
                          <span className="font-semibold text-blue-600">{p.trackingNumber}</span>
                          <span className="block text-xs font-sans text-slate-500">
                            Order #{p.orderId}
                          </span>
                        </td>
                        <td className="text-xs">
                          <span className="font-medium text-slate-800">
                            {p.parcelCategory || 'Standard'}
                          </span>
                          <span className="block text-slate-500">
                            {p.weightKg ? `${p.weightKg} kg` : 'Standard'}
                          </span>
                        </td>
                        <td>
                          {isEditable ? (
                            <div className="flex items-center gap-2 text-xs">
                              <label
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition border ${
                                  current.status === 'RECEIVED'
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`status-${key}`}
                                  checked={current.status === 'RECEIVED'}
                                  onChange={() => handleStatusChange(key, 'RECEIVED')}
                                  className="hidden"
                                />
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                Received
                              </label>

                              <label
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition border ${
                                  current.status === 'MISSING'
                                    ? 'bg-amber-50 border-amber-300 text-amber-800 font-semibold'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`status-${key}`}
                                  checked={current.status === 'MISSING'}
                                  onChange={() => handleStatusChange(key, 'MISSING')}
                                  className="hidden"
                                />
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                                Missing
                              </label>

                              <label
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition border ${
                                  current.status === 'DAMAGED'
                                    ? 'bg-rose-50 border-rose-300 text-rose-800 font-semibold'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`status-${key}`}
                                  checked={current.status === 'DAMAGED'}
                                  onChange={() => handleStatusChange(key, 'DAMAGED')}
                                  className="hidden"
                                />
                                <XCircle className="h-3.5 w-3.5 text-rose-600" />
                                Damaged
                              </label>
                            </div>
                          ) : (
                            <span
                              className={`sd-badge ${
                                p.status === 'RECEIVED'
                                  ? 'sd-badge--success'
                                  : p.status === 'MISSING'
                                  ? 'sd-badge--warning'
                                  : p.status === 'DAMAGED'
                                  ? 'sd-badge--danger'
                                  : 'sd-badge--neutral'
                              }`}
                            >
                              {p.status}
                            </span>
                          )}
                        </td>
                        <td className="text-xs">
                          {isEditable && (current.status === 'MISSING' || current.status === 'DAMAGED') ? (
                            <div className="space-y-1.5">
                              <input
                                type="text"
                                placeholder="Discrepancy explanation..."
                                value={current.notes}
                                onChange={(e) => handleNotesChange(key, e.target.value)}
                                className="sd-input text-xs"
                              />
                              <input
                                type="text"
                                placeholder="Photo / Incident reference..."
                                value={current.evidence}
                                onChange={(e) => handleEvidenceChange(key, e.target.value)}
                                className="sd-input text-xs"
                              />
                            </div>
                          ) : (
                            <span className="text-slate-500">
                              {p.discrepancyNotes || 'None'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {isEditable && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Hub Discrepancy &amp; Receiving Remarks
                </label>
                <textarea
                  rows={2}
                  value={generalDiscrepancyNotes}
                  onChange={(e) => setGeneralDiscrepancyNotes(e.target.value)}
                  placeholder="Enter any notes regarding overall transport condition, driver remarks, or seal verification..."
                  className="sd-textarea"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="sd-btn sd-btn--primary flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {submitting
                    ? 'Submitting Verification...'
                    : counts.missing > 0 || counts.damaged > 0
                    ? 'Submit Verification with Discrepancy'
                    : 'Confirm Complete Receipt'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
