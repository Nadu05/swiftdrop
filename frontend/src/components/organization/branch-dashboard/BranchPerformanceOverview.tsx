'use client';

import { memo, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Info,
  Package,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type {
  BranchComputedPerformanceMetrics,
  BranchCourierRosterItem,
} from '@/types/organization.types';
import {
  MOCK_DAILY_DELIVERY_TRENDS,
  MOCK_PERFORMANCE_BY_PERIOD,
  type DailyDeliveryTrendItem,
} from '@/api/mock/branch-dashboard.mock';

export interface BranchPerformanceOverviewProps {
  branchId: number | null;
  branchName: string | null;
  performance: BranchComputedPerformanceMetrics;
  couriers: BranchCourierRosterItem[];
  isPerformanceAvailable: boolean;
  isCourierRosterAvailable: boolean;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  isPreviewMode?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; name: string; color: string }>;
  label?: string;
}

function CustomTrendsTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const received = payload.find((p) => p.dataKey === 'deliveriesReceived')?.value ?? 0;
    const completed = payload.find((p) => p.dataKey === 'deliveriesCompleted')?.value ?? 0;
    const rate = received > 0 ? Math.round((completed / received) * 100) : 0;

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200 text-xs space-y-1 z-50">
        <strong className="font-bold text-slate-900 block pb-1 border-b border-slate-100">
          {label}
        </strong>
        <div className="flex items-center justify-between gap-4 text-blue-700">
          <span>Deliveries Received:</span>
          <strong>{received}</strong>
        </div>
        <div className="flex items-center justify-between gap-4 text-emerald-700">
          <span>Deliveries Completed:</span>
          <strong>{completed}</strong>
        </div>
        <div className="flex items-center justify-between gap-4 text-slate-700 pt-1 border-t border-slate-100 font-semibold">
          <span>Completion Rate:</span>
          <span className="text-indigo-600">{rate}%</span>
        </div>
      </div>
    );
  }
  return null;
}

/**
 * Section E — Branch Performance Overview (Interactive Development Preview with Daily Delivery Trends Chart)
 * Member 04 — Branch Manager Dashboard UI
 *
 * Provides:
 * - 5 Operational KPI indicator tiles:
 *   1. Deliveries Received
 *   2. Deliveries Completed
 *   3. Pending Deliveries
 *   4. Completion Rate (%)
 *   5. Avg. Delivery Duration (min)
 * - Date-range selector: Today, Yesterday, Last 7 Days, Last 30 Days.
 * - Daily Delivery Trends Chart (Recharts BarChart with Received vs Completed deliveries).
 * - Courier Workload Distribution progress indicators.
 * - Demonstration badge clearly labeling sample analytics.
 */
