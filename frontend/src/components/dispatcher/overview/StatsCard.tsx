import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { StatTrend } from './mockData';

export interface StatsCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: StatTrend;
}

export default function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor = '#2563eb',
  iconBg = '#eff6ff',
  trend,
}: StatsCardProps) {
  return (
    <article className="dispatcher-stats-card">
      <div className="dispatcher-stats-card__top">
        <div className="dispatcher-stats-card__info">
          <span className="dispatcher-stats-card__title">{title}</span>
          <div className="dispatcher-stats-card__value">{value}</div>
        </div>

        <div
          className="dispatcher-stats-card__icon-wrapper"
          style={{ backgroundColor: iconBg, color: iconColor }}
          aria-hidden="true"
        >
          <Icon size={22} strokeWidth={2.2} />
        </div>
      </div>

      <div className="dispatcher-stats-card__bottom">
        {trend && (
          <span
            className={`dispatcher-stats-card__trend ${
              trend.isPositive
                ? 'dispatcher-stats-card__trend--positive'
                : 'dispatcher-stats-card__trend--negative'
            }`}
          >
            {trend.isPositive ? (
              <ArrowUpRight size={14} aria-hidden="true" />
            ) : (
              <ArrowDownRight size={14} aria-hidden="true" />
            )}
            <span>{trend.value}</span>
          </span>
        )}
        <span className="dispatcher-stats-card__desc">
          {trend?.label ?? description}
        </span>
      </div>
    </article>
  );
}

