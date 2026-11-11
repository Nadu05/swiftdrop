'use client';

import React from 'react';
import type { DeliveryStatusItem } from './types';

interface DeliveryStatusChartProps {
  data: DeliveryStatusItem[];
  totalDeliveries: number;
  isLoading?: boolean;
}

export default function DeliveryStatusChart({
  data,
  totalDeliveries,
  isLoading = false,
}: DeliveryStatusChartProps) {
  return (
    <article className="dispatcher-card dispatcher-reports-chart-card">
      <div className="dispatcher-card__header">
        <div>
          <h2 className="dispatcher-card__title">Delivery Status Breakdown</h2>
          <p className="dispatcher-card__subtitle">
            Operations distribution for the selected period ({totalDeliveries.toLocaleString()} orders)
          </p>
        </div>
        <span className="dispatcher-pill-badge dispatcher-pill-badge--live">LIVE METRICS</span>
      </div>

      <div className="dispatcher-status-breakdown-list" role="region" aria-label="Status Distribution">
        {isLoading ? (
          <div className="dispatcher-reports-skeleton-list">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="dispatcher-reports-skeleton-item" />
            ))}
          </div>
        ) : (
          data.map((item) => (
            <div key={item.status} className="dispatcher-status-breakdown-row">
              <div className="dispatcher-status-breakdown-meta">
                <div className="dispatcher-status-breakdown-label-group">
                  <span
                    className="dispatcher-status-dot"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <span className="dispatcher-status-breakdown-name">{item.status}</span>
                </div>

                <div className="dispatcher-status-breakdown-numbers">
                  <span className="dispatcher-status-breakdown-count">
                    {item.count.toLocaleString()}
                  </span>
                  <span className="dispatcher-status-breakdown-pct">
                    ({item.percentage}%)
                  </span>
                </div>
              </div>

              {/* Horizontal Progress Bar */}
              <div
                className="dispatcher-status-breakdown-track"
                role="progressbar"
                aria-valuenow={item.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${item.status}: ${item.count} deliveries (${item.percentage}%)`}
              >
                <div
                  className="dispatcher-status-breakdown-fill"
                  style={{
                    width: `${Math.min(100, Math.max(item.percentage > 0 ? 3 : 0, item.percentage))}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary Footer */}
      <div className="dispatcher-status-breakdown-footer">
        <div className="dispatcher-status-breakdown-footer-stat">
          <span className="dispatcher-status-breakdown-footer-label">Delivered &amp; In-Transit</span>
          <span className="dispatcher-status-breakdown-footer-val" style={{ color: '#0d9488' }}>
            {data
              .filter((d) => d.status === 'Delivered' || d.status === 'In Transit')
              .reduce((acc, curr) => acc + curr.percentage, 0)
              .toFixed(1)}
            %
          </span>
        </div>
        <div className="dispatcher-status-breakdown-footer-stat">
          <span className="dispatcher-status-breakdown-footer-label">Exceptions (Failed/Cancelled)</span>
          <span className="dispatcher-status-breakdown-footer-val" style={{ color: '#ef4444' }}>
            {data
              .filter((d) => d.status === 'Failed' || d.status === 'Cancelled')
              .reduce((acc, curr) => acc + curr.percentage, 0)
              .toFixed(1)}
            %
          </span>
        </div>
      </div>
    </article>
  );
}

