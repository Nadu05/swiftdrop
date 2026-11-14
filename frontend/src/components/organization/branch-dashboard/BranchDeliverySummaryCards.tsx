'use client';

import Link from 'next/link';
import { memo } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Inbox,
  PackageCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import type { BranchDeliveryOperationsMetrics } from '@/types/organization.types';
import { Card } from '@/components/ui/card';

export interface BranchDeliverySummaryCardsProps {
  metrics: BranchDeliveryOperationsMetrics;
  isLoading: boolean;
  isPreviewMode?: boolean;
}

/**
 * Section B — Delivery Operations Summary Cards (Interactive Development Preview)
 * Member 04 — Branch Manager Dashboard UI
 *
 * Displays 6 operational delivery cards for the assigned branch:
 * 1. Incoming Deliveries (Sample: 42)
 * 2. Unassigned Deliveries (Sample: 8)
 * 3. Assigned Deliveries (Sample: 21)
 * 4. Ready for Pickup (Sample: 6)
 * 5. Completed Deliveries Today (Sample: 27)
 * 6. Failed / Exceptional Deliveries (Sample: 2)
 *
 * Logically consistent figures across queue and performance datasets.
 * Displays explicit "Unavailable" indicators when the required backend contract is offline in non-preview mode.
 */
function BranchDeliverySummaryCards({
  metrics,
  isLoading,
  isPreviewMode = false,
}: BranchDeliverySummaryCardsProps) {
  const formatMetricValue = (val: number | null): string => {
    if (isLoading) return '...';
    if (val === null || val === undefined) return '—';
    return String(val);
  };

  const cards = [
    {
      id: 'incoming-deliveries',
      title: 'Incoming Deliveries',
      value: formatMetricValue(metrics.incomingCount),
      isAvailable: metrics.incomingCount !== null,
      statusLabel:
        metrics.incomingCount !== null
          ? 'Active Queue'
          : 'Queue API Pending',
      statusTone:
        metrics.incomingCount !== null
          ? 'bg-blue-50 text-blue-700 border-blue-200'
          : 'bg-slate-100 text-slate-600 border-slate-200',
      description:
        metrics.incomingCount !== null
          ? 'Total delivery requests routed to this branch queue'
          : 'Awaiting branch delivery queue contract',
      href: '/organization/console/requests',
      actionLabel: 'Open Queue',
      icon: Inbox,
      iconColors: 'bg-blue-50 text-blue-600',
    },
    {
      id: 'unassigned-deliveries',
      title: 'Unassigned Deliveries',
      value: formatMetricValue(metrics.unassignedCount),
      isAvailable: metrics.unassignedCount !== null,
      statusLabel:
        metrics.unassignedCount !== null
          ? metrics.unassignedCount > 0
            ? 'Needs Dispatch'
            : 'All Assigned'
          : 'Unavailable',
      statusTone:
        metrics.unassignedCount !== null
          ? metrics.unassignedCount > 0
            ? 'bg-amber-50 text-amber-800 border-amber-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-slate-100 text-slate-600 border-slate-200',
      description:
        metrics.unassignedCount !== null
          ? 'Awaiting courier assignment in branch queue'
          : 'Awaiting branch delivery queue contract',
      href: '/organization/console/requests',
      actionLabel: 'Review Unassigned',
      icon: AlertTriangle,
      iconColors: 'bg-amber-50 text-amber-600',
    },
    {
      id: 'assigned-deliveries',
      title: 'Assigned Deliveries',
      value: formatMetricValue(metrics.assignedCount),
      isAvailable: metrics.assignedCount !== null,
      statusLabel:
        metrics.assignedCount !== null ? 'Dispatched' : 'Unavailable',
      statusTone:
        metrics.assignedCount !== null
          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
          : 'bg-slate-100 text-slate-600 border-slate-200',
      description:
        metrics.assignedCount !== null
          ? 'Deliveries with an assigned branch courier'
          : 'Awaiting branch delivery queue contract',
      href: '/organization/console/requests',
      actionLabel: 'View Assigned',
      icon: UserCheck,
      iconColors: 'bg-indigo-50 text-indigo-600',
    },
    {
      id: 'ready-for-pickup',
      title: 'Ready for Pickup',
      value: formatMetricValue(metrics.readyForPickupCount),
      isAvailable: metrics.readyForPickupCount !== null,
      statusLabel:
        metrics.readyForPickupCount !== null ? 'Awaiting Pickup' : 'Unavailable',
      statusTone:
        metrics.readyForPickupCount !== null
          ? 'bg-sky-50 text-sky-700 border-sky-200'
          : 'bg-slate-100 text-slate-600 border-slate-200',
      description:
        metrics.readyForPickupCount !== null
          ? 'Parcels staged for courier collection'
          : 'Awaiting branch delivery queue contract',
      href: '/organization/console/requests',
      actionLabel: 'Inspect Stage',
      icon: PackageCheck,
      iconColors: 'bg-sky-50 text-sky-600',
    },
    {
      id: 'completed-today',
      title: 'Completed Today',
      value: formatMetricValue(metrics.completedTodayCount),
      isAvailable: metrics.completedTodayCount !== null,
      statusLabel:
        metrics.completedTodayCount !== null
          ? 'Delivered'
          : 'Unavailable',
      statusTone:
        metrics.completedTodayCount !== null
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-slate-100 text-slate-600 border-slate-200',
      description:
        metrics.completedTodayCount !== null
          ? 'Confirmed deliveries completed today'
          : 'Requires Order/Analytics summary contract',
      href: '#branch-performance',
      actionLabel: 'Performance',
      icon: CheckCircle2,
      iconColors: 'bg-emerald-50 text-emerald-600',
    },
    {
      id: 'failed-deliveries',
      title: 'Failed / Exceptions',
      value: formatMetricValue(metrics.failedCount),
      isAvailable: metrics.failedCount !== null,
      statusLabel:
        metrics.failedCount !== null
          ? metrics.failedCount > 0
            ? 'Attention Required'
            : 'No Exceptions'
          : 'Unavailable',
      statusTone:
        metrics.failedCount !== null
          ? metrics.failedCount > 0
            ? 'bg-red-50 text-red-700 border-red-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-slate-100 text-slate-600 border-slate-200',
      description:
        metrics.failedCount !== null
          ? 'Delivery exceptions or failed attempts today'
          : 'Requires Order/Dispatch exception contract',
      href: '#branch-performance',
      actionLabel: 'Inspect KPIs',
      icon: AlertOctagon,
      iconColors: 'bg-red-50 text-red-600',
    },
  ] as const;

  return (
    <section
      aria-label="Branch delivery operations summary metrics"
      className="org-bm-section"
      data-testid="branch-delivery-summary-cards"
    >
      <div className="org-bm-section__heading-row flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="org-bm-section__title">Delivery Operations Summary</h2>
            {isPreviewMode && (
              <span className="org-dashboard-badge org-dashboard-badge--preview">
                Demonstration Figures
              </span>
            )}
          </div>
          <p className="org-bm-section__subtitle">
            Live branch delivery counts across dispatch stages. Logically consistent summary representation.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.id}
              className="p-5 border-slate-200 bg-white shadow-sm hover:shadow transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {card.title}
                    </span>
                    <div className="flex items-baseline gap-2.5">
                      <span
                        className="text-2xl font-bold tracking-tight text-slate-900"
                        data-testid={`metric-value-${card.id}`}
                      >
                        {card.value}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${card.statusTone}`}
                      >
                        {isLoading ? 'Syncing...' : card.statusLabel}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.iconColors}`}
                    aria-hidden="true"
                  >
                    <Icon size={20} />
                  </div>
                </div>
              </div>

              <div className="mt-3.5 border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 leading-relaxed">
                  {card.description}
                </span>
                <Link
                  href={card.href}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 shrink-0"
                >
                  <span>{card.actionLabel}</span>
                  <ArrowUpRight size={13} aria-hidden="true" />
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export default memo(BranchDeliverySummaryCards);
