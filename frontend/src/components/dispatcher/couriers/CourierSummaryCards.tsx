import { Users, UserCheck, AlertCircle, UserX } from 'lucide-react';
import type { CourierSummaryMetrics } from './types';

interface CourierSummaryCardsProps {
  metrics: CourierSummaryMetrics;
}

export default function CourierSummaryCards({ metrics }: CourierSummaryCardsProps) {
  const cards = [
    {
      id: 'total-couriers',
      title: 'Total Couriers',
      value: metrics.totalCouriers,
      description: 'Registered dispatch fleet workforce',
      icon: Users,
      iconColor: '#2563eb',
      iconBg: '#eff6ff',
    },
    {
      id: 'available-couriers',
      title: 'Available Couriers',
      value: metrics.availableCouriers,
      description: 'Ready to accept new order dispatches',
      icon: UserCheck,
      iconColor: '#16a34a',
      iconBg: '#f0fdf4',
    },
    {
      id: 'couriers-on-delivery',
      title: 'Couriers On Delivery',
      value: metrics.couriersOnDelivery,
      description: 'Currently handling active transit routes',
      icon: AlertCircle,
      iconColor: '#d97706',
      iconBg: '#fffbeb',
    },
    {
      id: 'unavailable-couriers',
      title: 'Unavailable Couriers',
      value: metrics.unavailableCouriers,
      description: 'On scheduled break or off shift',
      icon: UserX,
      iconColor: '#64748b',
      iconBg: '#f1f5f9',
    },
  ];

  return (
    <section className="dispatcher-stats-grid" aria-label="Courier fleet summary metrics">
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

