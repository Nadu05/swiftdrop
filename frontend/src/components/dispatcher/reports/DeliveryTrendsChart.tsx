'use client';

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { DeliveryTrendPoint, TrendInterval } from './types';

interface DeliveryTrendsChartProps {
  trends: {
    daily: DeliveryTrendPoint[];
    weekly: DeliveryTrendPoint[];
    monthly: DeliveryTrendPoint[];
  };
  isLoading?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; payload: DeliveryTrendPoint }>;
  label?: string;
}

function TrendCustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="dispatcher-chart-tooltip" style={{ minWidth: 150 }}>
        <span className="dispatcher-chart-tooltip__date">{item.dateLabel || item.period}</span>
        <div style={{ marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.78rem' }}>
            <span style={{ color: '#2563eb', fontWeight: 600 }}>Delivered:</span>
            <strong>{item.delivered.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.78rem' }}>
            <span style={{ color: '#ef4444', fontWeight: 600 }}>Failed:</span>
            <strong>{item.failed.toLocaleString()}</strong>
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.25rem', marginTop: '0.15rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.8rem' }}>
            <span style={{ color: '#0f172a', fontWeight: 700 }}>Total Volume:</span>
            <strong>{item.total.toLocaleString()}</strong>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export default function DeliveryTrendsChart({
  trends,
  isLoading = false,
}: DeliveryTrendsChartProps) {
  const [interval, setInterval] = useState<TrendInterval>('daily');

  const currentData = trends[interval] || [];
  const maxTotal = Math.max(...currentData.map((d) => d.total), 10);

  return (
    <article className="dispatcher-card dispatcher-trends-card">
      <div className="dispatcher-card__header">
        <div>
          <h2 className="dispatcher-card__title">Delivery Volume Trends</h2>
          <p className="dispatcher-card__subtitle">
            Historical delivery throughput and operational trajectory
          </p>
        </div>

        <div className="dispatcher-reports-view-toggle">
          <button
            type="button"
            className={`dispatcher-reports-toggle-btn ${interval === 'daily' ? 'dispatcher-reports-toggle-btn--active' : ''}`}
            onClick={() => setInterval('daily')}
            disabled={isLoading}
          >
            Daily View
          </button>
          <button
            type="button"
            className={`dispatcher-reports-toggle-btn ${interval === 'weekly' ? 'dispatcher-reports-toggle-btn--active' : ''}`}
            onClick={() => setInterval('weekly')}
            disabled={isLoading}
          >
            Weekly View
          </button>
          <button
            type="button"
            className={`dispatcher-reports-toggle-btn ${interval === 'monthly' ? 'dispatcher-reports-toggle-btn--active' : ''}`}
            onClick={() => setInterval('monthly')}
            disabled={isLoading}
          >
            Monthly View
          </button>
        </div>
      </div>

      <div style={{ width: '100%', height: 280, position: 'relative' }}>
        {isLoading ? (
          <div className="dispatcher-reports-skeleton-chart" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={currentData}
              margin={{ top: 12, right: 16, left: -16, bottom: 0 }}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="period"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                domain={[0, Math.ceil(maxTotal * 1.15)]}
              />
              <Tooltip
                content={<TrendCustomTooltip />}
                cursor={{ fill: 'rgba(241, 245, 249, 0.65)' }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 10, fontSize: 12 }}
                formatter={(value) => (
                  <span style={{ color: '#475569', fontWeight: 500, marginRight: 8 }}>
                    {value === 'delivered' ? 'Delivered' : 'Failed'}
                  </span>
                )}
              />
              <Bar
                name="delivered"
                dataKey="delivered"
                fill="#2563eb"
                radius={[6, 6, 0, 0]}
                maxBarSize={38}
              >
                {currentData.map((entry, index) => {
                  // Highlight peak volume bar with teal accent
                  const isPeak = entry.total === maxTotal;
                  return (
                    <Cell
                      key={`delivered-${index}`}
                      fill={isPeak ? '#14b8a6' : '#2563eb'}
                    />
                  );
                })}
              </Bar>
              <Bar
                name="failed"
                dataKey="failed"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="dispatcher-trends-legend-footer">
        <span className="dispatcher-trends-note">
          Peak performance periods are automatically highlighted in <strong style={{ color: '#0d9488' }}>Teal</strong>.
        </span>
      </div>
    </article>
  );
}

