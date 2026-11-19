'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Package,
  PackageCheck,
  RefreshCw,
  Send,
  Truck,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import {
  getOrderById,
  updateOrderStatus,
} from '@/api/services/orders.api';
import {
  dispatchApi,
  type CourierProfileDto,
} from '@/api/services/dispatch.api';
import type { DeliveryOrder } from '@/types/order.types';
import type { BranchResponse } from '@/types/organization.types';
import {
  isSameBranchOrder,
  resolveParcelModalCapabilities,
} from './parcel-dispatch-workflow';

export interface OrderDispatchActionModalProps {
  isOpen: boolean;
  orderIdOrTracking: string | number | null;
  initialOrder?: DeliveryOrder | null;
  effectiveBranchId?: number | null;
  allBranches?: BranchResponse[];
  manifestCode?: string;
  onClose: () => void;
  onUpdated?: () => void;
}

function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-LK', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(val?: number): string {
  if (typeof val !== 'number' || Number.isNaN(val)) return 'LKR 0.00';
  return `LKR ${val.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function OrderDispatchActionModal({
  isOpen,
  orderIdOrTracking,
  initialOrder = null,
  effectiveBranchId = null,
  allBranches = [],
  manifestCode,
  onClose,
  onUpdated,
}: OrderDispatchActionModalProps) {
  const [order, setOrder] = useState<DeliveryOrder | null>(initialOrder);
  const [isLoadingOrder, setIsLoadingOrder] = useState<boolean>(false);
  const [couriers, setCouriers] = useState<CourierProfileDto[]>([]);
  const [isLoadingCouriers, setIsLoadingCouriers] = useState<boolean>(false);

  const [selectedCourierId, setSelectedCourierId] = useState<string>('');
  const [priority, setPriority] = useState<string>('NORMAL');
  const [notes, setNotes] = useState<string>('');
  const [vehicleType, setVehicleType] = useState<string>('VAN');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resolveBranchLabel = useCallback(
    (branchId?: number | null, fallbackName?: string | null) => {
      if (fallbackName && fallbackName.trim().length > 0) {
        return fallbackName;
      }
      if (!branchId) return 'Unassigned Branch';
      const found = allBranches.find((b) => Number(b.id) === Number(branchId));
      if (found) {
        return `${found.code} — ${found.name}`;
      }
      return `Hub #${branchId}`;
    },
    [allBranches]
  );

  const loadOrderAndFleet = useCallback(
    async (targetKey: string | number) => {
      setIsLoadingOrder(true);
      setErrorMessage(null);
      try {
        const fetched = await getOrderById(targetKey);
        setOrder(fetched);

        const capabilities = resolveParcelModalCapabilities(
          fetched,
          effectiveBranchId
        );
        const fleetBranchId = capabilities.canAssignDeliveryCourier
          ? fetched.destinationBranchId || fetched.originBranchId || effectiveBranchId
          : fetched.originBranchId || effectiveBranchId || fetched.destinationBranchId;

        setIsLoadingCouriers(true);
        try {
          const avail = await dispatchApi.getCourierAvailability({
            branchId: fleetBranchId ?? undefined,
            orderId: fetched.id,
            weightKg: fetched.weightKg,
          });
          if (avail.length > 0) {
            setCouriers(avail);
          } else {
            const branchFleet = await dispatchApi.getCouriers(
              fleetBranchId ?? undefined
            );
            setCouriers(branchFleet);
          }
        } catch {
          setCouriers([]);
        } finally {
          setIsLoadingCouriers(false);
        }
      } catch (err: unknown) {
        if (!initialOrder) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : 'Unable to load order details from Order Service.'
          );
        }
      } finally {
        setIsLoadingOrder(false);
      }
    },
    [effectiveBranchId, initialOrder]
  );

  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      setSelectedCourierId('');
      setNotes('');
      return;
    }
    if (initialOrder) {
      setOrder(initialOrder);
    }
    if (orderIdOrTracking !== null && orderIdOrTracking !== undefined) {
      loadOrderAndFleet(orderIdOrTracking);
    }
  }, [isOpen, orderIdOrTracking, initialOrder, loadOrderAndFleet]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const capabilities = order
    ? resolveParcelModalCapabilities(order, effectiveBranchId)
    : null;
  const sameBranch = order ? isSameBranchOrder(order) : false;

  const selectedCourier = couriers.find(
    (c) =>
      String(c.courierCode || c.id) === selectedCourierId ||
      String(c.id) === selectedCourierId
  );

  const handleAssignCourier = async (taskType: 'PICKUP' | 'DELIVERY') => {
    if (!order) return;
    if (!selectedCourierId) {
      setErrorMessage('Please select an available courier before assigning.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const assigned = await dispatchApi.createAssignment({
        orderId: String(order.id),
        courierId: selectedCourierId,
        taskType,
        priority,
        notes:
          notes.trim() ||
          (taskType === 'PICKUP'
            ? sameBranch
              ? 'Local same-branch courier pickup assignment'
              : 'First-mile pickup to origin branch hub'
            : sameBranch
              ? 'Same-branch direct delivery to destination recipient'
              : 'Last-mile delivery from destination branch hub'),
      });

      const courierDisplay =
        assigned.courier?.name || selectedCourier?.name || selectedCourierId;
      setSuccessMessage(
        taskType === 'PICKUP'
          ? `Pickup courier (${courierDisplay}) assigned to ${order.trackingNumber}.`
          : `Delivery courier (${courierDisplay}) assigned to ${order.trackingNumber} (Out for Delivery).`
      );
      await loadOrderAndFleet(order.id);
      onUpdated?.();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to assign courier.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmOriginBranchArrival = async () => {
    if (!order) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const s = String(order.status || '').toUpperCase();
      const method = String(order.pickupMethod || '').toUpperCase();
      const originLabel = resolveBranchLabel(
        order.originBranchId,
        order.originBranchName
      );

      if (method === 'BRANCH_DROPOFF' || method === 'BRANCH_DROP_OFF') {
        await dispatchApi.confirmBranchDropoff({
          orderId: Number(order.id),
          trackingNumber: order.trackingNumber,
          branchId: order.originBranchId ?? effectiveBranchId ?? undefined,
          notes:
            notes.trim() ||
            `Confirmed direct branch drop-off at ${originLabel}`,
        });
      } else {
        if (s === 'PICKUP_ASSIGNED') {
          await updateOrderStatus(order.id, {
            status: 'PICKED_UP',
            location: order.pickupAddress || originLabel,
            description:
              'Parcel collected by pickup courier en route to origin branch',
          });
        }
        await updateOrderStatus(order.id, {
          status: 'AT_ORIGIN_BRANCH',
          location: originLabel,
          description:
            notes.trim() ||
            `Parcel arrived at origin branch (${originLabel}) and ready for inter-branch transfer`,
        });
      }

      setSuccessMessage(
        `Parcel ${order.trackingNumber} confirmed at Origin Branch (${originLabel}). You can now dispatch it to the Inter-Branch Transport System.`
      );
      await loadOrderAndFleet(order.id);
      onUpdated?.();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Unable to confirm parcel arrival at origin branch.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendToInterBranchTransport = async (departImmediately: boolean) => {
    if (!order) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const originId = Number(order.originBranchId || effectiveBranchId);
      const destId = Number(order.destinationBranchId);
      const originBranchObj = allBranches.find((b) => Number(b.id) === originId);
      const destBranchObj = allBranches.find((b) => Number(b.id) === destId);

      // Trigger pickup task reconciliation at origin branch so manifest creation has the synced PickupTask without overwriting pickupMethod
      try {
        await dispatchApi.getPickupTasks({ branchId: originId });
      } catch {
        // Proceed with manifest creation or direct status transition fallback
      }

      let createdManifestCode = manifestCode;
      try {
        const createdManifest = await dispatchApi.createTransferManifest({
          originBranchId: originId,
          originBranchCode: originBranchObj?.code,
          originBranchName: originBranchObj?.name || order.originBranchName,
          destinationBranchId: destId,
          destinationBranchCode: destBranchObj?.code,
          destinationBranchName:
            destBranchObj?.name || order.destinationBranchName,
          trackingNumbers: [order.trackingNumber],
          orderIds: [String(order.id)],
          notes:
            notes.trim() ||
            `Inter-branch linehaul transfer for ${order.trackingNumber} (${vehicleType})`,
        });
        createdManifestCode = createdManifest.manifestCode;

        if (selectedCourierId) {
          await dispatchApi.assignTransferCourier(createdManifest.manifestCode, {
            courierId: selectedCourierId,
            notes: notes.trim() || `Assigned linehaul transfer driver (${vehicleType})`,
          });
        }

        if (departImmediately) {
          if (!selectedCourierId && couriers.length > 0) {
            const firstCourier = couriers[0];
            await dispatchApi.assignTransferCourier(
              createdManifest.manifestCode,
              {
                courierId: String(firstCourier.courierCode || firstCourier.id),
                notes: `Auto-assigned linehaul driver (${vehicleType})`,
              }
            );
          }
          await dispatchApi.departTransferManifest(createdManifest.manifestCode, {
            handoverNotes: notes.trim() || 'Dispatched from origin branch hub',
          });
        }
      } catch {
        // If manifest departure requires a linehaul courier and none exist in this branch yet,
        // transition the authoritative order lifecycle to IN_TRANSIT directly so inter-branch flow is never blocked.
        if (departImmediately) {
          await updateOrderStatus(order.id, {
            status: 'IN_TRANSIT',
            location: `${resolveBranchLabel(originId, order.originBranchName)} → ${resolveBranchLabel(destId, order.destinationBranchName)}`,
            description:
              notes.trim() ||
              `Dispatched to Inter-Branch Transport System (${vehicleType})`,
          });
        }
      }

      setSuccessMessage(
        departImmediately
          ? `Parcel ${order.trackingNumber} dispatched to Inter-Branch Transport${createdManifestCode ? ` (Manifest ${createdManifestCode})` : ''} and is now IN_TRANSIT.`
          : `Parcel ${order.trackingNumber} added to Inter-Branch Transfer Manifest ${createdManifestCode || ''}.`
      );
      await loadOrderAndFleet(order.id);
      onUpdated?.();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to dispatch parcel to Inter-Branch Transport System.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDestinationReceipt = async () => {
    if (!order) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const destLabel = resolveBranchLabel(
        order.destinationBranchId,
        order.destinationBranchName
      );

      if (manifestCode) {
        try {
          await dispatchApi.receiveTransferManifest(manifestCode, {
            receivedOrderIds: [String(order.id)],
            notes:
              notes.trim() ||
              `Verified arrival of ${order.trackingNumber} at ${destLabel}`,
          });
        } catch {
          await updateOrderStatus(order.id, {
            status: 'AT_DESTINATION_BRANCH',
            location: destLabel,
            description:
              notes.trim() ||
              `Parcel received at destination branch (${destLabel})`,
          });
        }
      } else {
        await updateOrderStatus(order.id, {
          status: 'AT_DESTINATION_BRANCH',
          location: destLabel,
          description:
            notes.trim() ||
            `Parcel received at destination branch (${destLabel})`,
        });
      }

      setSuccessMessage(
        `Parcel ${order.trackingNumber} received at Destination Branch (${destLabel}). You can now assign a last-mile delivery courier.`
      );
      await loadOrderAndFleet(order.id);
      onUpdated?.();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to confirm receipt at destination branch.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 p-4 backdrop-blur-xs"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-dispatch-modal-title"
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#E5EAF0] bg-[#F8FAFC] px-6 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-[#102B50] px-2.5 py-0.5 font-mono text-xs font-bold text-white">
                {order?.trackingNumber || `Order #${orderIdOrTracking}`}
              </span>
              {order && (
                <span className="rounded-full border border-[#BFDBFE] bg-[#EAF3FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#102B50]">
                  {order.status}
                </span>
              )}
              {order && (
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                    sameBranch
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-indigo-200 bg-indigo-50 text-indigo-800'
                  }`}
                >
                  {sameBranch
                    ? 'Same-Branch Area (Direct to Recipient)'
                    : 'Inter-Branch Route (Hub-to-Hub)'}
                </span>
              )}
            </div>
            <h2
              id="order-dispatch-modal-title"
              className="mt-1.5 text-lg font-bold text-[#102B50]"
            >
              Order Details &amp; Branch Dispatch Console
            </h2>
            <p className="text-xs text-[#64748B]">
              Inspect parcel specifications, assign pickup or delivery couriers,
              and manage inter-branch transport without leaving the dashboard.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-[#64748B] transition hover:bg-[#E2E8F0] hover:text-[#0F172A]"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {errorMessage && (
            <div
              className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <div className="flex-1">
                <strong className="font-semibold">Action Error:</strong>{' '}
                {errorMessage}
              </div>
            </div>
          )}

          {successMessage && (
            <div
              className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900"
              role="status"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          {isLoadingOrder && !order ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#64748B]">
              <Loader2 className="h-5 w-5 animate-spin text-[#1677E8]" />
              <span>Loading order and dispatch details...</span>
            </div>
          ) : order ? (
            <>
              {/* Route Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF3FF] text-[#1677E8]">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      Origin Branch
                    </div>
                    <div className="text-sm font-bold text-[#102B50]">
                      {resolveBranchLabel(
                        order.originBranchId,
                        order.originBranchName
                      )}
                    </div>
                  </div>
                </div>

                <ArrowRight className="h-4 w-4 text-[#94A3B8]" />

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF3FF] text-[#102B50]">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      Destination Branch
                    </div>
                    <div className="text-sm font-bold text-[#102B50]">
                      {resolveBranchLabel(
                        order.destinationBranchId,
                        order.destinationBranchName
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Pickup Method
                  </div>
                  <div className="text-xs font-bold text-[#102B50]">
                    {String(order.pickupMethod).includes('DROP')
                      ? 'Branch Drop-Off'
                      : 'Courier Pickup'}
                  </div>
                </div>
              </div>

              {/* Operational Dispatch & Transfer Facility */}
              {capabilities && (
                <div className="rounded-xl border-2 border-[#BFDBFE] bg-[#F0F7FF] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DBEAFE] pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#102B50]">
                        Operational Dispatch &amp; Transfer Controls
                      </h3>
                      <p className="text-xs text-[#475569]">
                        {sameBranch
                          ? 'Same-branch coverage order: parcel is delivered directly to the destination recipient via dispatcher assignment without inter-branch transfer.'
                          : 'Inter-branch order: Origin Dispatcher assigns pickup courier to bring parcel to branch, then dispatches to Inter-Branch Transport; Destination Dispatcher receives and assigns last-mile courier.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => loadOrderAndFleet(order.id)}
                      disabled={isLoadingOrder || isLoadingCouriers || isSubmitting}
                      className="inline-flex items-center gap-1 rounded-md border border-[#CBD5E1] bg-white px-2.5 py-1 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC]"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${
                          isLoadingOrder || isLoadingCouriers ? 'animate-spin' : ''
                        }`}
                      />
                      Refresh
                    </button>
                  </div>

                  {/* Courier Selector when Pickup, Delivery, or Linehaul Assignment is applicable */}
                  {(capabilities.canAssignPickupCourier ||
                    capabilities.canAssignDeliveryCourier ||
                    capabilities.canSendToInterBranchTransport) && (
                    <div className="mt-3.5 grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="md:col-span-2">
                        <label
                          htmlFor="modal-courier-select"
                          className="block text-xs font-semibold text-[#102B50]"
                        >
                          Select Branch Courier
                          {capabilities.canSendToInterBranchTransport
                            ? ' (Linehaul Driver)'
                            : ''}
                        </label>
                        <select
                          id="modal-courier-select"
                          value={selectedCourierId}
                          onChange={(e) => setSelectedCourierId(e.target.value)}
                          disabled={isSubmitting || isLoadingCouriers}
                          className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0F172A] focus:border-[#1677E8] focus:outline-hidden"
                        >
                          <option value="">
                            {isLoadingCouriers
                              ? 'Loading branch couriers...'
                              : couriers.length === 0
                                ? 'No couriers found for this branch'
                                : '— Choose an eligible courier —'}
                          </option>
                          {couriers.map((c) => {
                            const code = String(c.courierCode || c.id);
                            const selectable = c.status !== 'OFFLINE';
                            return (
                              <option
                                key={code}
                                value={code}
                                disabled={!selectable}
                              >
                                {c.name} ({code}) · {c.vehicleType} ·{' '}
                                {c.activeDeliveries ?? 0}/{c.maxCapacity ?? 10}{' '}
                                tasks [{c.status}]
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="modal-priority-select"
                          className="block text-xs font-semibold text-[#102B50]"
                        >
                          {capabilities.canSendToInterBranchTransport
                            ? 'Transport Vehicle'
                            : 'Dispatch Priority'}
                        </label>
                        {capabilities.canSendToInterBranchTransport ? (
                          <select
                            id="modal-priority-select"
                            value={vehicleType}
                            onChange={(e) => setVehicleType(e.target.value)}
                            disabled={isSubmitting}
                            className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0F172A]"
                          >
                            <option value="VAN">Linehaul Van</option>
                            <option value="TRUCK">Cargo Truck</option>
                            <option value="MOTORCYCLE">Express Rider</option>
                          </select>
                        ) : (
                          <select
                            id="modal-priority-select"
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            disabled={isSubmitting}
                            className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0F172A]"
                          >
                            <option value="NORMAL">NORMAL</option>
                            <option value="HIGH">HIGH</option>
                            <option value="URGENT">URGENT</option>
                          </select>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Operational Notes */}
                  <div className="mt-3">
                    <label
                      htmlFor="modal-dispatch-notes"
                      className="block text-xs font-semibold text-[#102B50]"
                    >
                      Operational / Handover Notes (Optional)
                    </label>
                    <input
                      id="modal-dispatch-notes"
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add courier instructions, manifest reference, or branch intake note..."
                      disabled={isSubmitting}
                      className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs text-[#0F172A]"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    {capabilities.canAssignPickupCourier && (
                      <button
                        type="button"
                        disabled={isSubmitting || !selectedCourierId}
                        onClick={() => handleAssignCourier('PICKUP')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#1677E8] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1261C0] disabled:opacity-50"
                      >
                        <UserCheck className="h-4 w-4" />
                        <span>
                          {order.status === 'PICKUP_ASSIGNED'
                            ? 'Reassign Pickup Courier'
                            : sameBranch
                              ? 'Assign Courier for Local Pickup'
                              : 'Assign Courier to Pick Up to Branch'}
                        </span>
                      </button>
                    )}

                    {capabilities.canConfirmOriginBranchArrival && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleConfirmOriginBranchArrival}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#102B50] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1B3F6E] disabled:opacity-50"
                      >
                        <PackageCheck className="h-4 w-4" />
                        <span>
                          {String(order.pickupMethod).includes('DROP')
                            ? 'Confirm Customer Branch Drop-Off'
                            : 'Confirm Parcel Arrived at Origin Branch'}
                        </span>
                      </button>
                    )}

                    {capabilities.canSendToInterBranchTransport && (
                      <>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleSendToInterBranchTransport(true)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1677E8] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1261C0] disabled:opacity-50"
                        >
                          <Send className="h-4 w-4" />
                          <span>Send to Inter-Branch Transport (In Transit)</span>
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleSendToInterBranchTransport(false)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#102B50] bg-white px-3 py-2 text-xs font-semibold text-[#102B50] transition hover:bg-[#F1F5F9] disabled:opacity-50"
                        >
                          <Truck className="h-4 w-4" />
                          <span>Create Draft Transfer Manifest</span>
                        </button>
                      </>
                    )}

                    {capabilities.canConfirmDestinationBranchReceipt && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleConfirmDestinationReceipt}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <PackageCheck className="h-4 w-4" />
                        <span>Confirm Arrival at Destination Branch</span>
                      </button>
                    )}

                    {capabilities.canAssignDeliveryCourier && (
                      <button
                        type="button"
                        disabled={isSubmitting || !selectedCourierId}
                        onClick={() => handleAssignCourier('DELIVERY')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <Truck className="h-4 w-4" />
                        <span>
                          {sameBranch
                            ? 'Send Directly to Destination User (Assign Delivery Courier)'
                            : 'Assign Last-Mile Delivery Courier'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Sender & Recipient Cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[#E2E8F0] p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#64748B]">
                    <User className="h-3.5 w-3.5 text-[#1677E8]" />
                    Sender &amp; Pickup Location
                  </div>
                  <div className="mt-2.5 space-y-1 text-xs text-[#1E293B]">
                    <div className="font-bold text-[#0F172A]">
                      {order.pickupContactName || 'Sender'}
                    </div>
                    <div className="text-[#475569]">
                      {order.pickupContactPhone || '—'}
                    </div>
                    <div className="mt-1 text-[#334155]">
                      {order.pickupAddress}
                      {order.pickupCity ? `, ${order.pickupCity}` : ''}
                      {order.pickupPostalCode ? ` (${order.pickupPostalCode})` : ''}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[#E2E8F0] p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#64748B]">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                    Recipient &amp; Destination
                  </div>
                  <div className="mt-2.5 space-y-1 text-xs text-[#1E293B]">
                    <div className="font-bold text-[#0F172A]">
                      {order.dropoffContactName || 'Recipient'}
                    </div>
                    <div className="text-[#475569]">
                      {order.dropoffContactPhone || '—'}
                    </div>
                    <div className="mt-1 text-[#334155]">
                      {order.dropoffAddress}
                      {order.dropoffCity ? `, ${order.dropoffCity}` : ''}
                      {order.dropoffPostalCode
                        ? ` (${order.dropoffPostalCode})`
                        : ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* Parcel Specs & Financials */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 md:grid-cols-4">
                <div>
                  <div className="text-[11px] text-[#64748B]">Parcel Weight</div>
                  <div className="mt-0.5 text-xs font-bold text-[#0F172A]">
                    {order.weightKg} kg ({order.parcelSize || 'STANDARD'})
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#64748B]">Payment Mode</div>
                  <div className="mt-0.5 text-xs font-bold text-[#0F172A]">
                    {order.paymentMethod} ({order.paymentStatus})
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#64748B]">Delivery Fee</div>
                  <div className="mt-0.5 text-xs font-bold text-[#0F172A]">
                    {formatCurrency(order.deliveryFee)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#64748B]">COD Amount</div>
                  <div className="mt-0.5 text-xs font-bold text-[#0F172A]">
                    {formatCurrency(order.codAmount)}
                  </div>
                </div>
                {order.parcelDescription && (
                  <div className="col-span-2 md:col-span-4">
                    <div className="text-[11px] text-[#64748B]">
                      Description &amp; Instructions
                    </div>
                    <div className="mt-0.5 text-xs text-[#334155]">
                      {order.parcelDescription}
                      {order.deliveryInstructions
                        ? ` · Notes: ${order.deliveryInstructions}`
                        : ''}
                    </div>
                  </div>
                )}
              </div>

              {/* Tracking History */}
              {order.trackingEvents && order.trackingEvents.length > 0 && (
                <div className="rounded-xl border border-[#E2E8F0] p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#64748B]">
                    <Clock className="h-3.5 w-3.5 text-[#1677E8]" />
                    Lifecycle Audit Trail
                  </div>
                  <div className="mt-3 space-y-2.5">
                    {order.trackingEvents.map((ev, idx) => (
                      <div
                        key={ev.id ?? idx}
                        className="flex items-start justify-between gap-3 border-b border-[#F1F5F9] pb-2 last:border-b-0 last:pb-0"
                      >
                        <div className="flex items-start gap-2">
                          <Package className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1677E8]" />
                          <div>
                            <div className="text-xs font-semibold text-[#0F172A]">
                              {ev.statusLabel || ev.status}
                              {ev.location ? ` · ${ev.location}` : ''}
                            </div>
                            <div className="text-[11px] text-[#64748B]">
                              {ev.description}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 text-[11px] text-[#64748B]">
                          {formatDateTime(ev.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#E5EAF0] bg-[#F8FAFC] px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-[#CBD5E1] bg-white px-4 py-2 text-xs font-semibold text-[#334155] transition hover:bg-[#F1F5F9]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
export default OrderDispatchActionModal;
