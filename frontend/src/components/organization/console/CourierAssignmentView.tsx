'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Info,
  Package,
  RefreshCw,
  Truck,
  X,
} from 'lucide-react';
import {
  useBranchDeliveryForAssignment,
  useConfirmBranchCourierAssignment,
  useEligibleBranchCouriers,
} from '@/hooks/api/use-organization';
import {
  isBranchDashboardPreviewActive,
  MOCK_DELIVERY_QUEUE,
  MOCK_ELIGIBLE_COURIERS,
} from '@/api/mock/branch-dashboard.mock';
import type {
  BranchDeliveryRequestItem,
  EligibleBranchCourierItem,
} from '@/types/organization.types';

function formatAvailabilityLabel(
  availability: EligibleBranchCourierItem['availability']
): string {
  switch (availability) {
    case 'AVAILABLE':
      return 'Available';
    case 'BUSY':
      return 'Busy';
    case 'OFFLINE':
      return 'Offline';
    default:
      return availability;
  }
}

/**
 * Screen 29 — Branch Console / Courier Assignment
 * Member 04 — Branch Console UI Implementation
 *
 * Strictly adheres to team boundaries:
 * - Does NOT calculate courier eligibility, distance, or automatic assignment on the frontend.
 * - Never fabricates sample couriers (Kasun Perera, Nimal Silva, Tharindu Jay) or delivery details.
 * - Never simulates a fake successful courier assignment.
 */
