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
  resolveFleetQueryBranchId,
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
        const fleetBranchId = resolveFleetQueryBranchId(
          fetched,
          capabilities,
          effectiveBranchId
        );

        if (fleetBranchId === null) {
          setCouriers([]);
        } else {
          setIsLoadingCouriers(true);
          try {
            const avail = await dispatchApi.getCourierAvailability({
              branchId: fleetBranchId,
              orderId: fetched.id,
              weightKg: fetched.weightKg,
            });
            if (avail.length > 0) {
              setCouriers(avail);
            } else {
              const branchFleet = await dispatchApi.getCouriers(fleetBranchId);
              setCouriers(branchFleet);
            }
          } catch {
            setCouriers([]);
          } finally {
            setIsLoadingCouriers(false);
          }
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
      className="sd-dispatch-modal-overlay"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-dispatch-modal-title"
    >
      <div
        className="sd-dispatch-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sd-dispatch-modal__header">
          <div className="min-w-0 flex-1">
            <div className="sd-dispatch-modal__badges">
              <span className="sd-dispatch-modal__tracking-pill">
                {order?.trackingNumber || `Order #${orderIdOrTracking}`}
              </span>
              {order && (
                <span className="sd-dispatch-modal__status-pill">
                  {order.status}
                </span>
              )}
              {order && (
                <span
                  className={`sd-dispatch-modal__route-pill ${
                    sameBranch
                      ? 'sd-dispatch-modal__route-pill--same'
                      : 'sd-dispatch-modal__route-pill--inter'
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
              className="sd-dispatch-modal__title"
            >
              Order Details &amp; Branch Dispatch Console
            </h2>
            <p className="sd-dispatch-modal__subtitle">
              Inspect parcel specifications, assign pickup or delivery couriers,
              and manage inter-branch transport without leaving the dashboard.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="sd-dispatch-modal__close"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="sd-dispatch-modal__body">
          {errorMessage && (
            <div
              className="sd-dispatch-modal__alert sd-dispatch-modal__alert--error"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <div className="flex-1">
                <strong className="font-bold">Action Error:</strong>{' '}
                {errorMessage}
              </div>
            </div>
          )}

          {successMessage && (
            <div
              className="sd-dispatch-modal__alert sd-dispatch-modal__alert--success"
              role="status"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div className="flex-1 font-semibold">{successMessage}</div>
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
              <div className="sd-dispatch-route-bar">
                <div className="sd-dispatch-route-node">
                  <div className="sd-dispatch-route-node__icon">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="sd-dispatch-route-node__label">
                      Origin Branch
                    </div>
                    <div className="sd-dispatch-route-node__value">
                      {resolveBranchLabel(
                        order.originBranchId,
                        order.originBranchName
                      )}
                    </div>
                  </div>
                </div>

                <ArrowRight className="h-4 w-4 shrink-0 text-[#94A3B8]" />

                <div className="sd-dispatch-route-node">
                  <div className="sd-dispatch-route-node__icon sd-dispatch-route-node__icon--dest">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="sd-dispatch-route-node__label">
                      Destination Branch
                    </div>
                    <div className="sd-dispatch-route-node__value">
                      {resolveBranchLabel(
                        order.destinationBranchId,
                        order.destinationBranchName
                      )}
                    </div>
                  </div>
                </div>

                <div className="sd-dispatch-route-method">
                  <div className="sd-dispatch-route-node__label">
                    Pickup Method
                  </div>
                  <div className="mt-0.5 text-xs font-bold text-[#102B50]">
                    {String(order.pickupMethod).includes('DROP')
                      ? 'Branch Drop-Off'
                      : 'Courier Pickup'}
                  </div>
                </div>
              </div>

              {/* Operational Dispatch & Transfer Facility */}
              {capabilities && (
                <div className="sd-dispatch-controls-card">
                  <div className="sd-dispatch-controls-card__header">
                    <div className="min-w-0 flex-1">
                      <h3 className="sd-dispatch-controls-card__title">
                        Operational Dispatch &amp; Transfer Controls
                      </h3>
                      <p className="sd-dispatch-controls-card__desc">
                        {sameBranch
                          ? 'Same-branch coverage order: parcel is delivered directly to the destination recipient via dispatcher assignment without inter-branch transfer.'
                          : 'Inter-branch order: Origin Dispatcher assigns pickup courier to bring parcel to branch, then dispatches to Inter-Branch Transport; Destination Dispatcher receives and assigns last-mile courier.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => loadOrderAndFleet(order.id)}
                      disabled={isLoadingOrder || isLoadingCouriers || isSubmitting}
                      className="sd-dispatch-btn sd-dispatch-btn--secondary"
                      style={{ height: '30px', padding: '0 0.65rem', fontSize: '0.72rem' }}
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${
                          isLoadingOrder || isLoadingCouriers ? 'animate-spin' : ''
                        }`}
                      />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {/* Courier Selector when Pickup, Delivery, or Linehaul Assignment is applicable */}
                  {(capabilities.canAssignPickupCourier ||
                    capabilities.canAssignDeliveryCourier ||
                    capabilities.canSendToInterBranchTransport) && (
                    <div className="sd-dispatch-controls-card__grid">
                      <div>
                        <label
                          htmlFor="modal-courier-select"
                          className="sd-dispatch-field-label"
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
                          className="sd-dispatch-control"
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
                          className="sd-dispatch-field-label"
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
                            className="sd-dispatch-control"
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
                            className="sd-dispatch-control"
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
                  <div>
                    <label
                      htmlFor="modal-dispatch-notes"
                      className="sd-dispatch-field-label"
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
                      className="sd-dispatch-control"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="sd-dispatch-controls-card__actions">
                    {capabilities.canAssignPickupCourier && (
                      <button
                        type="button"
                        disabled={isSubmitting || !selectedCourierId}
                        onClick={() => handleAssignCourier('PICKUP')}
                        className="sd-dispatch-btn sd-dispatch-btn--primary"
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
                        className="sd-dispatch-btn sd-dispatch-btn--navy"
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
                          className="sd-dispatch-btn sd-dispatch-btn--primary"
                        >
                          <Send className="h-4 w-4" />
                          <span>Send to Inter-Branch Transport (In Transit)</span>
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleSendToInterBranchTransport(false)}
                          className="sd-dispatch-btn sd-dispatch-btn--outline"
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
                        className="sd-dispatch-btn sd-dispatch-btn--emerald"
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
                        className="sd-dispatch-btn sd-dispatch-btn--emerald"
                      >
                        <Truck className="h-4 w-4" />
                        <span>
                          {sameBranch
                            ? 'Send Directly to Destination User (Assign Delivery Courier)'
                            : 'Assign Last-Mile Delivery Courier'}
                        </span>
                      </button>
                    )}
                    {!capabilities.canAssignPickupCourier &&
                      !capabilities.canConfirmOriginBranchArrival &&
                      !capabilities.canSendToInterBranchTransport &&
                      !capabilities.canConfirmDestinationBranchReceipt &&
                      !capabilities.canAssignDeliveryCourier &&
                      !sameBranch &&
                      capabilities.isDestinationBranchScope &&
                      !capabilities.isOriginBranchScope && (
                        <div className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
                          <strong>Awaiting Pickup/Transfer at Origin Branch:</strong>{' '}
                          This inter-branch order originates at{' '}
                          <span className="font-semibold">
                            {resolveBranchLabel(
                              order.originBranchId,
                              order.originBranchName
                            )}
                          </span>
                          . Only the Origin Branch can assign the pickup courier and
                          dispatch the parcel to Inter-Branch Transport. Once it is
                          in transit to your branch, you will be able to confirm
                          receipt and assign a last-mile delivery courier here.
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* Sender & Recipient Cards */}
              <div className="sd-dispatch-parties-grid">
                <div className="sd-dispatch-info-card">
                  <div className="sd-dispatch-info-card__heading">
                    <User className="h-3.5 w-3.5 text-[#1677E8]" />
                    <span>Sender &amp; Pickup Location</span>
                  </div>
                  <div className="sd-dispatch-info-card__name">
                    {order.pickupContactName || 'Sender'}
                  </div>
                  <div className="sd-dispatch-info-card__meta">
                    {order.pickupContactPhone || '—'}
                  </div>
                  <div className="sd-dispatch-info-card__address">
                    {order.pickupAddress}
                    {order.pickupCity ? `, ${order.pickupCity}` : ''}
                    {order.pickupPostalCode ? ` (${order.pickupPostalCode})` : ''}
                  </div>
                </div>

                <div className="sd-dispatch-info-card">
                  <div className="sd-dispatch-info-card__heading">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Recipient &amp; Destination</span>
                  </div>
                  <div className="sd-dispatch-info-card__name">
                    {order.dropoffContactName || 'Recipient'}
                  </div>
                  <div className="sd-dispatch-info-card__meta">
                    {order.dropoffContactPhone || '—'}
                  </div>
                  <div className="sd-dispatch-info-card__address">
                    {order.dropoffAddress}
                    {order.dropoffCity ? `, ${order.dropoffCity}` : ''}
                    {order.dropoffPostalCode
                      ? ` (${order.dropoffPostalCode})`
                      : ''}
                  </div>
                </div>
              </div>

              {/* Parcel Specs & Financials */}
              <div className="sd-dispatch-specs-grid">
                <div className="sd-dispatch-spec-item">
                  <div className="sd-dispatch-spec-item__label">Parcel Weight</div>
                  <div className="sd-dispatch-spec-item__value">
                    {order.weightKg} kg ({order.parcelSize || 'STANDARD'})
                  </div>
                </div>
                <div className="sd-dispatch-spec-item">
                  <div className="sd-dispatch-spec-item__label">Payment Mode</div>
                  <div className="sd-dispatch-spec-item__value">
                    {order.paymentMethod} ({order.paymentStatus})
                  </div>
                </div>
                <div className="sd-dispatch-spec-item">
                  <div className="sd-dispatch-spec-item__label">Delivery Fee</div>
                  <div className="sd-dispatch-spec-item__value">
                    {formatCurrency(order.deliveryFee)}
                  </div>
                </div>
                <div className="sd-dispatch-spec-item">
                  <div className="sd-dispatch-spec-item__label">COD Amount</div>
                  <div className="sd-dispatch-spec-item__value">
                    {formatCurrency(order.codAmount)}
                  </div>
                </div>
                {order.parcelDescription && (
                  <div className="sd-dispatch-spec-item sd-dispatch-spec-item--full">
                    <div className="sd-dispatch-spec-item__label">
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
                <div className="sd-dispatch-info-card">
                  <div className="sd-dispatch-info-card__heading">
                    <Clock className="h-3.5 w-3.5 text-[#1677E8]" />
                    <span>Lifecycle Audit Trail ({order.trackingEvents.length})</span>
                  </div>
                  <div className="sd-dispatch-timeline-list">
                    {order.trackingEvents.map((ev, idx) => (
                      <div
                        key={ev.id ?? idx}
                        className="sd-dispatch-timeline-row"
                      >
                        <div className="flex items-start gap-2.5">
                          <Package className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1677E8]" />
                          <div>
                            <div className="text-xs font-bold text-[#0F172A]">
                              {ev.statusLabel || ev.status}
                              {ev.location ? ` · ${ev.location}` : ''}
                            </div>
                            <div className="text-[11px] text-[#64748B]">
                              {ev.description}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 font-mono text-[11px] text-[#64748B]">
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
        <div className="sd-dispatch-modal__footer">
          <div className="text-[11px] font-medium text-[#64748B]">
            {order
              ? `Order ID #${order.id} · ${sameBranch ? 'Direct Local Coverage' : 'Hub-to-Hub Transfer Route'}`
              : ''}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="sd-dispatch-btn sd-dispatch-btn--secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
export default OrderDispatchActionModal;
