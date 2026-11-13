'use client';

import { memo } from 'react';
import { Building2, CheckCircle2, PauseCircle, Radar } from 'lucide-react';
import type { OrganizationDashboardMetrics } from '@/types/organization.types';

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
      accentClass: 'org-summary-card__icon--blue',
    },
    {
      id: 'active-branches',
      title: 'Active Branches',
      value: isLoading ? '—' : String(metrics.activeBranches),
      description: 'Operational & eligible for order routing',
      icon: CheckCircle2,
      accentClass: 'org-summary-card__icon--green',
    },
    {
      id: 'inactive-branches',
      title: 'Inactive Branches',
      value: isLoading ? '—' : String(metrics.inactiveBranches),
      description: 'Suspended from new customer bookings',
      icon: PauseCircle,
      accentClass: 'org-summary-card__icon--slate',
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
      accentClass: 'org-summary-card__icon--indigo',
    },
  ];

  return (
    <section
      className="org-summary-grid"
      aria-label="Organization branch and service-area summary metrics"
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article key={card.id} className="org-summary-card">
            <div className="org-summary-card__top">
              <div className="org-summary-card__info">
                <span className="org-summary-card__title">{card.title}</span>
                <span className="org-summary-card__value">{card.value}</span>
              </div>
              <div className={`org-summary-card__icon ${card.accentClass}`} aria-hidden="true">
                <Icon size={20} />
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

export default memo(OrganizationSummaryCards);

