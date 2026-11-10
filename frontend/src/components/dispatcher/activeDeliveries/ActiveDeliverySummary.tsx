import { Truck, Clock, UserCheck, Navigation } from 'lucide-react';
import type { ActiveDeliverySummaryMetrics } from './types';

interface ActiveDeliverySummaryProps {
  metrics: ActiveDeliverySummaryMetrics;
}

export default function ActiveDeliverySummary({ metrics }: ActiveDeliverySummaryProps) {
  const cards = [
    {
      id: 'total-active',
      title: 'Total Active Deliveries',
      value: metrics.totalActive,
      description: 'Active operations in progress',
      icon: Truck,
      iconColor: '#2563eb',
      iconBg: '#eff6ff',
    },
    {
      id: 'assigned',
      title: 'Awaiting Acceptance',
      value: metrics.assigned,
      description: 'Dispatched, pending courier confirmation',
      icon: Clock,
      iconColor: '#64748b',
      iconBg: '#f1f5f9',
    },
    {
      id: 'accepted',
      title: 'Courier Accepted',
      value: metrics.accepted,
      description: 'Acknowledged, preparing pickup/transit',
      icon: UserCheck,
      iconColor: '#0284c7',
      iconBg: '#f0f9ff',
    },
    {
      id: 'in-transit',
      title: 'In Transit',
      value: metrics.inTransit,
      description: 'On route to recipient destination',
      icon: Navigation,
      iconColor: '#16a34a',
      iconBg: '#f0fdf4',
    },
  ];

  return (
    <section className="dispatcher-stats-grid" aria-label="Active delivery operations summary">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article key={card.id} className="dispatcher-stats-card">
            <div className="dispatcher-stats-card__top">
              <div className="dispatcher-stats-card__info">
                <span className="dispatcher-stats-card__title">{card.title}</span>
                <div className="dispatcher-stats-card__value">{card.value}</div>
              </div>

              <div
                className="dispatcher-stats-card__icon-wrapper"
                style={{ backgroundColor: card.iconBg, color: card.iconColor }}
                aria-hidden="true"
              >
                <Icon size={22} strokeWidth={2.2} />
              </div>
            </div>

            <div className="dispatcher-stats-card__bottom">
              <span className="dispatcher-stats-card__desc">{card.description}</span>
            </div>
          </article>
        );
      })}
    </section>
  );
}

