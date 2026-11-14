import { PackageOpen, Bike, AlertOctagon, CheckCheck, Warehouse } from 'lucide-react';
import type { DeliverySummaryMetrics } from './types';

interface DeliverySummaryCardsProps {
  metrics: DeliverySummaryMetrics;
}

export default function DeliverySummaryCards({ metrics }: DeliverySummaryCardsProps) {
  const cards = [
    {
      id: 'total-unassigned',
      title: 'Unassigned Deliveries',
      value: metrics.totalUnassigned,
      description: 'Last-mile orders awaiting courier',
      icon: PackageOpen,
      iconColor: '#2563eb',
      iconBg: '#eff6ff',
    },
    ...(typeof metrics.pendingPickups === 'number'
      ? [
          {
            id: 'pending-pickups',
            title: 'Pending Pickups',
            value: metrics.pendingPickups,
            description: 'Courier pickups awaiting dispatch',
            icon: Warehouse,
            iconColor: '#d97706',
            iconBg: '#fffbeb',
          },
        ]
      : []),
    {
      id: 'available-couriers',
      title: 'Eligible Couriers',
      value: metrics.availableCouriers,
      description: 'Active fleet with free capacity',
      icon: Bike,
      iconColor: '#16a34a',
      iconBg: '#f0fdf4',
    },
    {
      id: 'high-priority',
      title: 'High Priority Queue',
      value: metrics.highPriorityDeliveries,
      description: 'Urgent & high priority deliveries',
      icon: AlertOctagon,
      iconColor: '#dc2626',
      iconBg: '#fef2f2',
    },
    {
      id: 'assigned-today',
      title: 'Assigned Today',
      value: metrics.assignedToday,
      description: 'Dispatched tasks created today',
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

