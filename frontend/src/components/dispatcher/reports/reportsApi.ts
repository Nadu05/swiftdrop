import {
  dispatchApi,
  type DeliveryJobDto,
  type PickupTaskDto,
} from '@/api/services/dispatch.api';
import { getBranches } from '@/api/services/organization.api';
import type { BranchResponse } from '@/types/organization.types';
import type {
  BranchPerformanceRecord,
  DeliveryStatusItem,
  DeliveryTrendPoint,
  ReportFilterState,
  ReportsDataBundle,
} from './types';

export async function getAvailableBranches(): Promise<
  { id: string; name: string; code: string }[]
> {
  const branches = await getBranches();
  return branches.map((b) => ({
    id: String(b.id),
    name: b.name,
    code: b.code,
  }));
}

function getDateWindow(filters: ReportFilterState): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (filters.dateRange) {
    case 'today':
      return { start, end };
    case 'last7days':
      start.setDate(start.getDate() - 6);
      return { start, end };
    case 'last30days':
      start.setDate(start.getDate() - 29);
      return { start, end };
    case 'custom': {
      const customStart = filters.startDate ? new Date(`${filters.startDate}T00:00:00`) : start;
      const customEnd = filters.endDate ? new Date(`${filters.endDate}T23:59:59.999`) : end;
      return {
        start: Number.isNaN(customStart.getTime()) ? start : customStart,
        end: Number.isNaN(customEnd.getTime()) ? end : customEnd,
      };
    }
    default:
      start.setDate(start.getDate() - 6);
      return { start, end };
  }
}

function isInWindow(iso: string | undefined, start: Date, end: Date): boolean {
  if (!iso) return true;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return true;
  return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
}

function isFailedJob(status: string): boolean {
  return (
    status === 'FAILED' ||
    status === 'PENDING_DISPATCHER_DECISION' ||
    status === 'RETURN_TO_SENDER' ||
    status === 'RETURNED_TO_SENDER'
  );
}

function matchesServiceType(job: DeliveryJobDto, serviceType: string): boolean {
  if (!serviceType || serviceType === 'ALL') return true;
  const priority = String(job.priority || 'NORMAL').toUpperCase();
  if (serviceType === 'EXPRESS') {
    return priority === 'URGENT' || priority === 'EXPRESS' || priority === 'HIGH';
  }
  if (serviceType === 'STANDARD') {
    return priority === 'NORMAL';
  }
  return true;
}

function matchesBranchFilter(job: DeliveryJobDto, branchId: string): boolean {
  if (!branchId || branchId === 'ALL') return true;
  return String(job.branchId ?? '') === branchId || String(job.branchCode ?? '') === branchId;
}

function buildDailyTrends(jobs: DeliveryJobDto[]): DeliveryTrendPoint[] {
  const points: DeliveryTrendPoint[] = [];
  const today = new Date();
  for (let offset = 6; offset >= 0; offset--) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    const dayStr = day.toDateString();
    const dayJobs = jobs.filter((j) => {
      const raw = j.completedAt || j.deliveredAt || j.createdAt;
      if (!raw) return false;
      const d = new Date(raw);
      return !Number.isNaN(d.getTime()) && d.toDateString() === dayStr;
    });
    const delivered = dayJobs.filter((j) => j.status === 'DELIVERED').length;
    const failed = dayJobs.filter((j) => isFailedJob(String(j.status))).length;
    points.push({
      period: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(day),
      dateLabel: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(day),
      delivered,
      failed,
      total: dayJobs.length,
    });
  }
  return points;
}

function buildWeeklyTrends(jobs: DeliveryJobDto[]): DeliveryTrendPoint[] {
  const points: DeliveryTrendPoint[] = [];
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  for (let weekIdx = 3; weekIdx >= 0; weekIdx--) {
    const end = new Date(today);
    end.setDate(today.getDate() - weekIdx * 7);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const weekJobs = jobs.filter((j) =>
      isInWindow(j.completedAt || j.deliveredAt || j.createdAt, start, end)
    );
    const delivered = weekJobs.filter((j) => j.status === 'DELIVERED').length;
    const failed = weekJobs.filter((j) => isFailedJob(String(j.status))).length;
    points.push({
      period: `W${4 - weekIdx}`,
      dateLabel: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      delivered,
      failed,
      total: weekJobs.length,
    });
  }
  return points;
}

