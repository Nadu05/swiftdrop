'use client';

import { AlertTriangle, Clock, FileWarning, RotateCcw } from 'lucide-react';
import type { DeliveryHistoryRecord } from './types';

interface FailedDeliveryDetailsProps {
  failureDetails: NonNullable<DeliveryHistoryRecord['failureDetails']>;
  deliveryNotes?: string;
  deliveryAttempts: number;
}

export default function FailedDeliveryDetails({
  failureDetails,
  deliveryNotes,
  deliveryAttempts,
}: FailedDeliveryDetailsProps) {
  const formatTimestamp = (isoStr: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(isoStr));
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="dispatcher-modal-section">
      <div className="dispatcher-modal-section-title">
        <AlertTriangle size={16} className="text-rose-600" aria-hidden="true" />
        <span className="text-rose-950 font-bold">Failed Delivery Investigation</span>
      </div>

      <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 space-y-3">
        {/* Failure Reason */}
        <div className="text-xs">
          <span className="text-rose-800 font-semibold block mb-1">Documented Reason for Failure</span>
          <div className="p-2.5 rounded-lg bg-white border border-rose-200 font-medium text-rose-900 leading-relaxed">
            {failureDetails.reason}
          </div>
        </div>

        {/* Attempt info grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
          <div className="p-2.5 rounded-lg bg-white/80 border border-rose-100 flex items-center gap-2">
            <Clock size={15} className="text-rose-600 flex-shrink-0" />
            <div>
              <span className="text-slate-500 block text-[11px]">Final Attempt Timestamp</span>
              <span className="font-semibold text-slate-800">
                {formatTimestamp(failureDetails.attemptTimestamp)}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-white/80 border border-rose-100 flex items-center gap-2">
            <RotateCcw size={15} className="text-rose-600 flex-shrink-0" />
            <div>
              <span className="text-slate-500 block text-[11px]">Cumulative Delivery Attempts</span>
              <span className="font-bold text-slate-900">
                {failureDetails.attemptsCount || deliveryAttempts} Attempts
              </span>
            </div>
          </div>
        </div>

        {/* Courier field notes */}
        <div className="text-xs pt-1">
          <div className="flex items-center gap-1.5 text-rose-800 font-medium mb-1">
            <FileWarning size={14} className="text-rose-600" />
            <span>Courier Field Operational Notes</span>
          </div>
          <div className="p-2.5 rounded-lg bg-white/90 border border-rose-200 text-slate-700 italic">
            "{failureDetails.courierNotes}"
          </div>
        </div>

        {/* Overall delivery notes */}
        {deliveryNotes && (
          <div className="text-xs pt-1">
            <span className="text-slate-600 font-medium block mb-1">System / Dispatcher Directives</span>
            <div className="p-2 rounded bg-white/70 border border-slate-200 text-slate-700">
              {deliveryNotes}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

