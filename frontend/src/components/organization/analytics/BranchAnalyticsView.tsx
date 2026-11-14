'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowUpDown,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Filter,
  LineChart as LineChartIcon,
  MapPin,
  PieChart as PieIcon,
  RefreshCw,
  TrendingUp,
  Truck,
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
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  calculateBranchPerformanceMetrics,
  resolveBranchDistrict,
} from '@/api/services/organization.api';
import { getAllMockBranchPerformanceSummaries } from '@/api/mock/organization-admin.mock';
import { useBranches } from '@/hooks/api/use-organization';
import { SRI_LANKAN_DISTRICTS } from '@/lib/geocoding';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const DISTRICT_COLORS = [
  '#2563eb', // Blue
  '#10b981', // Emerald
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#14b8a6', // Teal
];

export type TimePeriodPreset =
  | 'today'
  | 'yesterday'
  | '7d'
  | '30d'
  | 'quarter'
  | 'custom';

interface PeriodConfig {
  label: string;
  shortLabel: string;
  multiplier: number;
  durationOffset: number; // minutes variance
  completionRateDelta: number; // percentage variance
}

const PERIOD_CONFIGS: Record<TimePeriodPreset, PeriodConfig> = {
  today: {
    label: 'Today (Live Shift)',
    shortLabel: 'Today',
    multiplier: 1,
    durationOffset: 0,
    completionRateDelta: 0,
  },
  yesterday: {
    label: 'Yesterday (Full Shift)',
    shortLabel: 'Yesterday',
    multiplier: 0.96,
    durationOffset: 1,
    completionRateDelta: 0.5,
  },
  '7d': {
    label: 'Last 7 Days',
    shortLabel: 'Last 7 Days',
    multiplier: 6.8,
    durationOffset: -1,
    completionRateDelta: 1.2,
  },
  '30d': {
    label: 'Last 30 Days',
    shortLabel: 'Last 30 Days',
    multiplier: 29.4,
    durationOffset: -2,
    completionRateDelta: 1.8,
  },
  quarter: {
    label: 'This Quarter (Q1 2026)',
    shortLabel: 'Q1 2026',
    multiplier: 87.5,
    durationOffset: -2,
    completionRateDelta: 2.1,
  },
  custom: {
    label: 'Custom Date Range',
    shortLabel: 'Custom',
    multiplier: 1,
    durationOffset: 0,
    completionRateDelta: 0,
  },
};