function buildMonthlyTrends(jobs: DeliveryJobDto[]): DeliveryTrendPoint[] {
  const points: DeliveryTrendPoint[] = [];
  const today = new Date();

  for (let mOffset = 5; mOffset >= 0; mOffset--) {
    const ref = new Date(today.getFullYear(), today.getMonth() - mOffset, 1);
    const year = ref.getFullYear();
    const month = ref.getMonth();
    const monthJobs = jobs.filter((j) => {
      const raw = j.completedAt || j.deliveredAt || j.createdAt;
      if (!raw) return false;
      const d = new Date(raw);
      return !Number.isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month;
    });
    const delivered = monthJobs.filter((j) => j.status === 'DELIVERED').length;
    const failed = monthJobs.filter((j) => isFailedJob(String(j.status))).length;
    points.push({
      period: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(ref),
      dateLabel: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(ref),
      delivered,
      failed,
      total: monthJobs.length,
    });
  }
  return points;
}

export async function fetchReportsData(
  filters: ReportFilterState
): Promise<ReportsDataBundle> {
  const [jobs, pickupTasks, couriers, exceptions, branches] = await Promise.all([
    dispatchApi.getDeliveryJobs(),
    dispatchApi.getPickupTasks(),
    dispatchApi.getCouriers(),
    dispatchApi.getExceptions(),
    getBranches().catch(() => [] as BranchResponse[]),
  ]);

  const { start, end } = getDateWindow(filters);

  const filteredJobs = jobs.filter((j) => {
    const ts = j.createdAt || j.deliveredAt || j.completedAt;
    return (
      isInWindow(ts, start, end) &&
      matchesBranchFilter(j, filters.branchId) &&
      matchesServiceType(j, filters.serviceType)
    );
  });

  const totalDeliveries = filteredJobs.length;
  const deliveredCount = filteredJobs.filter((j) => j.status === 'DELIVERED').length;
  const inTransitCount = filteredJobs.filter((j) =>
    ['ASSIGNED', 'ACCEPTED', 'IN_TRANSIT'].includes(String(j.status))
  ).length;
  const awaitingCount = filteredJobs.filter((j) => j.status === 'UNASSIGNED').length;
  const cancelledCount = filteredJobs.filter((j) => j.status === 'CANCELLED').length;
  const failedCount = filteredJobs.filter((j) => isFailedJob(String(j.status))).length;

  const terminalCount = deliveredCount + failedCount;
  const completionRate =
    terminalCount > 0 ? Number(((deliveredCount / terminalCount) * 100).toFixed(1)) : 0;
  const onTimeRate =
    totalDeliveries > 0
      ? Number(
          (
            ((deliveredCount + inTransitCount) /
              Math.max(totalDeliveries - cancelledCount, 1)) *
            100
          ).toFixed(1)
        )
      : 0;

  const merchantNames = new Set<string>();
  filteredJobs.forEach((j) => {
    if (j.merchantName) merchantNames.add(j.merchantName);
  });
  pickupTasks.forEach((t: PickupTaskDto) => {
    if (t.merchantName) merchantNames.add(t.merchantName);
  });

  const safePct = (count: number) =>
    totalDeliveries > 0 ? Number(((count / totalDeliveries) * 100).toFixed(1)) : 0;

  const statusBreakdown: DeliveryStatusItem[] = [
    {
      status: 'Delivered',
      count: deliveredCount,
      percentage: safePct(deliveredCount),
      color: '#16a34a',
    },
    {
      status: 'In Transit',
      count: inTransitCount,
      percentage: safePct(inTransitCount),
      color: '#2563eb',
    },
    {
      status: 'Awaiting Courier',
      count: awaitingCount,
      percentage: safePct(awaitingCount),
      color: '#f59e0b',
    },
    {
      status: 'Failed',
      count: failedCount,
      percentage: safePct(failedCount),
      color: '#dc2626',
    },
    {
      status: 'Cancelled',
      count: cancelledCount,
      percentage: safePct(cancelledCount),
      color: '#64748b',
    },
  ];

  const branchPerfMap = new Map<string, BranchPerformanceRecord & { idNum?: number }>();
  branches.forEach((b) => {
    branchPerfMap.set(String(b.id), {
      id: String(b.id),
      idNum: b.id,
      branchName: b.name,
      branchCode: b.code,
      city: b.city || '—',
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      onTimeRate: 0,
      successRate: 0,
    });
  });

  filteredJobs.forEach((job) => {
    const key = String(job.branchId ?? job.branchCode ?? 'UNASSIGNED');
    const existing = branchPerfMap.get(key) ?? {
      id: key,
      branchName: job.branchName || (key === 'UNASSIGNED' ? 'Unassigned Branch' : `Branch ${key}`),
      branchCode: job.branchCode || key,
      city: job.dropoffCity || '—',
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      onTimeRate: 0,
      successRate: 0,
    };
    existing.totalDeliveries += 1;
    if (job.status === 'DELIVERED') existing.successfulDeliveries += 1;
    if (isFailedJob(String(job.status))) existing.failedDeliveries += 1;
    branchPerfMap.set(key, existing);
  });

  const branchPerformance: BranchPerformanceRecord[] = Array.from(branchPerfMap.values())
    .filter((b) => filters.branchId === 'ALL' || String(b.id) === filters.branchId || b.branchCode === filters.branchId)
    .map((b) => {
      const done = b.successfulDeliveries + b.failedDeliveries;
      const rate = done > 0 ? Number(((b.successfulDeliveries / done) * 100).toFixed(1)) : 0;
      return {
        ...b,
        successRate: rate,
        onTimeRate: rate,
      };
    })
    .sort((a, b) => b.totalDeliveries - a.totalDeliveries);

  const activeCouriersCount = couriers.filter((c) => c.status !== 'OFFLINE').length;
  const pendingExceptionsCount = exceptions.filter((e) => e.status === 'PENDING_DECISION').length;

  return {
    metrics: {
      totalDeliveries,
      totalDeliveriesTrend: {
        value: `${pickupTasks.length} pickups`,
        isPositive: true,
        label: `${awaitingCount} awaiting courier · ${inTransitCount} active`,
      },
      onTimeRate,
      onTimeRateTrend: {
        value: `${deliveredCount} done`,
        isPositive: onTimeRate >= 70 || totalDeliveries === 0,
        label: 'Live delivery fulfillment progress',
      },
      activeMerchants: merchantNames.size,
      activeMerchantsTrend: {
        value: `${activeCouriersCount} couriers online`,
        isPositive: activeCouriersCount > 0,
        label: `${couriers.length} total registered couriers`,
      },
      courierCompletionRate: completionRate,
      courierCompletionRateTrend: {
        value: `${pendingExceptionsCount} exceptions`,
        isPositive: pendingExceptionsCount === 0,
        label: `${failedCount} failed · ${deliveredCount} completed`,
      },
    },
    statusBreakdown,
    branchPerformance,
    trends: {
      daily: buildDailyTrends(filteredJobs),
      weekly: buildWeeklyTrends(filteredJobs),
      monthly: buildMonthlyTrends(filteredJobs),
    },
    generatedAt: new Date().toISOString(),
  };
}