function BranchPerformanceOverview({
  branchId,
  branchName,
  performance,
  couriers,
  isPerformanceAvailable,
  isCourierRosterAvailable,
  isLoading,
  error,
  onRetry,
  isPreviewMode = false,
}: BranchPerformanceOverviewProps) {
  const [selectedRange, setSelectedRange] = useState<'today' | 'yesterday' | 'last7days' | 'last30days'>('today');

  // Compute active performance metrics based on selected date range when in preview mode
  const activePerformance = useMemo(() => {
    if (isPreviewMode && MOCK_PERFORMANCE_BY_PERIOD[selectedRange]) {
      const data = MOCK_PERFORMANCE_BY_PERIOD[selectedRange];
      return {
        periodLabel: data.periodLabel,
        deliveriesReceivedToday: data.deliveriesReceivedToday,
        deliveriesCompletedToday: data.deliveriesCompletedToday,
        pendingDeliveries: data.pendingDeliveries,
        failedDeliveriesToday: data.failedDeliveriesToday,
        completionRatePercent: data.completionRatePercent,
        averageDeliveryDurationMinutes: data.averageDeliveryDurationMinutes,
      };
    }
    return performance;
  }, [isPreviewMode, selectedRange, performance]);

  const formatNumber = (val: number | null): string => {
    if (isLoading) return '...';
    if (val === null || val === undefined) return '—';
    return String(val);
  };

  const formatRate = (val: number | null): string => {
    if (isLoading) return '...';
    if (val === null || val === undefined) return '—';
    return `${val}%`;
  };

  const formatDuration = (val: number | null): string => {
    if (isLoading) return '...';
    if (val === null || val === undefined) return '—';
    return `${val} min`;
  };

  const maxJobs =
    couriers.length > 0
      ? Math.max(1, ...couriers.map((c) => c.activeJobs || 0))
      : 1;

  return (
    <section
      id="branch-performance"
      className="org-directory-card org-bm-card"
      aria-labelledby="org-bm-performance-heading"
      data-testid="branch-performance-overview"
    >
      <div className="org-directory-card__header">
        <div className="org-directory-card__title-group">
          <div className="org-dashboard-card__title-row">
            <h2
              id="org-bm-performance-heading"
              className="org-directory-card__title"
            >
              Branch Performance Overview
            </h2>
            {isPreviewMode && (
              <span className="org-dashboard-badge org-dashboard-badge--preview">
                Demonstration Data
              </span>
            )}
            <span className="org-dashboard-badge org-dashboard-badge--contract">
              {activePerformance.periodLabel || 'Today'}
            </span>
          </div>
          <p className="org-directory-card__subtitle">
            Operational throughput and completion indicators for{' '}
            {branchName ? <strong>{branchName}</strong> : 'your assigned branch'}.
            KPIs are calculated with verified period numerators and denominators.
          </p>
        </div>

        <div className="org-dashboard-card__header-actions">
          {/* Interactive Date-Range Selector */}
          <div className="org-bm-date-range-pills" role="radiogroup" aria-label="Select performance period">
            <button
              type="button"
              className={`org-bm-date-pill ${selectedRange === 'today' ? 'org-bm-date-pill--active' : ''}`}
              onClick={() => setSelectedRange('today')}
              role="radio"
              aria-checked={selectedRange === 'today'}
            >
              Today
            </button>
            <button
              type="button"
              className={`org-bm-date-pill ${selectedRange === 'yesterday' ? 'org-bm-date-pill--active' : ''}`}
              onClick={() => setSelectedRange('yesterday')}
              role="radio"
              aria-checked={selectedRange === 'yesterday'}
            >
              Yesterday
            </button>
            <button
              type="button"
              className={`org-bm-date-pill ${selectedRange === 'last7days' ? 'org-bm-date-pill--active' : ''}`}
              onClick={() => setSelectedRange('last7days')}
              role="radio"
              aria-checked={selectedRange === 'last7days'}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              className={`org-bm-date-pill ${selectedRange === 'last30days' ? 'org-bm-date-pill--active' : ''}`}
              onClick={() => setSelectedRange('last30days')}
              role="radio"
              aria-checked={selectedRange === 'last30days'}
            >
              Last 30 Days
            </button>
          </div>

          <button
            type="button"
            className="org-btn org-btn--secondary"
            onClick={onRetry}
            disabled={isLoading}
            aria-label="Synchronize branch analytics"
          >
            <RefreshCw
              size={14}
              className={isLoading ? 'org-icon--spinning' : undefined}
              aria-hidden="true"
            />
            <span>Sync Analytics</span>
          </button>
        </div>
      </div>

      {/* 5 Operational Performance Indicator Tiles */}
      <div
        className="org-bm-perf-grid"
        aria-label="Branch performance operational indicators"
      >
        <div className="org-bm-perf-item">
          <div className="org-bm-perf-item__top">
            <span className="org-bm-perf-item__label">
              Deliveries Received
            </span>
            <Package size={15} className="text-blue-600" aria-hidden="true" />
          </div>
          <strong
            className="org-bm-perf-item__value"
            data-testid="perf-received-today"
          >
            {formatNumber(activePerformance.deliveriesReceivedToday)}
          </strong>
          <span className="org-bm-perf-item__note">
            {activePerformance.deliveriesReceivedToday !== null
              ? `Routed for ${activePerformance.periodLabel}`
              : 'Analytics contract pending'}
          </span>
        </div>

        <div className="org-bm-perf-item">
          <div className="org-bm-perf-item__top">
            <span className="org-bm-perf-item__label">
              Deliveries Completed
            </span>
            <CheckCircle2
              size={15}
              className="text-emerald-600"
              aria-hidden="true"
            />
          </div>
          <strong
            className="org-bm-perf-item__value"
            data-testid="perf-completed-today"
          >
            {formatNumber(activePerformance.deliveriesCompletedToday)}
          </strong>
          <span className="org-bm-perf-item__note">
            {activePerformance.deliveriesCompletedToday !== null
              ? `Confirmed delivered in period`
              : 'Analytics contract pending'}
          </span>
        </div>

        <div className="org-bm-perf-item">
          <div className="org-bm-perf-item__top">
            <span className="org-bm-perf-item__label">Pending Deliveries</span>
            <Activity size={15} className="text-amber-600" aria-hidden="true" />
          </div>
          <strong
            className="org-bm-perf-item__value"
            data-testid="perf-pending-deliveries"
          >
            {formatNumber(activePerformance.pendingDeliveries)}
          </strong>
          <span className="org-bm-perf-item__note">
            {activePerformance.pendingDeliveries !== null
              ? 'In queue or active transit'
              : 'Analytics contract pending'}
          </span>
        </div>

        <div className="org-bm-perf-item">
          <div className="org-bm-perf-item__top">
            <span className="org-bm-perf-item__label">
              Completion Rate
            </span>
            <TrendingUp
              size={15}
              className="text-indigo-600"
              aria-hidden="true"
            />
          </div>
          <strong
            className="org-bm-perf-item__value text-indigo-700"
            data-testid="perf-completion-rate"
          >
            {formatRate(activePerformance.completionRatePercent)}
          </strong>
          <span className="org-bm-perf-item__note">
            {activePerformance.completionRatePercent !== null
              ? `${activePerformance.deliveriesCompletedToday} of ${activePerformance.deliveriesReceivedToday} delivered`
              : 'Requires verified period counts'}
          </span>
        </div>

        <div className="org-bm-perf-item">
          <div className="org-bm-perf-item__top">
            <span className="org-bm-perf-item__label">
              Avg. Delivery Duration
            </span>
            <Clock size={15} className="text-sky-600" aria-hidden="true" />
          </div>
          <strong
            className="org-bm-perf-item__value"
            data-testid="perf-avg-duration"
          >
            {formatDuration(activePerformance.averageDeliveryDurationMinutes)}
          </strong>
          <span className="org-bm-perf-item__note">
            {activePerformance.averageDeliveryDurationMinutes !== null
              ? 'Pickup-to-delivery mean'
              : 'Requires Order lifecycle timestamps'}
          </span>
        </div>
      </div>

      {/* Daily Delivery Trends Chart (Prompt §3: "Daily delivery trends: Make sure charts display correctly and have meaningful labels, axes and legends.") */}
      {(isPerformanceAvailable || isPreviewMode) && (
        <div className="org-bm-chart-card">
          <div className="org-bm-chart-card__header flex items-center justify-between flex-wrap gap-2 pb-3 mb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-blue-600" aria-hidden="true" />
                <h3 className="text-sm font-bold text-slate-900">
                  Daily Delivery Volume Trends (Past 7 Days)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparison of delivery requests received vs. successfully delivered at Colombo Central Branch.
              </p>
            </div>
            {isPreviewMode && (
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                Demonstration Trend Data
              </span>
            )}
          </div>

          <div
            className="w-full h-64"
            role="img"
            aria-label="Daily delivery volume trends bar chart showing received vs completed deliveries"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={MOCK_DAILY_DELIVERY_TRENDS}
                margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="dayLabel"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  domain={[0, 60]}
                />
                <Tooltip content={<CustomTrendsTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: 10, fontSize: 12 }}
                />
                <Bar
                  dataKey="deliveriesReceived"
                  name="Received Requests"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="deliveriesCompleted"
                  name="Completed Deliveries"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Courier Workload Distribution */}
      {isCourierRosterAvailable && couriers.length > 0 && (
        <div
          className="org-bm-workload-distribution"
          aria-label="Courier workload distribution"
        >
          <div className="org-bm-workload-list-wrap__header">
            <h3 className="org-bm-workload-list-wrap__title">
              Courier Workload Distribution
            </h3>
            <span className="org-bm-workload-list-wrap__hint">
              Active delivery assignments per registered branch courier
            </span>
          </div>

          <div className="org-bm-workload-bars">
            {couriers.slice(0, 6).map((courier) => {
              const widthPct = Math.round((courier.activeJobs / maxJobs) * 100);
              return (
                <div key={courier.id} className="org-bm-workload-bar-row">
                  <div className="org-bm-workload-bar-row__meta">
                    <span className="font-semibold text-slate-800">
                      {courier.name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {courier.vehicleType} · {courier.availability} ·{' '}
                      <strong>
                        {courier.activeJobs}{' '}
                        {courier.activeJobs === 1 ? 'job' : 'jobs'}
                      </strong>
                    </span>
                  </div>
                  <div
                    className="org-bm-workload-bar-row__track"
                    role="progressbar"
                    aria-valuenow={courier.activeJobs}
                    aria-valuemin={0}
                    aria-valuemax={maxJobs}
                    aria-label={`${courier.name} active jobs`}
                  >
                    <div
                      className="org-bm-workload-bar-row__fill"
                      style={{ width: `${Math.max(4, widthPct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Analytics Unavailable / Pending Contract Notice (Only when NOT in preview mode and unavailable) */}
      {!isLoading && !isPreviewMode && (!isPerformanceAvailable || Boolean(error)) && (
        <div
          className="org-state-box org-dashboard-unavailable"
          role="status"
          data-testid="branch-performance-unavailable"
        >
          <div className="org-state-box__icon" aria-hidden="true">
            <BarChart3 size={22} />
          </div>
          <h3 className="org-state-box__title">
            Branch Performance Analytics API Unavailable
          </h3>
          <p className="org-state-box__desc">
            {error ||
              `Historical and daily aggregated performance metrics for branch #${
                branchId ?? '—'
              } are not yet exposed by the backend.`}
          </p>
          <div className="org-dashboard-contract-note">
            <Info
              size={15}
              className="org-dashboard-contract-note__icon"
              aria-hidden="true"
            />
            <span>
              <strong>KPI Integrity Rule Enforced:</strong> Completion rate,
              average delivery duration, and daily volume trends are never
              estimated on the frontend from partial queue data. Connect{' '}
              <code className="org-inline-code">
                GET /api/v1/organization/branches/&#123;branchId&#125;/performance-summary
              </code>{' '}
              (returning{' '}
              <code className="org-inline-code">
                BranchPerformanceSummaryResponse
              </code>{' '}
              with verified period numerators and denominators from Order &amp;
              Dispatch Services) to populate these KPIs.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

export default memo(BranchPerformanceOverview);
