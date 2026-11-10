'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { dailyActivityMock, type DailyActivityData } from './mockData';

interface DeliveryActivityChartProps {
  data?: DailyActivityData[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: DailyActivityData }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="dispatcher-chart-tooltip">
        <span className="dispatcher-chart-tooltip__date">{item.date} ({item.day})</span>
        <span className="dispatcher-chart-tooltip__value">
          <strong>{item.deliveries.toLocaleString()}</strong> deliveries
        </span>
      </div>
    );
  }
  return null;
}

export default function DeliveryActivityChart({
  data = dailyActivityMock,
}: DeliveryActivityChartProps) {
  return (
    <article className="dispatcher-card">
      <div className="dispatcher-card__header">
        <div>
          <h2 className="dispatcher-card__title">Daily Delivery Activity</h2>
          <p className="dispatcher-card__subtitle">
            Delivery volume trends over the past 7 days
          </p>
        </div>
      </div>

      <div className="dispatcher-chart-container" style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 12, right: 12, left: -16, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f1f5f9"
            />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
              dy={6}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(val: number) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${val}`)}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.7)' }} />
            <Bar
              dataKey="deliveries"
              fill="#2563eb"
              radius={[6, 6, 0, 0]}
              maxBarSize={44}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

