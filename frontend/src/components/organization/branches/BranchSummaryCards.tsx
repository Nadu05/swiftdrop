import { Building2, CheckCircle2, MapPin, PauseCircle } from 'lucide-react';
import type { BranchSummaryMetrics } from '@/types/organization.types';
import { Card } from '@/components/ui/card';

export interface BranchSummaryCardsProps {
  metrics: BranchSummaryMetrics;
  isLoading?: boolean;
}

export default function BranchSummaryCards({
  metrics,
  isLoading = false,
}: BranchSummaryCardsProps) {
  const cards = [
    {
      id: 'total-branches',
      title: 'Total Branches',
      value: metrics.totalBranches,
      description: 'Registered organization hubs across all regions',
      icon: Building2,
      iconColors: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
    },
    {
      id: 'active-branches',
      title: 'Active Branches',
      value: metrics.activeBranches,
      description: 'Operational hubs accepting delivery dispatches',
      icon: CheckCircle2,
      iconColors: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
    },
    {
      id: 'inactive-branches',
      title: 'Inactive Branches',
      value: metrics.inactiveBranches,
      description: 'Suspended or offline hubs excluded from routing',
      icon: PauseCircle,
      iconColors: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    },
    {
      id: 'cities-covered',
      title: 'Cities Covered',
      value: metrics.citiesCovered,
      description: 'Distinct municipalities served by the network',
      icon: MapPin,
      iconColors: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400',
    },
  ] as const;

  return (
    <section
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      aria-label="Branch directory summary metrics"
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
                <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  {isLoading ? '—' : card.value}
                </div>
              </div>

              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.iconColors}`}
                aria-hidden="true"
              >
                <Icon size={20} strokeWidth={2.1} />
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
