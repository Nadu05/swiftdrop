'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  PackageCheck,
  RefreshCw,
  Truck,
  Warehouse,
} from 'lucide-react';
import DeliverySummaryCards from '@/components/dispatcher/deliveries/DeliverySummaryCards';
import UnassignedDeliveryTable from '@/components/dispatcher/deliveries/UnassignedDeliveryTable';
import DeliveryDetailsModal from '@/components/dispatcher/deliveries/DeliveryDetailsModal';
import AssignCourierDialog from '@/components/dispatcher/deliveries/AssignCourierDialog';
import BranchDropoffDialog from '@/components/dispatcher/deliveries/BranchDropoffDialog';
import OrderDispatchActionModal from '@/components/organization/branch-admin/OrderDispatchActionModal';
import {
  resolveEffectiveDispatcherBranchId,
  shouldIncludeOrderInLastMileDeliveryQueue,
  shouldIncludeOrderInOriginPickupQueue,
} from '@/components/organization/branch-admin/parcel-dispatch-workflow';
import { getCustomerOrders } from '@/api/services/orders.api';
import type { PickupTaskDto } from '@/api/services/dispatch.api';
import { useAuthStore } from '@/store/auth.store';
import {
  mapDeliveryJobToUnassigned,
  mapPickupTaskToQueueItem,
} from '@/components/dispatcher/deliveries/deliveriesApi';
import { isSameLocalDay } from '@/components/dispatcher/dateUtils';
import type {
  CourierAvailability,
  DeliverySummaryMetrics,
  UnassignedDelivery,
} from '@/components/dispatcher/deliveries/types';
import {
  dispatchQueryKeys,
  useAssignments,
  useDispatchBranches,
  useDispatchCouriers,
  usePickupTasks,
  useUnassignedDeliveries,
} from '@/hooks/api/use-dispatch';

type QueueTab = 'deliveries' | 'pickups';