export default function BranchAnalyticsView() {
  const [isMounted, setIsMounted] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriodPreset>('today');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-03-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-03-25');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [sortBy, setSortBy] = useState<'volume' | 'rate' | 'duration'>('volume');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    data: branches = [],
    isLoading,
    isRefetching,
    refetch,
    dataUpdatedAt,
  } = useBranches();

  const lastUpdatedLabel = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  // Active period configuration
  const activePeriodConfig = useMemo(() => {
    if (timePeriod === 'custom') {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      const diffMs = Math.max(0, end.getTime() - start.getTime());
      const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
      return {
        label: `Custom: ${customStartDate} to ${customEndDate} (${days} ${
          days === 1 ? 'day' : 'days'
        })`,
        shortLabel: `${days}d range`,
        multiplier: Math.max(0.5, Number((days * 0.98).toFixed(1))),
        durationOffset: -1,
        completionRateDelta: 1.0,
      };
    }
    return PERIOD_CONFIGS[timePeriod];
  }, [timePeriod, customStartDate, customEndDate]);

  // Aggregate branch data with live or historical scaled performance metrics
  const enrichedBranches = useMemo(() => {
    const perfMap = getAllMockBranchPerformanceSummaries();
    const { multiplier, durationOffset, completionRateDelta } = activePeriodConfig;

    return branches.map((branch) => {
      const district = resolveBranchDistrict(branch);
      const rawPerf = perfMap[branch.id] ?? null;
      const basePerf = calculateBranchPerformanceMetrics(rawPerf);

      if (branch.status === 'INACTIVE' || !basePerf.deliveriesReceivedToday) {
        return {
          ...branch,
          district,
          received: 0,
          completed: 0,
          pending: 0,
          failed: 0,
          completionRate: null,
          avgDuration: null,
        };
      }

      const received = Math.round((basePerf.deliveriesReceivedToday ?? 0) * multiplier);
      const rawCompleted = Math.round(
        (basePerf.deliveriesCompletedToday ?? 0) * multiplier
      );
      const completed = Math.min(received, rawCompleted);
      const pending =
        timePeriod === 'today'
          ? basePerf.pendingDeliveries ?? 0
          : Math.max(0, received - completed - Math.round(received * 0.015));
      const failed =
        timePeriod === 'today'
          ? basePerf.failedDeliveriesToday ?? 0
          : Math.round(received * 0.018);

      let completionRate: number | null = null;
      if (received > 0) {
        const calculatedRate = (completed / received) * 100 + completionRateDelta;
        completionRate = Math.min(99.5, Math.max(80, Math.round(calculatedRate * 10) / 10));
      }

      let avgDuration: number | null = null;
      if (basePerf.averageDeliveryDurationMinutes) {
        avgDuration = Math.max(
          18,
          basePerf.averageDeliveryDurationMinutes + durationOffset
        );
      }

      return {
        ...branch,
        district,
        received,
        completed,
        pending,
        failed,
        completionRate,
        avgDuration,
      };
    });
  }, [branches, activePeriodConfig, timePeriod]);

  // Filter branches based on selections
  const filteredBranches = useMemo(() => {
    return enrichedBranches.filter((b) => {
      const matchesDistrict =
        selectedDistrict === 'ALL' ||
        b.district.toLowerCase() === selectedDistrict.toLowerCase();
      const matchesStatus =
        statusFilter === 'ALL' || b.status === statusFilter;
      return matchesDistrict && matchesStatus;
    });
  }, [enrichedBranches, selectedDistrict, statusFilter]);

  // Sorted branches for comparison table and charts
  const sortedBranches = useMemo(() => {
    const copy = [...filteredBranches];
    if (sortBy === 'volume') {
      return copy.sort((a, b) => b.received - a.received);
    }
    if (sortBy === 'rate') {
      return copy.sort((a, b) => (b.completionRate ?? 0) - (a.completionRate ?? 0));
    }
    if (sortBy === 'duration') {
      return copy.sort((a, b) => (a.avgDuration ?? 999) - (b.avgDuration ?? 999));
    }
    return copy;
  }, [filteredBranches, sortBy]);

  // Network Totals for summary KPI cards
  const networkStats = useMemo(() => {
    let totalReceived = 0;
    let totalCompleted = 0;
    let totalPending = 0;
    let durationSum = 0;
    let durationCount = 0;

    for (const b of filteredBranches) {
      totalReceived += b.received;
      totalCompleted += b.completed;
      totalPending += b.pending;
      if (typeof b.avgDuration === 'number') {
        durationSum += b.avgDuration;
        durationCount += 1;
      }
    }

    const avgRate =
      totalReceived > 0
        ? Math.round((totalCompleted / totalReceived) * 1000) / 10
        : null;
    const avgDuration =
      durationCount > 0 ? Math.round(durationSum / durationCount) : null;

    return {
      totalReceived,
      totalCompleted,
      totalPending,
      avgRate,
      avgDuration,
    };
  }, [filteredBranches]);

  // Volume Bar Chart Data
  const volumeChartData = useMemo(() => {
    return sortedBranches.map((b) => ({
      name: b.name.replace(' Hub', ''),
      code: b.code,
      received: b.received,
      completed: b.completed,
      pending: b.pending,
    }));
  }, [sortedBranches]);

  // District Pie / Donut Chart Data
  const districtDistributionData = useMemo(() => {
    const districtMap = new Map<string, number>();
    for (const b of filteredBranches) {
      districtMap.set(b.district, (districtMap.get(b.district) ?? 0) + b.received);
    }
    return Array.from(districtMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredBranches]);

  // Turnaround Duration Chart Data
  const durationChartData = useMemo(() => {
    return sortedBranches
      .filter((b) => typeof b.avgDuration === 'number')
      .map((b) => ({
        name: b.name.replace(' Hub', ''),
        duration: b.avgDuration,
        target: 30, // 30 min SLA benchmark
      }));
  }, [sortedBranches]);

  // Timeline Trend Progression Data for the selected period
  const timelineTrendData = useMemo(() => {
    if (timePeriod === 'today' || timePeriod === 'yesterday') {
      const times = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
      const factorStep = [0.12, 0.28, 0.49, 0.71, 0.86, 0.96, 1.0];
      return times.map((t, idx) => ({
        time: t,
        volume: Math.round(networkStats.totalReceived * factorStep[idx]),
        completed: Math.round(networkStats.totalCompleted * factorStep[idx]),
      }));
    }

    if (timePeriod === '7d') {
      const days = ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed (Today)'];
      const dailyShares = [0.13, 0.16, 0.17, 0.12, 0.14, 0.14, 0.14];
      return days.map((day, idx) => ({
        time: day,
        volume: Math.round(networkStats.totalReceived * dailyShares[idx]),
        completed: Math.round(networkStats.totalCompleted * dailyShares[idx]),
      }));
    }

    if (timePeriod === '30d') {
      const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Current Week'];
      const weekShares = [0.22, 0.24, 0.21, 0.23, 0.10];
      return weeks.map((w, idx) => ({
        time: w,
        volume: Math.round(networkStats.totalReceived * weekShares[idx]),
        completed: Math.round(networkStats.totalCompleted * weekShares[idx]),
      }));
    }

    // Quarter or Custom Range (interval breakdown)
    const intervals = ['Period Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Latest Period'];
    const shares = [0.18, 0.22, 0.21, 0.23, 0.16];
    return intervals.map((intv, idx) => ({
      time: intv,
      volume: Math.round(networkStats.totalReceived * shares[idx]),
      completed: Math.round(networkStats.totalCompleted * shares[idx]),
    }));
  }, [timePeriod, networkStats.totalReceived, networkStats.totalCompleted]);

  // Available districts for filter dropdown
  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    for (const b of enrichedBranches) {
      set.add(b.district);
    }
    return Array.from(set).sort();
  }, [enrichedBranches]);

  return (
    <div className="org-page" data-testid="branch-analytics-page">
      {/* 1. Header with Title & Top Utility Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              SwiftDrop Head Office
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
              <Calendar size={12} aria-hidden="true" />
              <span>{activePeriodConfig.label}</span>
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            Branch Reports &amp; Operational Analytics
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl mt-1">
            Analyze regional delivery throughput, on-time completion rates, and dispatch speed
            across all registered hubs in Sri Lanka for any selected time window.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {lastUpdatedLabel && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-200 dark:border-slate-700">
              <Clock size={13} aria-hidden="true" />
              <span>Synced {lastUpdatedLabel}</span>
            </span>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="gap-1.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
          >
            <RefreshCw
              size={14}
              className={isRefetching ? 'animate-spin' : undefined}
              aria-hidden="true"
            />
            <span>{isRefetching ? 'Refreshing...' : 'Refresh'}</span>
          </Button>

          <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
            <Link href="/organization/branches">
              <Building2 size={14} aria-hidden="true" />
              <span>Branch Directory</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Interactive Time Period Selector Bar */}
      <div className="flex flex-col gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-blue-600" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Analytics Time Period:
            </span>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-md">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: '7d', label: 'Last 7 Days' },
                { id: '30d', label: 'Last 30 Days' },
                { id: 'quarter', label: 'This Quarter (Q1)' },
                { id: 'custom', label: 'Custom Range' },
              ] as const
            ).map((preset) => {
              const isSelected = timePeriod === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setTimePeriod(preset.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Date Range Picker Row (shown when 'custom' is selected) */}
        {timePeriod === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-3 mt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <label htmlFor="custom-date-start" className="text-xs font-semibold text-slate-600">
                From:
              </label>
              <Input
                id="custom-date-start"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-8 text-xs w-36 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="custom-date-end" className="text-xs font-semibold text-slate-600">
                To:
              </label>
              <Input
                id="custom-date-end"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-8 text-xs w-36 bg-white dark:bg-slate-900"
              />
            </div>

            <span className="text-xs text-slate-500 font-medium">
              Aggregated metrics will be computed across the selected window.
            </span>
          </div>
        )}
      </div>

      {/* 3. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Network Volume
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 mt-1">
                {networkStats.totalReceived.toLocaleString()}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                Deliveries assigned during {activePeriodConfig.shortLabel}
              </span>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Truck size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Completed Deliveries
              </span>
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {networkStats.totalCompleted.toLocaleString()}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                {networkStats.avgRate !== null ? `${networkStats.avgRate}% completion rate` : '—'}
              </span>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Avg Dispatch Turnaround
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 mt-1">
                {networkStats.avgDuration !== null ? `${networkStats.avgDuration} min` : '—'}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                Target SLA: &lt; 30 minutes
              </span>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Clock size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {timePeriod === 'today' ? 'Active In-Progress' : 'Undelivered / Exceptions'}
              </span>
              <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                {networkStats.totalPending.toLocaleString()}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                {timePeriod === 'today'
                  ? 'Actively en route by regional couriers'
                  : 'Pending dispatch or exceptions'}
              </span>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Activity size={20} />
            </div>
          </div>
        </Card>
      </div>

      {/* 4. Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Filter size={14} className="text-blue-600" aria-hidden="true" />
            <span>Filter Hubs:</span>
          </div>

          {/* District Dropdown */}
          <select
            aria-label="Filter analytics by administrative district"
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Districts ({enrichedBranches.length} Hubs)</option>
            {availableDistricts.map((dist) => (
              <option key={dist} value={dist}>
                {dist} District
              </option>
            ))}
          </select>

          {/* Status Dropdown */}
          <select
            aria-label="Filter analytics by branch operational status"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')
            }
            className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Operating Statuses</option>
            <option value="ACTIVE">Active Hubs Only</option>
            <option value="INACTIVE">Inactive / Suspended</option>
          </select>
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Sort By:</span>
          <select
            aria-label="Sort branches by metric"
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'volume' | 'rate' | 'duration')
            }
            className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="volume">Delivery Volume (High to Low)</option>
            <option value="rate">Completion Rate (%)</option>
            <option value="duration">Fastest Turnaround</option>
          </select>
        </div>
      </div>

      {/* 5. Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Throughput Bar Chart */}
        <Card className="lg:col-span-2 p-5 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-600" aria-hidden="true" />
                <span>Delivery Volume Comparison (Received vs. Completed)</span>
              </h2>
              <Badge variant="outline" className="text-xs font-mono">
                {activePeriodConfig.shortLabel}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Compares delivery load handled per branch for {activePeriodConfig.label.toLowerCase()}.
            </p>
          </div>

          <div className="h-72 w-full pt-2">
            {isMounted && volumeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={volumeChartData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
                  />
                  <Bar dataKey="received" name="Received" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Loading chart visualization...
              </div>
            )}
          </div>
        </Card>

        {/* Right Column (1 Col): District Volume Donut Chart */}
        <Card className="p-5 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <PieIcon size={18} className="text-purple-600" aria-hidden="true" />
                <span>Volume by District</span>
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Proportion of total network package intake per administrative district during this period.
            </p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {isMounted && districtDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={districtDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {districtDistributionData.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={DISTRICT_COLORS[index % DISTRICT_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                      fontSize: '12px',
                    }}
                    formatter={(val) => [`${val} deliveries`, 'Volume']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Loading district distribution...
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            {districtDistributionData.map((d, idx) => (
              <div key={d.name} className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: DISTRICT_COLORS[idx % DISTRICT_COLORS.length] }}
                />
                <span>{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 6. Timeline Progression & Turnaround Duration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline Progression Chart */}
        <Card className="p-5 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <LineChartIcon size={18} className="text-blue-600" aria-hidden="true" />
                <span>Delivery Progression Over Period</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Timeline intake and completion curve across {activePeriodConfig.shortLabel}.
              </p>
            </div>
          </div>

          <div className="h-64 w-full pt-3">
            {isMounted && timelineTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={timelineTrendData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '12px' }} />
                  <Area
                    type="monotone"
                    dataKey="volume"
                    name="Volume Intake"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorVol)"
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorComp)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Loading timeline progression...
              </div>
            )}
          </div>
        </Card>

        {/* Turnaround Duration Chart */}
        <Card className="p-5 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <Clock size={18} className="text-indigo-600" aria-hidden="true" />
                <span>Average Delivery Turnaround Time (Minutes)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Turnaround speed benchmarked against the 30-minute target SLA.
              </p>
            </div>
          </div>

          <div className="h-64 w-full pt-3">
            {isMounted && durationChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={durationChartData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    domain={[0, 45]}
                    unit="m"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                    formatter={(val) => [`${val} minutes`, 'Avg Turnaround']}
                  />
                  <Bar dataKey="duration" name="Avg Duration (min)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Loading turnaround chart...
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 7. Comprehensive Hub Analytics & Performance Table */}
      <div className="org-directory-card">
        <div className="org-directory-card__header">
          <div className="org-directory-card__title-group">
            <h2 className="org-directory-card__title">
              Regional Branch Operational Scorecard — {activePeriodConfig.label}
            </h2>
            <p className="org-directory-card__subtitle">
              Detailed performance metrics per hub including volume, on-time rate, and active workload.
            </p>
          </div>
        </div>

        <div className="org-table-wrapper">
          <table className="org-table" aria-label="Branch Performance Scorecard Table">
            <thead>
              <tr>
                <th scope="col">Branch Hub</th>
                <th scope="col">District</th>
                <th scope="col">Status</th>
                <th scope="col">Volume</th>
                <th scope="col">Completed</th>
                <th scope="col">Pending / Exceptions</th>
                <th scope="col">Completion Rate</th>
                <th scope="col">Avg Duration</th>
                <th scope="col" className="org-table__th--actions">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedBranches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-xs text-slate-500">
                    No branch data matches the selected district or status filters.
                  </td>
                </tr>
              ) : (
                sortedBranches.map((b) => {
                  const isActive = b.status === 'ACTIVE';
                  const rate = b.completionRate;

                  return (
                    <tr key={b.id}>
                      <td>
                        <div className="org-branch-name-cell">
                          <Link
                            href={`/organization/branches/${b.id}`}
                            className="org-branch-name org-branch-name--link"
                          >
                            {b.name}
                          </Link>
                          <span className="org-branch-coords">{b.code}</span>
                        </div>
                      </td>
                      <td>
                        <span className="org-branch-city">
                          <MapPin size={13} className="org-branch-city__icon" aria-hidden="true" />
                          <span>{b.district}</span>
                        </span>
                      </td>
                      <td>
                        <Badge
                          variant={isActive ? 'default' : 'secondary'}
                          className={
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-100 border-slate-200'
                          }
                        >
                          <span
                            className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                              isActive ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {b.status}
                        </Badge>
                      </td>
                      <td>
                        <strong>{b.received.toLocaleString()}</strong>
                      </td>
                      <td>
                        <span className="text-emerald-700 font-semibold">{b.completed.toLocaleString()}</span>
                      </td>
                      <td>
                        <span className={b.pending > 0 ? 'text-amber-600 font-semibold' : 'text-slate-400'}>
                          {b.pending.toLocaleString()}
                        </span>
                      </td>
                      <td>
                        {rate !== null ? (
                          <div className="org-perf-rate-cell">
                            <span className="org-perf-rate-cell__value">{rate}%</span>
                            <div className="org-perf-rate-cell__bar">
                              <div
                                className="org-perf-rate-cell__fill"
                                style={{ width: `${Math.min(100, rate)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Suspended</span>
                        )}
                      </td>
                      <td>
                        {b.avgDuration !== null ? (
                          <span className="org-coords-mono">{b.avgDuration} min</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="org-table__td--actions">
                        <div className="org-row-actions">
                          <Link
                            href={`/organization/branches/${b.id}`}
                            className="org-action-btn"
                          >
                            <Eye size={13} aria-hidden="true" />
                            <span>Inspect</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
