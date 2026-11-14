'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  useDispatchCouriers,
  usePickupTasks,
  useUnassignedDeliveries,
} from '@/hooks/api/use-dispatch';

type QueueTab = 'deliveries' | 'pickups';

export default function UnassignedDeliveriesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<QueueTab>('deliveries');

  // Queries with controlled 15s polling
  const unassignedQuery = useUnassignedDeliveries(undefined, { refetchInterval: 15_000 });
  const pickupTasksQuery = usePickupTasks(undefined, { refetchInterval: 15_000 });
  const couriersQuery = useDispatchCouriers(undefined, { refetchInterval: 15_000 });
  const assignmentsQuery = useAssignments(undefined, { refetchInterval: 15_000 });

  // Selected items for modals
  const [selectedDetailsDelivery, setSelectedDetailsDelivery] =
    useState<UnassignedDelivery | null>(null);
  const [selectedAssignDelivery, setSelectedAssignDelivery] =
    useState<UnassignedDelivery | null>(null);
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

  const unassignedDeliveries = useMemo(
    () => (unassignedQuery.data || []).map(mapDeliveryJobToUnassigned),
    [unassignedQuery.data]
  );

  const openPickupTasks = useMemo(
    () =>
      (pickupTasksQuery.data || []).filter(
        (task) => task.status !== 'BRANCH_RECEIVED' && task.status !== 'CANCELLED'
      ),
    [pickupTasksQuery.data]
  );

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
                    const isDropoff = task.pickupMethod === 'BRANCH_DROP_OFF';
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
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                              {task.status === 'PICKED_UP'
                                ? 'Collected by courier'
                                : 'In progress'}
                            </span>
                          )}
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
          queryClient.invalidateQueries({ queryKey: dispatchQueryKeys.all });
        }}
      />
    </div>
  );
}