export default function CourierAssignmentView() {
  const searchParams = useSearchParams();
  const deliveryIdParam = searchParams.get('deliveryId')?.trim() || '';
  const branchIdParam = searchParams.get('branchId');
  const branchId =
    branchIdParam && !Number.isNaN(Number(branchIdParam))
      ? Number(branchIdParam)
      : undefined;

  const {
    data: deliveryData,
    isLoading: isLoadingDelivery,
    error: rawDeliveryError,
    refetch: refetchDelivery,
  } = useBranchDeliveryForAssignment(deliveryIdParam, branchId);

  const {
    data: eligibleCouriers = [],
    isLoading: isLoadingCouriers,
    error: rawCouriersError,
    refetch: refetchCouriers,
  } = useEligibleBranchCouriers(deliveryIdParam, branchId);

  const assignMutation = useConfirmBranchCourierAssignment();

  const isPreview = isBranchDashboardPreviewActive();

  const delivery = useMemo(() => {
    if (deliveryData) return deliveryData;
    if (isPreview) {
      const match = MOCK_DELIVERY_QUEUE.find(
        (d) => d.orderCode === deliveryIdParam || d.id === deliveryIdParam
      );
      return match ?? MOCK_DELIVERY_QUEUE[0];
    }
    return null;
  }, [deliveryData, isPreview, deliveryIdParam]);

  const effectiveEligibleCouriers = useMemo(() => {
    if (eligibleCouriers.length > 0) return eligibleCouriers;
    if (isPreview) return MOCK_ELIGIBLE_COURIERS;
    return eligibleCouriers;
  }, [eligibleCouriers, isPreview]);

  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);
  const [assignmentNote, setAssignmentNote] = useState<string>('');

  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const isLoading = !isPreview && Boolean(deliveryIdParam) && (isLoadingDelivery || isLoadingCouriers);
  const isSubmitting = assignMutation.isPending;

  const deliveryError = isPreview
    ? null
    : rawDeliveryError
      ? rawDeliveryError instanceof Error
        ? rawDeliveryError.message
        : 'Delivery summary endpoint is not yet available from the backend.'
      : null;

  const couriersError = isPreview
    ? null
    : rawCouriersError
      ? rawCouriersError instanceof Error
        ? rawCouriersError.message
        : 'Eligible couriers endpoint is not yet available from the backend.'
      : null;

  useEffect(() => {
    if (effectiveEligibleCouriers.length > 0 && !selectedCourierId) {
      setSelectedCourierId(effectiveEligibleCouriers[0].id);
    }
  }, [effectiveEligibleCouriers, selectedCourierId]);

  const loadAssignmentContext = useCallback(async () => {
    await Promise.allSettled([refetchDelivery(), refetchCouriers()]);
  }, [refetchDelivery, refetchCouriers]);

  const selectedCourier = useMemo(
    () =>
      effectiveEligibleCouriers.find((c) => c.id === selectedCourierId) ?? null,
    [effectiveEligibleCouriers, selectedCourierId]
  );

  const handleConfirmAssignment = async () => {
    setActionFeedback(null);

    if (isPreview) {
      setActionFeedback({
        type: 'info',
        message:
          'Development Preview Boundary: In preview mode, actual courier assignments and notifications are not modified. Dispatch Service (:8080) processes real assignments once backend integration is live.',
      });
      return;
    }

    if (!deliveryIdParam) {
      setActionFeedback({
        type: 'info',
        message:
          'No delivery request is currently selected. Select an unassigned request from the Delivery Request Queue once the backend queue endpoint is connected.',
      });
      return;
    }

    if (!selectedCourier) {
      setActionFeedback({
        type: 'info',
        message:
          'Courier assignment cannot proceed until the backend returns eligible couriers for this delivery request and a courier is selected.',
      });
      return;
    }

    try {
      await assignMutation.mutateAsync({
        deliveryId: deliveryIdParam,
        branchId,
        courierId: selectedCourier.id,
        assignmentNote,
      });

      setActionFeedback({
        type: 'success',
        message: `Courier ${selectedCourier.name} was assigned to ${deliveryIdParam} and notified.`,
      });
      await loadAssignmentContext();
    } catch (err: unknown) {
      setActionFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Unable to confirm courier assignment with the backend.',
      });
    }
  };

  const backHref = branchId
    ? `/organization/console/requests?branchId=${branchId}`
    : '/organization/console/requests';

  const statusBadgeText = delivery?.assignmentStatus ?? 'UNASSIGNED';

  return (
    <div className="org-page org-console-page">
      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={
            actionFeedback.type === 'success'
              ? 'org-success-banner'
              : 'org-phase-notice'
          }
          role="status"
          aria-live="polite"
        >
          <div className="org-phase-notice__left">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2
                size={16}
                className="org-success-banner__icon"
                aria-hidden="true"
              />
            ) : (
              <Info
                size={16}
                className="org-phase-notice__icon"
                aria-hidden="true"
              />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            type="button"
            className="org-phase-notice__close"
            onClick={() => setActionFeedback(null)}
            aria-label="Dismiss notification"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Screen 29 Page Title & Sub-heading Row */}
      <header className="org-console-header">
        <div className="org-console-header__top">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="org-console-header__page-title">
              Branch Console / Courier Assignment
            </h1>
            {isPreview && (
              <span className="org-dashboard-badge org-dashboard-badge--preview">
                Development Preview
              </span>
            )}
          </div>

          <div className="org-console-header__utility">
            <Link href={backHref} className="org-btn org-btn--secondary">
              <ArrowLeft size={14} aria-hidden="true" />
              <span>Back to queue</span>
            </Link>
            {deliveryIdParam && (
              <button
                type="button"
                className="org-btn org-btn--secondary"
                onClick={loadAssignmentContext}
                disabled={isLoading || isSubmitting}
              >
                <RefreshCw
                  size={14}
                  className={isLoading ? 'org-icon--spinning' : ''}
                  aria-hidden="true"
                />
                <span>Refresh</span>
              </button>
            )}
          </div>
        </div>

        <div className="org-console-header__section-row">
          <h2 className="org-console-header__section-title">
            Assign courier ·{' '}
            {delivery?.orderCode || deliveryIdParam || 'Pending request selection'}
          </h2>

          <span className="org-console-status-pill org-console-status-pill--unassigned">
            {statusBadgeText}
          </span>
        </div>
      </header>

      {/* Screen 29 Two-Column Assignment Layout */}
      <div className="org-console-assign-grid">
        {/* Left Column: Delivery Summary Card + Assignment Note Input */}
        <div className="org-console-assign-left">
          <section
            className="org-console-card"
            aria-labelledby="delivery-summary-heading"
          >
            <div className="org-console-card__header">
              <div>
                <h3
                  id="delivery-summary-heading"
                  className="org-console-card__title"
                >
                  Delivery summary
                </h3>
              </div>
            </div>

            {isLoading ? (
              <div className="org-console-summary-lines" aria-busy="true">
                <div className="org-skeleton org-skeleton--md" />
                <div className="org-skeleton org-skeleton--md" />
                <div className="org-skeleton org-skeleton--sm" />
              </div>
            ) : delivery ? (
              <div className="org-console-summary-lines">
                <p className="org-console-summary-line org-console-summary-line--strong">
                  <strong>Pickup</strong> · {delivery.pickupLocation}
                </p>
                <p className="org-console-summary-line">
                  <span>Drop-off</span> · {delivery.dropoffLocation}
                </p>
                <p className="org-console-summary-line org-console-summary-line--muted">
                  {[
                    delivery.parcelSummary || 'Parcel details pending',
                    delivery.deliveryFeeLabel,
                    delivery.deliveryTypeLabel,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            ) : (
              <div
                className="org-console-inline-unavailable"
                role="status"
              >
                <div className="org-console-inline-unavailable__header">
                  <Package size={16} aria-hidden="true" />
                  <strong>
                    {deliveryIdParam
                      ? `Delivery #${deliveryIdParam} Details Pending Backend`
                      : 'No Delivery Request Selected'}
                  </strong>
                </div>
                <p className="org-console-inline-unavailable__text">
                  {deliveryError ||
                    'Pickup location, drop-off location, parcel size, fee, and delivery type will render here once a branch-routed delivery request is loaded from the backend.'}
                </p>
              </div>
            )}
          </section>

          {/* Assignment Note Field matching Screen 29 */}
          <div className="org-console-note-field">
            <label
              htmlFor="org-assignment-note"
              className="org-console-filter-field__label"
            >
              Assignment note
            </label>
            <input
              id="org-assignment-note"
              type="text"
              className="org-console-input"
              placeholder="Handle with care"
              value={assignmentNote}
              onChange={(e) => setAssignmentNote(e.target.value)}
            />
          </div>
        </div>

        {/* Right Column: Eligible Couriers Card + Confirm Assignment Button */}
        <div className="org-console-assign-right">
          <section
            className="org-console-card"
            aria-labelledby="eligible-couriers-heading"
          >
            <div className="org-console-card__header">
              <div>
                <h3
                  id="eligible-couriers-heading"
                  className="org-console-card__title"
                >
                  Eligible couriers
                </h3>
                <p className="org-console-card__subtitle">
                  Sorted by distance and workload.
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="org-console-list" aria-busy="true">
                {[1, 2, 3].map((skeletonId) => (
                  <div
                    key={skeletonId}
                    className="org-console-row org-console-row--skeleton"
                  >
                    <div className="org-skeleton org-skeleton--lg" />
                  </div>
                ))}
              </div>
            ) : eligibleCouriers.length > 0 ? (
              <>
                <ul
                  className="org-console-list"
                  aria-label="Eligible couriers sorted by distance and workload"
                >
                  {eligibleCouriers.map((courier, idx) => {
                    const isSelected = courier.id === selectedCourier?.id;
                    const isTinted = idx % 2 === 0;

                    return (
                      <li key={courier.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedCourierId(courier.id)}
                          className={`org-console-row org-console-row--interactive${
                            isTinted ? ' org-console-row--tinted' : ''
                          }${
                            isSelected ? ' org-console-row--selected' : ''
                          }`}
                          aria-pressed={isSelected}
                        >
                          <span
                            className={`org-console-row__summary${
                              isSelected
                                ? ' org-console-row__summary--strong'
                                : ''
                            }`}
                          >
                            <span>{courier.name}</span>
                            <span
                              className="org-console-row__sep"
                              aria-hidden="true"
                            >
                              ·
                            </span>
                            <span>{courier.distanceKm.toFixed(1)} km</span>
                            <span
                              className="org-console-row__sep"
                              aria-hidden="true"
                            >
                              ·
                            </span>
                            <span>
                              {courier.activeJobs}{' '}
                              {courier.activeJobs === 1
                                ? 'active job'
                                : 'active jobs'}
                            </span>
                            <span
                              className="org-console-row__sep"
                              aria-hidden="true"
                            >
                              ·
                            </span>
                            <span>
                              {formatAvailabilityLabel(courier.availability)}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {selectedCourier && (
                  <div className="org-console-selected-courier">
                    <span className="org-console-selected-pill">
                      SELECTED · {selectedCourier.name.toUpperCase()}
                    </span>
                    <p className="org-console-selected-meta">
                      {[
                        selectedCourier.vehicleType,
                        selectedCourier.rating !== undefined
                          ? `Rating ${selectedCourier.rating.toFixed(1)}`
                          : null,
                        selectedCourier.gpsUpdatedLabel,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Eligible branch courier selected'}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div
                className="org-console-inline-unavailable"
                role="status"
              >
                <div className="org-console-inline-unavailable__header">
                  {couriersError ? (
                    <AlertCircle size={16} aria-hidden="true" />
                  ) : (
                    <Truck size={16} aria-hidden="true" />
                  )}
                  <strong>
                    {couriersError
                      ? 'Eligible Couriers Endpoint Pending'
                      : 'No Eligible Couriers Returned'}
                  </strong>
                </div>
                <p className="org-console-inline-unavailable__text">
                  {couriersError ||
                    'Courier eligibility, distance sorting, and workload evaluation are computed by the backend. Select an active delivery request once the backend eligibility endpoint is connected.'}
                </p>
                <div className="org-dashboard-contract-note">
                  <Info
                    size={15}
                    className="org-dashboard-contract-note__icon"
                    aria-hidden="true"
                  />
                  <span>
                    <strong>Team Boundary Enforced:</strong> Frontend does not
                    compute courier eligibility or fabricate courier records.
                    Awaiting{' '}
                    <code>
                      GET /api/v1/organization/branches/&#123;branchId&#125;/delivery-requests/&#123;deliveryId&#125;/eligible-couriers
                    </code>
                    .
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* Green Primary Action Button matching Screen 29 */}
          <div className="org-console-assign-footer">
            <button
              type="button"
              className="org-btn org-btn--confirm-green"
              onClick={handleConfirmAssignment}
              disabled={isSubmitting}
            >
              <span>
                {isSubmitting
                  ? 'Confirming assignment...'
                  : 'Confirm assignment and notify courier'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

