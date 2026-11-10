'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { deliveryStatusMock, type DeliveryStatusData } from './mockData';

interface DeliveryStatusChartProps {
  data?: DeliveryStatusData[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: DeliveryStatusData }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="dispatcher-chart-tooltip">
        <span className="dispatcher-chart-tooltip__date" style={{ color: item.color }}>
          ● {item.name}
        </span>
        <span className="dispatcher-chart-tooltip__value">
          <strong>{item.value.toLocaleString()}</strong> orders
        </span>
      </div>
    );
  }
  return null;
}

export default function DeliveryStatusChart({
  data = deliveryStatusMock,
}: DeliveryStatusChartProps) {
  const totalDeliveries = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <article className="dispatcher-card">
      <div className="dispatcher-card__header">
        <div>
          <h2 className="dispatcher-card__title">Delivery Status Breakdown</h2>
          <p className="dispatcher-card__subtitle">
            Current operational parcel distribution
          </p>
        </div>
      </div>

      <div className="dispatcher-status-chart-body">
        {/* Donut Chart with Centered Total Count */}
        <div className="dispatcher-donut-wrapper" style={{ width: 220, height: 220, position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={68}
                outerRadius={95}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="dispatcher-donut-center" aria-hidden="true">
            <span className="dispatcher-donut-center__count">
              {totalDeliveries.toLocaleString()}
            </span>
            <span className="dispatcher-donut-center__label">Total Orders</span>
          </div>
        </div>

        {/* Legend with Status Names, Counts, and Percentages */}
        <ul className="dispatcher-status-legend" aria-label="Status category breakdown">
          {data.map((item) => {
            const percentage = totalDeliveries > 0 ? ((item.value / totalDeliveries) * 100).toFixed(1) : '0';
            return (
              <li key={item.name} className="dispatcher-status-legend__item">
                <div className="dispatcher-status-legend__indicator">
                  <span
                    className="dispatcher-status-legend__dot"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <span className="dispatcher-status-legend__name">{item.name}</span>
                </div>
                <div className="dispatcher-status-legend__values">
                  <span className="dispatcher-status-legend__count">{item.value.toLocaleString()}</span>
                  <span className="dispatcher-status-legend__percentage">({percentage}%)</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
}

