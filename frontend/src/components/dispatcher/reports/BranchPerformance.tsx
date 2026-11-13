'use client';

import React, { useState, useMemo } from 'react';
import { ArrowUpDown, Building, CheckCircle2 } from 'lucide-react';
import type { BranchPerformanceRecord } from './types';

interface BranchPerformanceProps {
  branches: BranchPerformanceRecord[];
  isLoading?: boolean;
}

type SortField = 'total' | 'onTime' | 'success' | 'failed';

export default function BranchPerformance({
  branches,
  isLoading = false,
}: BranchPerformanceProps) {
  const [sortField, setSortField] = useState<SortField>('onTime');
  const [viewMode, setViewMode] = useState<'visual' | 'table'>('visual');

  const sortedBranches = useMemo(() => {
    return [...branches].sort((a, b) => {
      if (sortField === 'total') return b.totalDeliveries - a.totalDeliveries;
      if (sortField === 'onTime') return b.onTimeRate - a.onTimeRate;
      if (sortField === 'success') return b.successRate - a.successRate;
      if (sortField === 'failed') return a.failedDeliveries - b.failedDeliveries;
      return 0;
    });
  }, [branches, sortField]);

  return (
    <article className="dispatcher-card dispatcher-reports-chart-card">
      <div className="dispatcher-card__header">
        <div>
          <h2 className="dispatcher-card__title">Branch Performance</h2>
          <p className="dispatcher-card__subtitle">
            Operational efficiency across regional dispatch hubs
          </p>
        </div>

        <div className="dispatcher-branch-perf-controls">
          {/* View Toggle */}
          <div className="dispatcher-reports-view-toggle">
            <button
              type="button"
              className={`dispatcher-reports-toggle-btn ${viewMode === 'visual' ? 'dispatcher-reports-toggle-btn--active' : ''}`}
              onClick={() => setViewMode('visual')}
            >
              Overview
            </button>
            <button
              type="button"
              className={`dispatcher-reports-toggle-btn ${viewMode === 'table' ? 'dispatcher-reports-toggle-btn--active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              Details Table
            </button>
          </div>

          {/* Sort Selector */}
          <div className="dispatcher-select-wrapper dispatcher-branch-sort-wrapper">
            <select
              className="dispatcher-select dispatcher-branch-sort-select"
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              aria-label="Sort branches by"
            >
              <option value="onTime">Sort: On-Time Rate</option>
              <option value="total">Sort: Total Volume</option>
              <option value="success">Sort: Success Rate</option>
              <option value="failed">Sort: Fewest Failures</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="dispatcher-reports-skeleton-list">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="dispatcher-reports-skeleton-item" />
          ))}
        </div>
      ) : branches.length === 0 ? (
        <div className="dispatcher-reports-empty">
          <Building size={32} color="#94a3b8" />
          <p>No branch performance data matches the selected filters.</p>
        </div>
      ) : viewMode === 'visual' ? (
        /* Visual progress bars matching the reference image style */
        <div className="dispatcher-branch-bars-list">
          {sortedBranches.map((b, index) => {
            // First ranked branch gets high-performance teal highlight; others use royal blue
            const isTopRanked = index === 0;
            const barColor = isTopRanked ? '#14b8a6' : '#2563eb';

            return (
              <div key={b.id} className="dispatcher-branch-bar-item">
                <div className="dispatcher-branch-bar-header">
                  <div className="dispatcher-branch-bar-title-group">
                    <span className="dispatcher-branch-bar-name">{b.branchName}</span>
                    <span className="dispatcher-branch-bar-code">{b.branchCode}</span>
                  </div>

                  <div className="dispatcher-branch-bar-metrics">
                    <span className="dispatcher-branch-bar-deliveries">
                      {b.successfulDeliveries} / {b.totalDeliveries} pkgs
                    </span>
                    <span className="dispatcher-branch-bar-rate" style={{ color: isTopRanked ? '#0d9488' : '#0f172a' }}>
                      {b.onTimeRate}% on-time
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div
                  className="dispatcher-branch-bar-track"
                  role="progressbar"
                  aria-valuenow={b.onTimeRate}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="dispatcher-branch-bar-fill"
                    style={{
                      width: `${Math.min(100, Math.max(10, b.onTimeRate))}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Compact Data Table for detailed operational drilldown */
        <div className="dispatcher-table-container">
          <table className="dispatcher-table">
            <thead>
              <tr>
                <th>Branch</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>Successful</th>
                <th style={{ textAlign: 'right' }}>On-Time</th>
                <th style={{ textAlign: 'right' }}>Failed</th>
                <th style={{ textAlign: 'right' }}>Success Rate</th>
              </tr>
            </thead>
            <tbody>
              {sortedBranches.map((b) => (
                <tr key={b.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{b.branchName}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{b.branchCode} • {b.city}</div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{b.totalDeliveries.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', color: '#0d9488', fontWeight: 600 }}>
                    {b.successfulDeliveries.toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    {b.onTimeRate}%
                  </td>
                  <td style={{ textAlign: 'right', color: b.failedDeliveries > 0 ? '#ef4444' : '#64748b' }}>
                    {b.failedDeliveries}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="dispatcher-status-badge" style={{ background: '#f0fdfa', color: '#0f766e' }}>
                      <CheckCircle2 size={12} />
                      {b.successRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