export default function UnassignedDeliveriesPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<QueueTab>('deliveries');
  const [hasAutoSelectedTab, setHasAutoSelectedTab] = useState(false);

  // Queries with controlled 15s polling
  const unassignedQuery = useUnassignedDeliveries(undefined, { refetchInterval: 15_000 });
  const pickupTasksQuery = usePickupTasks(undefined, { refetchInterval: 15_000 });
  const couriersQuery = useDispatchCouriers(undefined, { refetchInterval: 15_000 });
  const assignmentsQuery = useAssignments(undefined, { refetchInterval: 15_000 });
  const branchesQuery = useDispatchBranches();
  const branchOrdersQuery = useQuery({
    queryKey: ['dispatcher', 'branch-orders'],
    queryFn: () => getCustomerOrders(),
    refetchInterval: 15_000,
  });

  const effectiveBranchId = useMemo(
    () =>
      resolveEffectiveDispatcherBranchId({
        userBranchId: user?.branchId,
        couriers: couriersQuery.data,
        pickupTasks: pickupTasksQuery.data,
        deliveryJobs: unassignedQuery.data,
      }),
    [user?.branchId, couriersQuery.data, pickupTasksQuery.data, unassignedQuery.data]
  );

  // Selected items for modals
  const [selectedDetailsDelivery, setSelectedDetailsDelivery] =
    useState<UnassignedDelivery | null>(null);
  const [selectedAssignDelivery, setSelectedAssignDelivery] =
    useState<UnassignedDelivery | null>(null);
  const [selectedActionModalOrderId, setSelectedActionModalOrderId] =
    useState<string | number | null>(null);
  const [branchDropoffOpen, setBranchDropoffOpen] = useState(false);
  const [branchDropoffTracking, setBranchDropoffTracking] = useState('');
  const [branchDropoffBranchId, setBranchDropoffBranchId] = useState<number | undefined>();

  // Toast feedback after actions
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 5500);
  };

  const unassignedDeliveries = useMemo(() => {
    const base = (unassignedQuery.data || [])
      .filter(
        (job) =>
          !effectiveBranchId ||
          !job.branchId ||
          Number(job.branchId) === Number(effectiveBranchId)
      )
      .map(mapDeliveryJobToUnassigned);
    const seenTrackings = new Set(base.map((d) => d.trackingNumber));
    const seenOrderIds = new Set(base.map((d) => String(d.orderId)));

    for (const order of branchOrdersQuery.data || []) {
      if (
        shouldIncludeOrderInLastMileDeliveryQueue(order, effectiveBranchId) &&
        !seenTrackings.has(order.trackingNumber) &&
        !seenOrderIds.has(String(order.id))
      ) {
        base.push({
          orderId: String(order.id),
          trackingNumber: order.trackingNumber,
          taskType: 'DELIVERY',
          branchId: order.destinationBranchId || order.originBranchId,
          branchName: order.destinationBranchName || order.originBranchName,
          pickupAddress: order.pickupAddress,
          recipientName: order.dropoffContactName || 'Recipient',
          recipientPhone: order.dropoffContactPhone || '—',
          deliveryAddress: order.dropoffAddress || '—',
          city: order.dropoffCity || '—',
          merchantName: order.pickupContactName || 'Sender',
          merchantContact: order.pickupContactPhone,
          orderDate: order.createdAt || new Date().toISOString(),
          priority: 'NORMAL',
          parcelInfo: {
            weightKg: Number(order.weightKg ?? 0),
            packageType: order.parcelDescription || 'Standard Parcel',
            dimensions: order.parcelSize,
            handlingNotes: order.deliveryInstructions,
          },
        });
      }
    }
    return base;
  }, [unassignedQuery.data, branchOrdersQuery.data, effectiveBranchId]);

  const openPickupTasks = useMemo(() => {
    const base: PickupTaskDto[] = (pickupTasksQuery.data || []).filter(
      (task) =>
        task.status !== 'BRANCH_RECEIVED' &&
        task.status !== 'CANCELLED' &&
        (!effectiveBranchId ||
          !task.originBranchId ||
          Number(task.originBranchId) === Number(effectiveBranchId))
    );
    const seenTrackings = new Set(base.map((t) => t.trackingNumber));
    const seenOrderIds = new Set(base.map((t) => String(t.orderId)));

    for (const order of branchOrdersQuery.data || []) {
      const s = String(order.status || '').toUpperCase();
      if (
        shouldIncludeOrderInOriginPickupQueue(order, effectiveBranchId) &&
        !seenTrackings.has(order.trackingNumber) &&
        !seenOrderIds.has(String(order.id))
      ) {
        const isDropoff =
          String(order.pickupMethod || '').toUpperCase() === 'BRANCH_DROPOFF' ||
          String(order.pickupMethod || '').toUpperCase() === 'BRANCH_DROP_OFF';
        base.push({
          id: Number(order.id),
          taskCode: `ORD-${order.id}`,
          orderId: Number(order.id),
          trackingNumber: order.trackingNumber,
          pickupMethod: isDropoff ? 'BRANCH_DROP_OFF' : 'COURIER_PICKUP',
          status:
            s === 'CONFIRMED' || s === 'CREATED'
              ? 'PENDING_ASSIGNMENT'
              : s === 'PICKUP_ASSIGNED'
                ? 'ASSIGNED'
                : 'PICKED_UP',
          priority: 'NORMAL',
          originBranchId: order.originBranchId || effectiveBranchId || 1,
          originBranchName: order.originBranchName,
          destinationBranchId: order.destinationBranchId,
          destinationBranchName: order.destinationBranchName,
          sameBranch: Boolean(order.sameBranch),
          senderName: order.pickupContactName,
          senderPhone: order.pickupContactPhone,
          pickupAddress: order.pickupAddress,
          pickupCity: order.pickupCity,
          recipientName: order.dropoffContactName,
          recipientPhone: order.dropoffContactPhone,
          dropoffAddress: order.dropoffAddress,
          dropoffCity: order.dropoffCity,
          parcelCategory: order.parcelDescription || 'Standard Parcel',
          parcelSize: order.parcelSize,
          weightKg: order.weightKg,
          assignedCourierName: order.courierName || undefined,
          createdAt: order.createdAt,
        });
      }
    }
    return base;
  }, [pickupTasksQuery.data, branchOrdersQuery.data, effectiveBranchId]);

  useEffect(() => {
    if (
      !hasAutoSelectedTab &&
      unassignedDeliveries.length === 0 &&
      openPickupTasks.length > 0
    ) {
      setActiveTab('pickups');
      setHasAutoSelectedTab(true);
    }
  }, [hasAutoSelectedTab, unassignedDeliveries.length, openPickupTasks.length]);

  const pendingPickupAssignCount = useMemo(
    () => openPickupTasks.filter((t) => t.status === 'PENDING_ASSIGNMENT').length,
    [openPickupTasks]
  );

  const metrics: DeliverySummaryMetrics = useMemo(() => {
    const couriers = couriersQuery.data || [];
    const assignments = assignmentsQuery.data || [];
    const now = new Date();
    return {
      totalUnassigned: unassignedDeliveries.length,
      pendingPickups: pendingPickupAssignCount,
      availableCouriers: couriers.filter(
        (c) => c.status !== 'OFFLINE' && c.status !== 'ON_BREAK' && c.activeDeliveries < c.maxCapacity
      ).length,
      highPriorityDeliveries: unassignedDeliveries.filter(
        (item) => item.priority === 'URGENT' || item.priority === 'HIGH'
      ).length,
      assignedToday: assignments.filter((a) => isSameLocalDay(a.assignedAt || a.assignedDate, now))
        .length,
    };
  }, [unassignedDeliveries, pendingPickupAssignCount, couriersQuery.data, assignmentsQuery.data]);

  const isLoading =
    unassignedQuery.isLoading || pickupTasksQuery.isLoading || couriersQuery.isLoading;
  const isRefreshing =
    unassignedQuery.isFetching || pickupTasksQuery.isFetching || couriersQuery.isFetching;
  const loadError = unassignedQuery.error || pickupTasksQuery.error || couriersQuery.error;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: dispatchQueryKeys.all });
    queryClient.invalidateQueries({ queryKey: ['dispatcher', 'branch-orders'] });
  };

  const handleAssignmentSuccess = ({
    order,
    courier,
  }: {
    order: UnassignedDelivery;
    courier: CourierAvailability;
  }) => {
    const label = order.taskType === 'PICKUP' ? 'Pickup task' : 'Delivery';
    showToast(
      `${label} for ${order.trackingNumber || `Order #${order.orderId}`} assigned to ${courier.name} (${courier.courierCode}).`
    );
    queryClient.invalidateQueries({ queryKey: dispatchQueryKeys.all });
  };

  const handleOpenDropoffDialog = (trackingNumber = '', branchId?: number) => {
    setBranchDropoffTracking(trackingNumber);
    setBranchDropoffBranchId(branchId);
    setBranchDropoffOpen(true);
  };

  return (
    <div className="dispatcher-overview">
      {/* Page Header */}
      <header className="dispatcher-overview__header">
        <div className="dispatcher-overview__title-group">
          <h1 className="dispatcher-overview__title">Dispatch Queue &amp; Pickups</h1>
          <p className="dispatcher-overview__subtitle">
            Assign couriers to pending pickup requests and unassigned last-mile deliveries, or confirm branch drop-offs.
          </p>
        </div>

        <div className="dispatcher-overview__actions">
          <button
            type="button"
            className="dispatcher-btn-primary"
            onClick={() => handleOpenDropoffDialog()}
          >
            <PackageCheck size={15} aria-hidden="true" />
            <span>Confirm Branch Drop-Off</span>
          </button>

          <button
            type="button"
            className="dispatcher-overview__refresh-btn"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            aria-label="Refresh dispatch queues"
          >
            <RefreshCw
              size={15}
              className={`dispatcher-overview__refresh-icon ${
                isRefreshing ? 'dispatcher-overview__refresh-icon--spinning' : ''
              }`}
              aria-hidden="true"
            />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {/* Success Notification Banner */}
      {toastMessage && (
        <div className="dispatcher-toast-banner" role="status">
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error Banner */}
      {loadError && (
        <div className="dispatcher-error-banner" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <div className="dispatcher-error-banner__body">
            <strong>Unable to load dispatch queues</strong>
            <p>
              {loadError instanceof Error
                ? loadError.message
                : 'Failed to connect to Dispatch Service.'}
            </p>
          </div>
          <button
            type="button"
            className="dispatcher-action-btn-secondary"
            onClick={handleRefresh}
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary Metric Cards */}
      <DeliverySummaryCards metrics={metrics} />

      {/* Queue Mode Tabs */}
      <div
        role="tablist"
        aria-label="Dispatch Queue Sections"
        style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'deliveries'}
          onClick={() => setActiveTab('deliveries')}
          className={
            activeTab === 'deliveries'
              ? 'dispatcher-btn-primary'
              : 'dispatcher-action-btn-secondary'
          }
        >
          <Truck size={15} aria-hidden="true" />
          <span>Last-Mile Unassigned ({unassignedDeliveries.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'pickups'}
          onClick={() => setActiveTab('pickups')}
          className={
            activeTab === 'pickups'
              ? 'dispatcher-btn-primary'
              : 'dispatcher-action-btn-secondary'
          }
        >
          <Warehouse size={15} aria-hidden="true" />
          <span>
            Courier Pickups &amp; Branch Drop-Offs ({openPickupTasks.length})
          </span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'deliveries' ? (
        <UnassignedDeliveryTable
          deliveries={unassignedDeliveries}
          isLoading={isLoading}
          onViewDetails={(d) => setSelectedDetailsDelivery(d)}
          onAssignCourier={(d) => setSelectedAssignDelivery(d)}
        />
      ) : (
        <section className="dispatcher-table-card" aria-label="Pickup tasks and branch drop-offs">
          <div className="dispatcher-table-wrapper">
            <table className="dispatcher-table">
              <thead>
                <tr>
                  <th>Task / Tracking</th>
                  <th>Method &amp; Origin Branch</th>
                  <th>Sender &amp; Pickup Address</th>
                  <th>Parcel &amp; Status</th>
                  <th style={{ textAlign: 'right' }}>Dispatch Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      Loading pickup tasks...
                    </td>
                  </tr>
                ) : openPickupTasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                      No pending courier pickup tasks or awaiting branch drop-offs.
                    </td>
                  </tr>
                ) : (
                  openPickupTasks.map((task) => {
                    const isDropoff =
                      task.pickupMethod === 'BRANCH_DROP_OFF' ||
                      String(task.pickupMethod) === 'BRANCH_DROPOFF';
                    const canAssign = !isDropoff && task.status === 'PENDING_ASSIGNMENT';
                    const canConfirmDropoff = isDropoff && task.status === 'PENDING_ASSIGNMENT';

                    return (
                      <tr key={task.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{task.taskCode}</div>
                          <div style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 600 }}>
                            {task.trackingNumber}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            Order #{task.orderId}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`dispatcher-status-badge ${
                              isDropoff
                                ? 'dispatcher-status-badge--info'
                                : 'dispatcher-status-badge--warning'
                            }`}
                          >
                            {isDropoff ? 'Branch Drop-Off' : 'Courier Pickup'}
                          </span>
                          <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.25rem' }}>
                            {task.originBranchName || 'Origin Branch'} ({task.originBranchCode || '—'})
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>
                            {task.senderName || task.merchantName || 'Customer'}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                            {task.pickupAddress || 'Walk-in drop-off'}
                            {task.pickupCity ? `, ${task.pickupCity}` : ''}
                          </div>
                          {task.senderPhone && (
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              {task.senderPhone}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="dispatcher-status-badge dispatcher-status-badge--neutral">
                            {task.status.replace(/_/g, ' ')}
                          </span>
                          <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.25rem' }}>
                            {task.parcelCategory || 'Parcel'} · {task.weightKg ?? 0} kg
                          </div>
                          {task.assignedCourierName && (
                            <div style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 600 }}>
                              Courier: {task.assignedCourierName}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              gap: '0.45rem',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              flexWrap: 'wrap',
                            }}
                          >
                            {canAssign ? (
                              <button
                                type="button"
                                className="dispatcher-btn-primary"
                                style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                                onClick={() =>
                                  setSelectedAssignDelivery(mapPickupTaskToQueueItem(task))
                                }
                              >
                                Assign Pickup Courier
                              </button>
                            ) : canConfirmDropoff ? (
                              <button
                                type="button"
                                className="dispatcher-action-btn-secondary"
                                onClick={() =>
                                  handleOpenDropoffDialog(task.trackingNumber, task.originBranchId)
                                }
                              >
                                Confirm Intake
                              </button>
                            ) : null}

                            <button
                              type="button"
                              className="dispatcher-action-btn-secondary"
                              style={{ padding: '0.45rem 0.75rem', fontSize: '0.78rem' }}
                              onClick={() =>
                                setSelectedActionModalOrderId(
                                  task.orderId ?? task.trackingNumber
                                )
                              }
                            >
                              Manage / Transfer
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Delivery Details Modal */}
      <DeliveryDetailsModal
        isOpen={selectedDetailsDelivery !== null}
        delivery={selectedDetailsDelivery}
        onClose={() => setSelectedDetailsDelivery(null)}
        onAssignClick={(delivery) => {
          setSelectedDetailsDelivery(null);
          setSelectedAssignDelivery(delivery);
        }}
      />

      {/* Courier Assignment Dialog (Supports Both Delivery Jobs & Pickup Tasks) */}
      <AssignCourierDialog
        isOpen={selectedAssignDelivery !== null}
        order={selectedAssignDelivery}
        onClose={() => setSelectedAssignDelivery(null)}
        onSuccess={handleAssignmentSuccess}
      />

      {/* Branch Drop-Off Confirmation Dialog */}
      <BranchDropoffDialog
        isOpen={branchDropoffOpen}
        initialTrackingNumber={branchDropoffTracking}
        initialBranchId={branchDropoffBranchId}
        onClose={() => setBranchDropoffOpen(false)}
        onConfirmed={(msg) => {
          showToast(msg);
          handleRefresh();
        }}
      />

      {/* Full Order Details, Courier Assignment & Inter-Branch Transfer Modal */}
      <OrderDispatchActionModal
        isOpen={selectedActionModalOrderId !== null}
        orderIdOrTracking={selectedActionModalOrderId}
        initialOrder={
          (branchOrdersQuery.data || []).find(
            (o) =>
              String(o.id) === String(selectedActionModalOrderId) ||
              o.trackingNumber === String(selectedActionModalOrderId)
          ) ?? null
        }
        effectiveBranchId={effectiveBranchId}
        allBranches={branchesQuery.data || []}
        onClose={() => setSelectedActionModalOrderId(null)}
        onUpdated={handleRefresh}
      />
    </div>
  );
}