export function generateReportsCSV(
  data: ReportsDataBundle,
  filters: ReportFilterState,
  branchLabel: string
): string {
  const dateRangeLabel =
    filters.dateRange === 'custom' && filters.startDate && filters.endDate
      ? `${filters.startDate} to ${filters.endDate}`
      : filters.dateRange;

  const rows: string[][] = [
    ['SwiftDrop Operational Analytics Report'],
    ['Generated At', new Date(data.generatedAt).toLocaleString()],
    ['Branch Filter', branchLabel],
    ['Date Range', dateRangeLabel],
    ['Service Type', filters.serviceType],
    [],
    ['KPI Metrics', 'Value', 'Details'],
    ['Total Deliveries', String(data.metrics.totalDeliveries), data.metrics.totalDeliveriesTrend.label],
    ['Fulfillment Rate (%)', `${data.metrics.onTimeRate}%`, data.metrics.onTimeRateTrend.label],
    ['Active Senders / Merchants', String(data.metrics.activeMerchants), data.metrics.activeMerchantsTrend.label],
    ['Completion Rate (%)', `${data.metrics.courierCompletionRate}%`, data.metrics.courierCompletionRateTrend.label],
    [],
    ['Status Breakdown', 'Count', 'Percentage'],
    ...data.statusBreakdown.map((item) => [
      item.status,
      String(item.count),
      `${item.percentage}%`,
    ]),
    [],
    ['Branch Name', 'Branch Code', 'City', 'Total Deliveries', 'Successful', 'Failed', 'Success Rate (%)'],
    ...data.branchPerformance.map((b) => [
      b.branchName,
      b.branchCode,
      b.city,
      String(b.totalDeliveries),
      String(b.successfulDeliveries),
      String(b.failedDeliveries),
      `${b.successRate}%`,
    ]),
  ];

  return rows
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}
