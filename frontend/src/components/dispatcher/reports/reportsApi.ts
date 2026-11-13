import { getBranches } from '@/api/services/organization.api';
import type { BranchResponse } from '@/types/organization.types';
import type {
  ReportFilterState,
  ReportsDataBundle,
  ReportSummaryMetrics,
  DeliveryStatusItem,
  BranchPerformanceRecord,
  DeliveryTrendPoint,
} from './types';

/**
 * Fallback branches used when organization-service is offline or empty.
 * Matches standard Sri Lanka hubs used across SwiftDrop.
 */
export const FALLBACK_BRANCHES: { id: number; code: string; name: string; city: string }[] = [
  { id: 1, code: 'CMB-01', name: 'Colombo Central Hub', city: 'Colombo' },
  { id: 2, code: 'KND-01', name: 'Kandy Regional Hub', city: 'Kandy' },
  { id: 3, code: 'GAL-01', name: 'Galle Southern Hub', city: 'Galle' },
  { id: 4, code: 'KRN-01', name: 'Kurunegala Hub', city: 'Kurunegala' },
  { id: 5, code: 'NEG-01', name: 'Negombo Coastal Hub', city: 'Negombo' },
  { id: 6, code: 'JAF-01', name: 'Jaffna Northern Hub', city: 'Jaffna' },
];

/**
 * Fetch available branches for filter dropdowns.
 * Integrates with Member 04's Organization Service (`getBranches()`),
 * falling back gracefully to standard hubs if unreachable.
 */
export async function getAvailableBranches(): Promise<{ id: string; name: string; code: string }[]> {
  try {
    const backendBranches = await getBranches('ACTIVE');
    if (backendBranches && backendBranches.length > 0) {
      return backendBranches.map((b: BranchResponse) => ({
        id: String(b.id),
        name: b.name,
        code: b.code,
      }));
    }
  } catch (err) {
    // Backend service not reachable or offline in local dev; use fallback
    console.warn('Organization service unavailable, using fallback branch options for reports:', err);
  }

  return FALLBACK_BRANCHES.map((b) => ({
    id: String(b.id),
    name: b.name,
    code: b.code,
  }));
}

/**
 * Multiplier factors based on selected filters to simulate realistic variations
 */
function getFilterMultiplier(filters: ReportFilterState): number {
  let multiplier = 1.0;

  // Date range multiplier
  if (filters.dateRange === 'today') {
    multiplier *= 0.14; // roughly 1/7th of a week
  } else if (filters.dateRange === 'last7days') {
    multiplier *= 1.0;
  } else if (filters.dateRange === 'last30days') {
    multiplier *= 4.2;
  } else if (filters.dateRange === 'custom') {
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate).getTime();
      const end = new Date(filters.endDate).getTime();
      const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
      multiplier *= Math.max(0.1, days / 7);
    } else {
      multiplier *= 1.0;
    }
  }

  // Branch filter multiplier (if viewing a single branch, slice the volume)
  if (filters.branchId !== 'ALL') {
    multiplier *= 0.35;
  }

  // Service type multiplier
  if (filters.serviceType === 'EXPRESS') {
    multiplier *= 0.38;
  } else if (filters.serviceType === 'SAME_DAY') {
    multiplier *= 0.22;
  } else if (filters.serviceType === 'STANDARD') {
    multiplier *= 0.60;
  }

  return multiplier;
}

/**
 * Generate report data bundle responding to selected filter criteria.
 * Designed as a clean service abstraction ready to be replaced with
 * Spring Boot analytics endpoints when backend contracts are delivered.
 */
