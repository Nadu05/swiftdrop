import { Package, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import type { DeliveryHistorySummaryMetrics } from './types';

interface DeliveryHistorySummaryProps {
  metrics: DeliveryHistorySummaryMetrics;
}

export default function DeliveryHistorySummary({ metrics }: DeliveryHistorySummaryProps) {
  const cards = [
    {
      id: 'total-deliveries',
      title: 'Total Deliveries',
      value: metrics.totalDeliveries,
      description: 'Historical dispatched orders',
      icon: Package,
      iconColor: '#2563eb',
      iconBg: '#eff6ff',
    },
    {
      id: 'successfully-delivered',
      title: 'Successfully Delivered',
      value: metrics.successfullyDelivered,
      description: `${
        metrics.totalDeliveries > 0
          ? `${Math.round((metrics.successfullyDelivered / metrics.totalDeliveries) * 100)}% completion rate`
          : '0% completion'
      }`,
      icon: CheckCircle2,
      iconColor: '#16a34a',
      iconBg: '#f0fdf4',
    },
    {
      id: 'failed-deliveries',
      title: 'Failed Deliveries',
      value: metrics.failedDeliveries,
      description: 'Unreachable, returned, or cancelled',
      icon: XCircle,
      iconColor: '#dc2626',
      iconBg: '#fef2f2',
    },
    {
      id: 'delivery-attempts',
      title: 'Total Delivery Attempts',
      value: metrics.totalDeliveryAttempts,
      description: `Avg ${(
        metrics.totalDeliveries > 0
          ? metrics.totalDeliveryAttempts / metrics.totalDeliveries
          : 0
      ).toFixed(1)} attempts per order`,
      icon: RotateCcw,
      iconColor: '#d97706',
      iconBg: '#fffbeb',
    },
  ];

  return (
    <section className="dispatcher-stats-grid" aria-label="Delivery history summary metrics">
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

