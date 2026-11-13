import { Building2, CheckCircle2, MapPin, PauseCircle } from 'lucide-react';
import type { BranchSummaryMetrics } from '@/types/organization.types';

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
      iconVariant: 'blue',
    },
    {
      id: 'active-branches',
      title: 'Active Branches',
      value: metrics.activeBranches,
      description: 'Operational hubs accepting delivery dispatches',
      icon: CheckCircle2,
      iconVariant: 'green',
    },
    {
      id: 'inactive-branches',
      title: 'Inactive Branches',
      value: metrics.inactiveBranches,
      description: 'Suspended or offline hubs excluded from routing',
      icon: PauseCircle,
      iconVariant: 'slate',
    },
    {
      id: 'cities-covered',
      title: 'Cities Covered',
      value: metrics.citiesCovered,
      description: 'Distinct municipalities served by the network',
      icon: MapPin,
      iconVariant: 'indigo',
    },
  ] as const;

  return (
    <section className="org-summary-grid" aria-label="Branch directory summary metrics">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article key={card.id} className="org-summary-card">
            <div className="org-summary-card__top">
              <div className="org-summary-card__info">
                <span className="org-summary-card__title">{card.title}</span>
                <div className="org-summary-card__value">
                  {isLoading ? '—' : card.value}
                </div>
              </div>

              <div
                className={`org-summary-card__icon org-summary-card__icon--${card.iconVariant}`}
                aria-hidden="true"
              >
                <Icon size={20} strokeWidth={2.1} />
              </div>
            </div>

            <div className="org-summary-card__bottom">
              <span className="org-summary-card__desc">{card.description}</span>
            </div>
          </article>
        );
      })}
    </section>
  );
}

