import { ClipboardList, Navigation, CheckCircle2, RotateCcw } from 'lucide-react';
import type { AssignmentSummaryMetrics } from './types';

interface AssignmentSummaryCardsProps {
  metrics: AssignmentSummaryMetrics;
}

export default function AssignmentSummaryCards({ metrics }: AssignmentSummaryCardsProps) {
  const cards = [
    {
      id: 'total-assignments',
      title: 'Total Assignments',
      value: metrics.totalAssignments,
      description: 'Recorded courier allocations',
      icon: ClipboardList,
      iconColor: '#2563eb',
      iconBg: '#eff6ff',
    },
    {
      id: 'active-assignments',
      title: 'Active Assignments',
      value: metrics.activeAssignments,
      description: 'Accepted or currently en route',
      icon: Navigation,
      iconColor: '#0284c7',
      iconBg: '#f0f9ff',
    },
    {
      id: 'completed-assignments',
      title: 'Completed Deliveries',
      value: metrics.completedAssignments,
      description: 'Delivered and closed out today',
      icon: CheckCircle2,
      iconColor: '#16a34a',
      iconBg: '#f0fdf4',
    },
    {
      id: 'reassigned-deliveries',
      title: 'Reassigned Deliveries',
      value: metrics.reassignedDeliveries,
      description: 'Rerouted due to courier constraints',
      icon: RotateCcw,
      iconColor: '#d97706',
      iconBg: '#fffbeb',
    },
  ];

  return (
    <section className="dispatcher-stats-grid" aria-label="Assignment summary metrics">
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

