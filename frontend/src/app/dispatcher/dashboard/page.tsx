'use client';

import { useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bike,
  CheckCircle2,
  Package,
  RefreshCw,
  Truck,
} from 'lucide-react';
import OverviewHeader from '@/components/dispatcher/overview/OverviewHeader';
import StatsCard from '@/components/dispatcher/overview/StatsCard';
import DeliveryActivityChart from '@/components/dispatcher/overview/DeliveryActivityChart';
import DeliveryStatusChart from '@/components/dispatcher/overview/DeliveryStatusChart';
import CourierWorkload from '@/components/dispatcher/overview/CourierWorkload';
import DispatchActionBar from '@/components/dispatcher/overview/DispatchActionBar';
import type {
  CourierWorkloadItem,
  DailyActivityData,
  DeliveryStatusData,
  StatItem,
} from '@/components/dispatcher/overview/types';
import {
  useAssignments,
  useDeliveryExceptions,
  useDeliveryJobs,
  useDispatchCouriers,
  usePickupTasks,
} from '@/hooks/api/use-dispatch';
import { getApiErrorMessage } from '@/api/services/auth.api';

function toLocalIsoDate(input: Date): string {
  const year = input.getFullYear();
  const month = String(input.getMonth() + 1).padStart(2, '0');
  const day = String(input.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function DispatcherDashboardPage() {
  const pickupTasksQuery = usePickupTasks(undefined, { refetchInterval: 15_000 });
  const deliveryJobsQuery = useDeliveryJobs(undefined, { refetchInterval: 15_000 });
  const couriersQuery = useDispatchCouriers(undefined, { refetchInterval: 15_000 });
  const exceptionsQuery = useDeliveryExceptions(undefined, { refetchInterval: 15_000 });
  const assignmentsQuery = useAssignments(undefined, { refetchInterval: 15_000 });

  const isLoading =
    pickupTasksQuery.isLoading ||
    deliveryJobsQuery.isLoading ||
    couriersQuery.isLoading ||
    exceptionsQuery.isLoading;

  const isRefreshing =
    pickupTasksQuery.isFetching ||
    deliveryJobsQuery.isFetching ||
    couriersQuery.isFetching ||
    exceptionsQuery.isFetching ||
    assignmentsQuery.isFetching;

  const queryError =
    pickupTasksQuery.error ||
    deliveryJobsQuery.error ||
    couriersQuery.error ||
    exceptionsQuery.error ||
    assignmentsQuery.error;

  const handleRefresh = async () => {
    await Promise.all([
      pickupTasksQuery.refetch(),
      deliveryJobsQuery.refetch(),
      couriersQuery.refetch(),
      exceptionsQuery.refetch(),
      assignmentsQuery.refetch(),
    ]);
  };

  const pickupTasks = pickupTasksQuery.data ?? [];
  const deliveryJobs = deliveryJobsQuery.data ?? [];
  const couriers = couriersQuery.data ?? [];
  const exceptions = exceptionsQuery.data ?? [];
  const assignments = assignmentsQuery.data ?? [];

  const metrics = useMemo(() => {
    const todayKey = toLocalIsoDate(new Date());

    const unassignedJobs = deliveryJobs.filter((job) => job.status === 'UNASSIGNED');
    const pendingCourierPickups = pickupTasks.filter(
      (task) => task.pickupMethod === 'COURIER_PICKUP' && task.status === 'PENDING_ASSIGNMENT'
    );
    const branchDropoffsPending = pickupTasks.filter(
      (task) => task.pickupMethod === 'BRANCH_DROP_OFF' && task.status === 'PENDING_ASSIGNMENT'
    );

    const activeJobs = deliveryJobs.filter((job) =>
      ['ASSIGNED', 'ACCEPTED', 'IN_TRANSIT'].includes(String(job.status))
    );
    const activeAssignmentsCount = assignments.filter((a) =>
      ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'IN_TRANSIT', 'PICKED_UP'].includes(String(a.status))
    ).length;

    const deliveredJobs = deliveryJobs.filter((job) => job.status === 'DELIVERED');
    const deliveredToday = deliveredJobs.filter((job) => {
      const ts = job.deliveredAt || job.completedAt || job.updatedAt || job.createdAt;
      if (!ts) return false;
      const parsed = new Date(ts);
      return !Number.isNaN(parsed.getTime()) && toLocalIsoDate(parsed) === todayKey;
    });

    const openExceptions = exceptions.filter(
      (ex) =>
        ['PENDING_DECISION', 'OPEN'].includes(String(ex.status || '').toUpperCase()) ||
        !ex.decisionAction
    );
    const failedOrEscalatedJobs = deliveryJobs.filter((job) =>
      ['FAILED', 'PENDING_DISPATCHER_DECISION'].includes(String(job.status))
    );

    const availableCouriers = couriers.filter((c) => c.status === 'AVAILABLE').length;
    const busyCouriers = couriers.filter((c) => c.status === 'BUSY').length;

    const statItems: StatItem[] = [
      {
        id: 'pending-queue',
        title: 'Pending Dispatch Queue',
        value: unassignedJobs.length + pendingCourierPickups.length,
        description: `${unassignedJobs.length} deliveries · ${pendingCourierPickups.length} courier pickups · ${branchDropoffsPending.length} branch drop-offs`,
        icon: Package,
        iconColor: '#d97706',
        iconBg: '#fffbeb',
      },
      {
        id: 'active-operations',
        title: 'Active Deliveries',
        value: Math.max(activeJobs.length, activeAssignmentsCount),
        description: `${availableCouriers} couriers available · ${busyCouriers} busy on route`,
        icon: Truck,
        iconColor: '#2563eb',
        iconBg: '#eff6ff',
      },
      {
        id: 'completed-deliveries',
        title: 'Delivered Parcels',
        value: deliveredJobs.length,
        description: `${deliveredToday.length} completed today across active branches`,
        icon: CheckCircle2,
        iconColor: '#16a34a',
        iconBg: '#f0fdf4',
      },
      {
        id: 'failed-escalations',
        title: 'Escalated Exceptions',
        value: openExceptions.length,
        description: `${failedOrEscalatedJobs.length} failed/pending decision jobs · ${couriers.length} total couriers`,
        icon: openExceptions.length > 0 ? AlertTriangle : Bike,
        iconColor: openExceptions.length > 0 ? '#dc2626' : '#0284c7',
        iconBg: openExceptions.length > 0 ? '#fef2f2' : '#f0f9ff',
      },
    ];

    return {
      statItems,
      unassignedCount: unassignedJobs.length,
      pendingPickupsCount: pendingCourierPickups.length + branchDropoffsPending.length,
      openExceptionsCount: openExceptions.length,
    };
  }, [assignments, couriers, deliveryJobs, exceptions, pickupTasks]);

  const activityData = useMemo<DailyActivityData[]>(() => {
    const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
    const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
    const countsByIsoDay = new Map<string, number>();

    for (const job of deliveryJobs) {
      const ts = job.deliveredAt || job.completedAt || job.createdAt || job.updatedAt;
      if (!ts) continue;
      const parsed = new Date(ts);
      if (Number.isNaN(parsed.getTime())) continue;
      const key = toLocalIsoDate(parsed);
      countsByIsoDay.set(key, (countsByIsoDay.get(key) ?? 0) + 1);
    }

    const days: DailyActivityData[] = [];
    const today = new Date();
    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date(today);
      date.setDate(today.getDate() - offset);
      const isoKey = toLocalIsoDate(date);
      days.push({
        day: dayFormatter.format(date),
        date: dateFormatter.format(date),
        deliveries: countsByIsoDay.get(isoKey) ?? 0,
      });
    }
    return days;
  }, [deliveryJobs]);

  const statusData = useMemo<DeliveryStatusData[]>(() => {
    const delivered = deliveryJobs.filter((j) => j.status === 'DELIVERED').length;
    const active = deliveryJobs.filter((j) =>
      ['ASSIGNED', 'ACCEPTED', 'IN_TRANSIT'].includes(String(j.status))
    ).length;
    const unassigned = deliveryJobs.filter((j) => j.status === 'UNASSIGNED').length;
    const issues = deliveryJobs.filter((j) =>
      ['FAILED', 'PENDING_DISPATCHER_DECISION', 'RETURN_TO_SENDER', 'RETURNED_TO_SENDER'].includes(
        String(j.status)
      )
    ).length;

    return [
      { name: 'Delivered', value: delivered, color: '#22c55e' },
      { name: 'In Transit & Assigned', value: active, color: '#3b82f6' },
      { name: 'Unassigned Queue', value: unassigned, color: '#f59e0b' },
      { name: 'Failed / Returned', value: issues, color: '#ef4444' },
    ];
  }, [deliveryJobs]);

  const workloadCouriers = useMemo<CourierWorkloadItem[]>(() => {
    return couriers.map((courier) => ({
      id: String(courier.id),
      courierCode: courier.courierCode || String(courier.id),
      name: courier.name,
      phone: courier.phone || '—',
      status: courier.status,
      activeDeliveries: courier.activeDeliveries ?? 0,
      completedToday: courier.completedToday ?? 0,
      maxCapacity: courier.maxCapacity ?? 10,
      vehicleType: courier.vehicleType || 'Motorcycle',
      zone: courier.zone || courier.branchName || courier.branchCode || 'Assigned Branch',
    }));
  }, [couriers]);

  return (
    <div className="dispatcher-overview">
      {/* 1. Header with Title & Date / Refresh Action */}
      <OverviewHeader onRefresh={handleRefresh} isRefreshing={isRefreshing} />

      {queryError && (
        <div
          className="dispatcher-reports-alert dispatcher-reports-alert--error"
          role="alert"
        >
          <AlertCircle size={18} />
          <div>
            <strong>Unable to load live dispatch metrics:</strong>{' '}
            {getApiErrorMessage(queryError) || 'Please retry or verify Dispatch Service availability.'}
          </div>
          <button
            type="button"
            className="dispatcher-overview__refresh-btn"
            style={{ marginLeft: 'auto', padding: '0.25rem 0.6rem' }}
            onClick={handleRefresh}
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Attention Bar for Unassigned Deliveries / Pickups / Escalations */}
      {!isLoading && (
        <DispatchActionBar
          unassignedCount={metrics.unassignedCount}
          pendingPickupsCount={metrics.pendingPickupsCount}
          pendingExceptionsCount={metrics.openExceptionsCount}
        />
      )}

      {/* 2. Key Performance Statistics (4 KPI Cards) */}
      <section className="dispatcher-stats-grid" aria-label="Key delivery metrics">
        {metrics.statItems.map((stat) => (
          <StatsCard
            key={stat.id}
            title={stat.title}
            value={isLoading ? '...' : stat.value}
            description={stat.description}
            icon={stat.icon}
            iconColor={stat.iconColor}
            iconBg={stat.iconBg}
          />
        ))}
      </section>

      {/* 3. Delivery Activity (Bar) & Status Breakdown (Donut) Charts */}
      <section className="dispatcher-charts-grid" aria-label="Delivery activity and status charts">
        <DeliveryActivityChart data={activityData} />
        <DeliveryStatusChart data={statusData} />
      </section>

      {/* 4. Courier Workload Monitoring */}
      <CourierWorkload couriers={workloadCouriers} />
    </div>
  );
}
