'use client';

import { CheckCircle2, AlertTriangle, XCircle, Gauge } from 'lucide-react';
import type { CourierProfile } from './types';

interface CourierWorkloadCardProps {
  courier: CourierProfile;
}

export default function CourierWorkloadCard({ courier }: CourierWorkloadCardProps) {
  const percent = Math.min(
    100,
    Math.round((courier.activeDeliveries / courier.maxCapacity) * 100)
  );

  // Eligibility logic: Courier must be AVAILABLE and not at max capacity
  const isAvailable = courier.status === 'AVAILABLE';
  const isAtCapacity = courier.activeDeliveries >= courier.maxCapacity;
  const isEligible = isAvailable && !isAtCapacity;

  const getWorkloadLevel = (p: number) => {
    if (p >= 80) return { label: 'High Workload', color: '#dc2626', bg: '#fef2f2' };
    if (p >= 40) return { label: 'Moderate Load', color: '#d97706', bg: '#fffbeb' };
    return { label: 'Optimal / Low Load', color: '#16a34a', bg: '#f0fdf4' };
  };

  const workloadLevel = getWorkloadLevel(percent);

  return (
    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <Gauge size={16} className="text-blue-600" aria-hidden="true" />
          <span>Workload &amp; Assignment Eligibility</span>
        </div>

        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-full border"
          style={{
            backgroundColor: workloadLevel.bg,
            color: workloadLevel.color,
            borderColor: workloadLevel.color + '40',
          }}
        >
          {workloadLevel.label} ({percent}%)
        </span>
      </div>

      {/* Active delivery count & progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium">
            Active Deliveries: <strong className="text-slate-900">{courier.activeDeliveries}</strong> of {courier.maxCapacity} Max Capacity
          </span>
          <span className="font-mono text-slate-500 font-bold">{percent}%</span>
        </div>

        <div
          className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden"
          role="progressbar"
          aria-valuenow={courier.activeDeliveries}
          aria-valuemin={0}
          aria-valuemax={courier.maxCapacity}
        >
          <div
            className={`h-full transition-all duration-300 ${
              percent >= 75
                ? 'bg-rose-500'
                : percent >= 40
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Assignment Eligibility Indicator */}
      <div className="pt-2 border-t border-slate-200/80">
        {isEligible ? (
          <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            <span>
              <strong>Eligible for New Assignments:</strong> Courier is active on shift with available capacity.
            </span>
          </div>
        ) : isAtCapacity ? (
          <div className="flex items-center gap-2 text-xs text-rose-800 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
            <AlertTriangle size={16} className="text-rose-600 flex-shrink-0" />
            <span>
              <strong>Ineligible for Assignments:</strong> Courier has reached full delivery capacity ({courier.maxCapacity} orders).
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
            <XCircle size={16} className="text-amber-600 flex-shrink-0" />
            <span>
              <strong>Unavailable for Dispatch:</strong> Courier status is currently marked as {courier.status.replace('_', ' ')}.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

