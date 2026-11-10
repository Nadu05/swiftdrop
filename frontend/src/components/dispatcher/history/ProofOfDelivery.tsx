'use client';

import { ShieldCheck, FileText, Image as ImageIcon, CheckCircle, Smartphone } from 'lucide-react';
import type { DeliveryHistoryRecord } from './types';

interface ProofOfDeliveryProps {
  pod: NonNullable<DeliveryHistoryRecord['pod']>;
}

export default function ProofOfDelivery({ pod }: ProofOfDeliveryProps) {
  return (
    <div className="dispatcher-modal-section">
      <div className="dispatcher-modal-section-title">
        <ShieldCheck size={16} className="text-emerald-600" aria-hidden="true" />
        <span className="text-emerald-950 font-bold">Proof of Delivery (POD) Verification</span>
      </div>

      <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-emerald-800/80 font-medium block">Received By</span>
            <span className="text-slate-900 font-bold text-sm mt-0.5 block">
              {pod.recipientName}
            </span>
          </div>

          <div>
            <span className="text-emerald-800/80 font-medium block">POD Reference Key</span>
            <span className="font-mono text-slate-800 bg-white/80 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-0.5 font-semibold">
              {pod.podReference}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-emerald-200/70 text-xs">
          <span className="text-emerald-800/80 font-medium block mb-1">Confirmation Details</span>
          <div className="flex items-start gap-2 bg-white/90 p-2.5 rounded-lg border border-emerald-100 text-slate-800">
            {pod.podType === 'OTP' ? (
              <Smartphone size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : pod.podType === 'SIGNATURE' ? (
              <FileText size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            )}
            <p className="leading-relaxed">{pod.confirmationDetails}</p>
          </div>
        </div>

        {/* Photograph or file preview when available, with explicit empty state when unavailable */}
        <div className="pt-2">
          <span className="text-emerald-800/80 font-medium text-xs block mb-1.5">
            Photographic &amp; Signature Attachments
          </span>
          {pod.photoUrl ? (
            <div className="relative rounded-lg overflow-hidden border border-emerald-200 max-w-sm">
              <img
                src={pod.photoUrl}
                alt={`Proof of delivery photo for reference ${pod.podReference}`}
                className="w-full h-auto object-cover max-h-48"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
              <ImageIcon size={14} className="text-slate-400" aria-hidden="true" />
              <span>
                No physical photograph attached. Authentication completed via {pod.podType} telemetry.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

