/**
 * Types and Data Contracts for Dispatcher Reports & Analytics
 * Aligned with Task 10 specifications
 */

export type DateRangePreset = 'today' | 'last7days' | 'last30days' | 'custom';

export type ServiceTypeFilter = 'ALL' | 'STANDARD' | 'EXPRESS' | 'SAME_DAY';

export interface ReportFilterState {
  dateRange: DateRangePreset;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  branchId: string;   // 'ALL' or branch code/id
  serviceType: ServiceTypeFilter;
}

export interface MetricTrend {
  value: string;
  isPositive: boolean;
  label: string;
}

export interface ReportSummaryMetrics {
  totalDeliveries: number;
  totalDeliveriesTrend: MetricTrend;
  onTimeRate: number; // percentage (e.g. 94.8)
  onTimeRateTrend: MetricTrend;
  activeMerchants: number;
  activeMerchantsTrend: MetricTrend;
  courierCompletionRate: number; // percentage (e.g. 98.2)
  courierCompletionRateTrend: MetricTrend;
}

export interface DeliveryStatusItem {
  status: 'Delivered' | 'In Transit' | 'Awaiting Courier' | 'Cancelled' | 'Failed';
  count: number;
  percentage: number;
  color: string;
}

export interface BranchPerformanceRecord {
  id: string | number;
  branchName: string;
  branchCode: string;
  city: string;
  totalDeliveries: number;
  successfulDeliveries: number;
  onTimeRate: number; // percentage (e.g. 96.2)
  failedDeliveries: number;
  successRate: number; // calculated percentage
}

export type TrendInterval = 'daily' | 'weekly' | 'monthly';

export interface DeliveryTrendPoint {
  period: string; // e.g. "Mon", "Day 1", "Week 1", "Jan"
  dateLabel: string;
  delivered: number;
  failed: number;
  total: number;
}

export interface ReportsDataBundle {
  metrics: ReportSummaryMetrics;
  statusBreakdown: DeliveryStatusItem[];
  branchPerformance: BranchPerformanceRecord[];
  trends: {
    daily: DeliveryTrendPoint[];
    weekly: DeliveryTrendPoint[];
    monthly: DeliveryTrendPoint[];
  };
  generatedAt: string;
}