export async function fetchReportsData(filters: ReportFilterState): Promise<ReportsDataBundle> {
  // Simulate network latency (250ms)
  await new Promise((res) => setTimeout(res, 250));

  const branches = await getAvailableBranches();
  const mult = getFilterMultiplier(filters);

  // Baseline 7-day all-network total is ~1,850 deliveries
  const baseDeliveries = 1850;
  const totalDeliveries = Math.max(25, Math.round(baseDeliveries * mult));

  // Determine realistic status breakdown
  const deliveredCount = Math.round(totalDeliveries * 0.884);
  const inTransitCount = Math.round(totalDeliveries * 0.058);
  const awaitingCourierCount = Math.round(totalDeliveries * 0.026);
  const cancelledCount = Math.round(totalDeliveries * 0.012);
  const failedCount = Math.max(1, totalDeliveries - (deliveredCount + inTransitCount + awaitingCourierCount + cancelledCount));

  const statusBreakdown: DeliveryStatusItem[] = [
    {
      status: 'Delivered',
      count: deliveredCount,
      percentage: Number(((deliveredCount / totalDeliveries) * 100).toFixed(1)),
      color: '#14b8a6', // Teal
    },
    {
      status: 'In Transit',
      count: inTransitCount,
      percentage: Number(((inTransitCount / totalDeliveries) * 100).toFixed(1)),
      color: '#2563eb', // Blue
    },
    {
      status: 'Awaiting Courier',
      count: awaitingCourierCount,
      percentage: Number(((awaitingCourierCount / totalDeliveries) * 100).toFixed(1)),
      color: '#f59e0b', // Amber
    },
    {
      status: 'Cancelled',
      count: cancelledCount,
      percentage: Number(((cancelledCount / totalDeliveries) * 100).toFixed(1)),
      color: '#94a3b8', // Gray/Slate
    },
    {
      status: 'Failed',
      count: failedCount,
      percentage: Number(((failedCount / totalDeliveries) * 100).toFixed(1)),
      color: '#ef4444', // Red
    },
  ];

  // Summary Metrics
  const onTimeRate = Number((94.6 + (mult > 1 ? 0.8 : -0.4)).toFixed(1));
  const activeMerchants = Math.max(12, Math.round(148 * Math.min(1.2, Math.max(0.4, mult * 0.8))));
  const courierCompletionRate = Number((98.2 - (filters.serviceType === 'SAME_DAY' ? 1.1 : 0)).toFixed(1));

  const metrics: ReportSummaryMetrics = {
    totalDeliveries,
    totalDeliveriesTrend: {
      value: mult >= 1 ? '+12.4%' : '-3.1%',
      isPositive: mult >= 1,
      label: 'vs previous period',
    },
    onTimeRate,
    onTimeRateTrend: {
      value: '+1.8%',
      isPositive: true,
      label: 'vs previous period',
    },
    activeMerchants,
    activeMerchantsTrend: {
      value: '+6 new',
      isPositive: true,
      label: 'registered merchants',
    },
    courierCompletionRate,
    courierCompletionRateTrend: {
      value: '+0.5%',
      isPositive: true,
      label: 'fleet reliability',
    },
  };

  // Branch Performance
  const relevantBranches = filters.branchId === 'ALL'
    ? branches
    : branches.filter((b) => b.id === filters.branchId);

  const branchDistribution = [0.38, 0.24, 0.16, 0.11, 0.06, 0.05];

  const branchPerformance: BranchPerformanceRecord[] = relevantBranches.map((branch, idx) => {
    const share = relevantBranches.length === 1 ? 1.0 : (branchDistribution[idx] ?? 0.08);
    const bTotal = Math.max(10, Math.round(totalDeliveries * share));
    const bFail = Math.max(0, Math.round(bTotal * (0.015 + (idx * 0.005))));
    const bSuccess = bTotal - bFail;
    const bOnTime = Number((97.5 - idx * 1.2).toFixed(1));
    const bSuccessRate = Number(((bSuccess / bTotal) * 100).toFixed(1));

    return {
      id: branch.id,
      branchName: branch.name,
      branchCode: branch.code,
      city: branch.name.includes(' ') ? branch.name.split(' ')[0] : 'Sri Lanka',
      totalDeliveries: bTotal,
      successfulDeliveries: bSuccess,
      onTimeRate: bOnTime,
      failedDeliveries: bFail,
      successRate: bSuccessRate,
    };
  });

  // Trends: Daily (last 7 days), Weekly (last 4 weeks), Monthly (last 6 months)
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dailyTrends: DeliveryTrendPoint[] = daysOfWeek.map((day, i) => {
    const dayMult = [0.85, 0.95, 1.2, 1.15, 1.35, 1.05, 0.7][i];
    const dTotal = Math.round((totalDeliveries / 7) * dayMult);
    const dDelivered = Math.round(dTotal * 0.94);
    const dFailed = Math.max(1, dTotal - dDelivered);
    return {
      period: day,
      dateLabel: `Day ${i + 1}`,
      delivered: dDelivered,
      failed: dFailed,
      total: dTotal,
    };
  });

  const weeklyTrends: DeliveryTrendPoint[] = [1, 2, 3, 4].map((wk) => {
    const wTotal = Math.round(totalDeliveries * (0.22 + wk * 0.02));
    const wDelivered = Math.round(wTotal * 0.95);
    const wFailed = Math.max(2, wTotal - wDelivered);
    return {
      period: `Week ${wk}`,
      dateLabel: `Week ${wk} of month`,
      delivered: wDelivered,
      failed: wFailed,
      total: wTotal,
    };
  });

  const monthlyTrends: DeliveryTrendPoint[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, i) => {
    const mTotal = Math.round(totalDeliveries * (0.8 + i * 0.08));
    const mDelivered = Math.round(mTotal * 0.96);
    const mFailed = Math.max(3, mTotal - mDelivered);
    return {
      period: month,
      dateLabel: `${month} 2026`,
      delivered: mDelivered,
      failed: mFailed,
      total: mTotal,
    };
  });

  return {
    metrics,
    statusBreakdown,
    branchPerformance,
    trends: {
      daily: dailyTrends,
      weekly: weeklyTrends,
      monthly: monthlyTrends,
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate CSV text from current reports dataset
 */
export function generateReportsCSV(
  bundle: ReportsDataBundle,
  filters: ReportFilterState,
  branchLabel: string
): string {
  const lines: string[] = [];

  // Header info
  lines.push('SwiftDrop Logistics - Operations Performance Report');
  lines.push(`Generated At,${new Date().toLocaleString()}`);
  lines.push(`Date Range Preset,${filters.dateRange}`);
  if (filters.startDate && filters.endDate) {
    lines.push(`Custom Date Range,${filters.startDate} to ${filters.endDate}`);
  }
  lines.push(`Branch,${branchLabel}`);
  lines.push(`Service Type,${filters.serviceType}`);
  lines.push('');

  // Summary Metrics Section
  lines.push('--- SUMMARY KEY PERFORMANCE INDICATORS ---');
  lines.push('Metric,Value,Trend,Period Context');
  lines.push(`Total Deliveries,${bundle.metrics.totalDeliveries},${bundle.metrics.totalDeliveriesTrend.value},${bundle.metrics.totalDeliveriesTrend.label}`);
  lines.push(`On-Time Delivery Rate,${bundle.metrics.onTimeRate}%,${bundle.metrics.onTimeRateTrend.value},${bundle.metrics.onTimeRateTrend.label}`);
  lines.push(`Active Merchants,${bundle.metrics.activeMerchants},${bundle.metrics.activeMerchantsTrend.value},${bundle.metrics.activeMerchantsTrend.label}`);
  lines.push(`Courier Completion Rate,${bundle.metrics.courierCompletionRate}%,${bundle.metrics.courierCompletionRateTrend.value},${bundle.metrics.courierCompletionRateTrend.label}`);
  lines.push('');

  // Status Breakdown Section
  lines.push('--- DELIVERY STATUS BREAKDOWN ---');
  lines.push('Status,Count,Percentage of Total');
  bundle.statusBreakdown.forEach((s) => {
    lines.push(`${s.status},${s.count},${s.percentage}%`);
  });
  lines.push('');

  // Branch Performance Section
  lines.push('--- BRANCH PERFORMANCE BREAKDOWN ---');
  lines.push('Branch Code,Branch Name,City,Total Deliveries,Successful,Failed,Success Rate,On-Time Rate');
  bundle.branchPerformance.forEach((b) => {
    lines.push(
      `"${b.branchCode}","${b.branchName}","${b.city}",${b.totalDeliveries},${b.successfulDeliveries},${b.failedDeliveries},${b.successRate}%,${b.onTimeRate}%`
    );
  });
  lines.push('');

  return lines.join('\n');
}

