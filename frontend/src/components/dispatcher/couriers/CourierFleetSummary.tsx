import { Users, UserCheck, AlertCircle, Coffee } from 'lucide-react';
import type { CourierFleetSummaryMetrics } from './types';

interface CourierFleetSummaryProps {
  metrics: CourierFleetSummaryMetrics;
}

export default function CourierFleetSummary({ metrics }: CourierFleetSummaryProps) {
  const cards = [
    {
      id: 'total-fleet',
      title: 'Total Active Fleet',
      value: metrics.totalFleet,
      description: 'Registered dispatch couriers',
      icon: Users,
      iconColor: '#2563eb',
      iconBg: '#eff6ff',
    },
    {
      id: 'available',
      title: 'Available for Dispatch',
      value: metrics.available,
      description: 'Ready to accept new assignments',
      icon: UserCheck,
      iconColor: '#16a34a',
      iconBg: '#f0fdf4',
    },
    {
      id: 'busy',
      title: 'On Delivery / Busy',
      value: metrics.busy,
      description: 'Currently handling active routes',
      icon: AlertCircle,
      iconColor: '#d97706',
      iconBg: '#fffbeb',
    },
    {
      id: 'break-offline',
      title: 'On Break / Offline',
      value: metrics.onBreak + metrics.offline,
      description: `${metrics.onBreak} on break, ${metrics.offline} off shift`,
      icon: Coffee,
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

