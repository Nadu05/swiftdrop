'use client';

import { memo } from 'react';
import { Building2, CheckCircle2, PauseCircle, Radar } from 'lucide-react';
import type { OrganizationDashboardMetrics } from '@/types/organization.types';
import { Card } from '@/components/ui/card';

export interface OrganizationSummaryCardsProps {
  metrics: OrganizationDashboardMetrics;
  isLoading: boolean;
  serviceAreasAvailable: boolean;
}

function OrganizationSummaryCards({
  metrics,
  isLoading,
  serviceAreasAvailable,
}: OrganizationSummaryCardsProps) {
  const cards = [
    {
      id: 'total-branches',
      title: 'Total Branches',
      value: isLoading ? '—' : String(metrics.totalBranches),
      description: isLoading
        ? 'Loading registered hubs...'
        : `${metrics.citiesCovered} distinct ${
            metrics.citiesCovered === 1 ? 'city' : 'cities'
          } represented`,
      icon: Building2,
      iconColors: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
    },
    {
      id: 'active-branches',
      title: 'Active Branches',
      value: isLoading ? '—' : String(metrics.activeBranches),
      description: 'Operational & eligible for order routing',
      icon: CheckCircle2,
      iconColors: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
    },
    {
      id: 'inactive-branches',
      title: 'Inactive Branches',
      value: isLoading ? '—' : String(metrics.inactiveBranches),
      description: 'Suspended from new customer bookings',
      icon: PauseCircle,
      iconColors: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    },
    {
      id: 'service-areas',
      title: serviceAreasAvailable ? 'Active Service Areas' : 'Cities Covered',
      value: isLoading
        ? '—'
        : serviceAreasAvailable
          ? String(metrics.activeServiceAreas)
          : String(metrics.citiesCovered),
      description: isLoading
        ? 'Loading coverage metrics...'
        : serviceAreasAvailable
          ? `${metrics.totalServiceAreas} total configured radius ${
              metrics.totalServiceAreas === 1 ? 'zone' : 'zones'
            }`
          : 'Distinct municipal cities across branches',
      icon: Radar,
      iconColors: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400',
    },
  ];

  return (
    <section
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      aria-label="Organization branch and service-area summary metrics"
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.id}
            className="p-5 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 shadow-sm hover:shadow transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {card.title}
                </span>
                <span className="block text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  {card.value}
                </span>
              </div>
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.iconColors}`}
                aria-hidden="true"
              >
                <Icon size={20} />
              </div>
            </div>
            <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {card.description}
              </span>
            </div>
          </Card>
        );
      })}
    </section>
  );
}

export default memo(OrganizationSummaryCards);
