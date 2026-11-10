import { PackageOpen, Bike, AlertOctagon, CheckCheck } from 'lucide-react';
import type { DeliverySummaryMetrics } from './types';

interface DeliverySummaryCardsProps {
  metrics: DeliverySummaryMetrics;
}

export default function DeliverySummaryCards({ metrics }: DeliverySummaryCardsProps) {
  const cards = [
    {
      id: 'total-unassigned',
      title: 'Total Unassigned',
      value: metrics.totalUnassigned,
      description: 'Orders awaiting courier dispatch',
      icon: PackageOpen,
      iconColor: '#2563eb',
      iconBg: '#eff6ff',
    },
    {
      id: 'available-couriers',
      title: 'Available Couriers',
      value: metrics.availableCouriers,
      description: 'Active fleet ready for pickup',
      icon: Bike,
      iconColor: '#16a34a',
      iconBg: '#f0fdf4',
    },
    {
      id: 'high-priority',
      title: 'High Priority Deliveries',
      value: metrics.highPriorityDeliveries,
      description: 'Urgent & high priority queue',
      icon: AlertOctagon,
      iconColor: '#dc2626',
      iconBg: '#fef2f2',
    },
    {
      id: 'assigned-today',
      title: 'Assigned Today',
      value: metrics.assignedToday,
      description: 'Successfully dispatched parcels',
      icon: CheckCheck,
      iconColor: '#0284c7',
      iconBg: '#f0f9ff',
    },
  ];

  return (
    <section className="dispatcher-stats-grid" aria-label="Unassigned delivery key metrics">
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

