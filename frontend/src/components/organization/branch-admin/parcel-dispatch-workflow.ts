export type IncomingStageCode =
  | 'ARRIVING_FROM_OTHER_BRANCHES'
  | 'AWAITING_BRANCH_RECEIPT'
  | 'RECEIVED_BY_BRANCH';

export interface ParcelOrderMinimal {
  id?: number | string;
  trackingNumber: string;
  status?: string | null;
  pickupMethod?: string | null;
  originBranchId?: number | null;
  destinationBranchId?: number | null;
  sameBranch?: boolean | null;
}

export interface IncomingFlowClassification {
  stageCode: IncomingStageCode;
  stageLabel: string;
  isOriginRole: boolean;
  isDestinationRole: boolean;
  isSameBranch: boolean;
}

export interface ParcelModalCapabilities {
  isSameBranch: boolean;
  isOriginBranchScope: boolean;
  isDestinationBranchScope: boolean;
  canAssignPickupCourier: boolean;
  canConfirmOriginBranchArrival: boolean;
  canSendToInterBranchTransport: boolean;
  canConfirmDestinationBranchReceipt: boolean;
  canAssignDeliveryCourier: boolean;
  primaryNextActionLabel: string;
}

export function isSameBranchOrder(order: ParcelOrderMinimal): boolean {
  if (typeof order.sameBranch === 'boolean') {
    return order.sameBranch;
  }
  if (
    order.originBranchId !== null &&
    order.originBranchId !== undefined &&
    order.destinationBranchId !== null &&
    order.destinationBranchId !== undefined
  ) {
    return Number(order.originBranchId) === Number(order.destinationBranchId);
  }
  return false;
}

export function classifyOrderForBranchIncomingFlow(
  order: ParcelOrderMinimal,
  effectiveBranchId: number | null | undefined
): IncomingFlowClassification | null {
  if (!effectiveBranchId) return null;

  const isOrigin = Number(order.originBranchId) === Number(effectiveBranchId);
  const isDest = Number(order.destinationBranchId) === Number(effectiveBranchId);
  if (!isOrigin && !isDest) return null;

  const sameBranch = isSameBranchOrder(order);
  const s = String(order.status || 'CONFIRMED').trim().toUpperCase();

  // 1. Same-branch order (originBranchId === destinationBranchId === effectiveBranchId)
  if (sameBranch && isOrigin) {
    if (['CREATED', 'CONFIRMED', 'PICKUP_ASSIGNED', 'PICKED_UP'].includes(s)) {
      const label =
        s === 'PICKED_UP'
          ? 'Picked Up — Ready for Direct Delivery'
          : s === 'PICKUP_ASSIGNED'
            ? 'Pickup Courier Assigned (Local)'
            : 'Awaiting Local Pickup / Direct Dispatch';
      return {
        stageCode: 'AWAITING_BRANCH_RECEIPT',
        stageLabel: label,
        isOriginRole: true,
        isDestinationRole: true,
        isSameBranch: true,
      };
    }
    return {
      stageCode: 'RECEIVED_BY_BRANCH',
      stageLabel:
        s === 'OUT_FOR_DELIVERY'
          ? 'Out for Local Delivery'
          : s === 'DELIVERED'
            ? 'Delivered (Local Area)'
            : 'Ready for Local Delivery',
      isOriginRole: true,
      isDestinationRole: true,
      isSameBranch: true,
    };
  }

  // 2. Inter-branch order viewed at its Origin Branch (first-mile pickup -> origin hub arrival -> inter-branch transfer)
  if (isOrigin && !sameBranch) {
    if (['CREATED', 'CONFIRMED', 'PICKUP_ASSIGNED', 'PICKED_UP'].includes(s)) {
      const label =
        s === 'PICKED_UP'
          ? 'Picked Up — Awaiting Origin Hub Arrival'
          : s === 'PICKUP_ASSIGNED'
            ? 'Pickup Courier Assigned'
            : 'Awaiting Pickup to Branch';
      return {
        stageCode: 'AWAITING_BRANCH_RECEIPT',
        stageLabel: label,
        isOriginRole: true,
        isDestinationRole: false,
        isSameBranch: false,
      };
    }
    if (s === 'AT_ORIGIN_BRANCH') {
      return {
        stageCode: 'RECEIVED_BY_BRANCH',
        stageLabel: 'Arrived at Origin Branch — Ready for Transfer',
        isOriginRole: true,
        isDestinationRole: false,
        isSameBranch: false,
      };
    }
    // Once IN_TRANSIT / AT_DESTINATION_BRANCH / OUT_FOR_DELIVERY / DELIVERED, it has left the origin branch (tracked in Outgoing)
    return null;
  }

  // 3. Inter-branch order viewed at its Destination Branch
  if (isDest && !sameBranch) {
    if (['AT_DESTINATION_BRANCH', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(s)) {
      return {
        stageCode: 'RECEIVED_BY_BRANCH',
        stageLabel:
          s === 'OUT_FOR_DELIVERY'
            ? 'Out for Last-Mile Delivery'
            : s === 'DELIVERED'
              ? 'Delivered'
              : 'Received by Destination Branch',
        isOriginRole: false,
        isDestinationRole: true,
        isSameBranch: false,
      };
    }
    if (s === 'IN_TRANSIT') {
      return {
        stageCode: 'AWAITING_BRANCH_RECEIPT',
        stageLabel: 'In Transit — Awaiting Destination Branch Receipt',
        isOriginRole: false,
        isDestinationRole: true,
        isSameBranch: false,
      };
    }
    // Still at Origin Branch (CREATED, CONFIRMED, PICKUP_ASSIGNED, PICKED_UP, AT_ORIGIN_BRANCH)
    return {
      stageCode: 'ARRIVING_FROM_OTHER_BRANCHES',
      stageLabel: 'At Origin Branch — Pending Inter-Branch Transfer',
      isOriginRole: false,
      isDestinationRole: true,
      isSameBranch: false,
    };
  }

  return null;
}

export function resolveParcelModalCapabilities(
  order: ParcelOrderMinimal,
  effectiveBranchId?: number | null
): ParcelModalCapabilities {
  const sameBranch = isSameBranchOrder(order);
  const s = String(order.status || 'CONFIRMED').trim().toUpperCase();
  const method = String(order.pickupMethod || 'COURIER_PICKUP').trim().toUpperCase();
  const isDropoff = method === 'BRANCH_DROPOFF' || method === 'BRANCH_DROP_OFF';

  const isOriginBranchScope =
    !effectiveBranchId ||
    !order.originBranchId ||
    Number(order.originBranchId) === Number(effectiveBranchId);

  const isDestinationBranchScope =
    !effectiveBranchId ||
    !order.destinationBranchId ||
    Number(order.destinationBranchId) === Number(effectiveBranchId);

  // 1. Assign Pickup Courier (Origin Branch, Courier Pickup, CREATED/CONFIRMED/PICKUP_ASSIGNED)
  const canAssignPickupCourier =
    isOriginBranchScope &&
    !isDropoff &&
    ['CREATED', 'CONFIRMED', 'PICKUP_ASSIGNED'].includes(s);

  // 2. Confirm Origin Branch Arrival
  // - For BRANCH_DROPOFF: when CREATED or CONFIRMED
  // - For Inter-Branch COURIER_PICKUP (!sameBranch): when PICKUP_ASSIGNED or PICKED_UP (courier brings parcel to origin branch)
  // - Note: Same-branch COURIER_PICKUP orders do NOT arrive at the branch; they go directly to the destination user!
  const canConfirmOriginBranchArrival =
    isOriginBranchScope &&
    ((isDropoff && ['CREATED', 'CONFIRMED'].includes(s)) ||
      (!sameBranch && !isDropoff && ['PICKUP_ASSIGNED', 'PICKED_UP'].includes(s)));

  // 3. Send to Inter-Branch Transport System (Inter-branch only, once parcel has arrived at AT_ORIGIN_BRANCH)
  const canSendToInterBranchTransport =
    !sameBranch && isOriginBranchScope && s === 'AT_ORIGIN_BRANCH';

  // 4. Confirm Destination Branch Receipt (Inter-branch only, when IN_TRANSIT arriving at destination branch)
  const canConfirmDestinationBranchReceipt =
    !sameBranch && isDestinationBranchScope && s === 'IN_TRANSIT';

  // 5. Assign Delivery Courier (Last-Mile / Same-Branch Direct Delivery)
  // - Same-branch: can send directly to destination user when PICKED_UP, AT_ORIGIN_BRANCH, PICKUP_ASSIGNED, or CONFIRMED
  // - Inter-branch: once AT_DESTINATION_BRANCH (or failed attempt retry)
  const canAssignDeliveryCourier =
    isDestinationBranchScope &&
    (sameBranch
      ? ['CONFIRMED', 'PICKUP_ASSIGNED', 'PICKED_UP', 'AT_ORIGIN_BRANCH', 'DELIVERY_FAILED'].includes(s)
      : ['AT_DESTINATION_BRANCH', 'DELIVERY_FAILED'].includes(s));

  let primaryNextActionLabel = 'Inspect Order';
  if (canAssignPickupCourier && s !== 'PICKUP_ASSIGNED') {
    primaryNextActionLabel = 'Assign Pickup Courier';
  } else if (sameBranch && canAssignDeliveryCourier && ['PICKED_UP', 'AT_ORIGIN_BRANCH', 'PICKUP_ASSIGNED'].includes(s)) {
    primaryNextActionLabel = 'Assign Delivery Courier';
  } else if (canConfirmOriginBranchArrival) {
    primaryNextActionLabel = isDropoff ? 'Confirm Branch Drop-Off' : 'Confirm Branch Arrival';
  } else if (canSendToInterBranchTransport) {
    primaryNextActionLabel = 'Send to Inter-Branch Transport';
  } else if (canConfirmDestinationBranchReceipt) {
    primaryNextActionLabel = 'Confirm Destination Receipt';
  } else if (canAssignDeliveryCourier) {
    primaryNextActionLabel = 'Assign Delivery Courier';
  } else if (
    !sameBranch &&
    isDestinationBranchScope &&
    !isOriginBranchScope &&
    ['CREATED', 'CONFIRMED', 'PICKUP_ASSIGNED', 'PICKED_UP', 'AT_ORIGIN_BRANCH'].includes(s)
  ) {
    primaryNextActionLabel = 'Awaiting Pickup/Transfer at Origin Branch';
  }

  return {
    isSameBranch: sameBranch,
    isOriginBranchScope,
    isDestinationBranchScope,
    canAssignPickupCourier,
    canConfirmOriginBranchArrival,
    canSendToInterBranchTransport,
    canConfirmDestinationBranchReceipt,
    canAssignDeliveryCourier,
    primaryNextActionLabel,
  };
}

export function resolveEffectiveDispatcherBranchId(input: {
  userBranchId?: number | null;
  couriers?: Array<{ branchId?: number | null }>;
  pickupTasks?: Array<{ originBranchId?: number | null }>;
  deliveryJobs?: Array<{ branchId?: number | null }>;
}): number | null {
  if (input.userBranchId !== null && input.userBranchId !== undefined && Number(input.userBranchId) > 0) {
    return Number(input.userBranchId);
  }
  const courierBranch = input.couriers?.find((c) => c.branchId != null && Number(c.branchId) > 0)?.branchId;
  if (courierBranch != null) {
    return Number(courierBranch);
  }
  const pickupBranch = input.pickupTasks?.find(
    (t) => t.originBranchId != null && Number(t.originBranchId) > 0
  )?.originBranchId;
  if (pickupBranch != null) {
    return Number(pickupBranch);
  }
  const jobBranch = input.deliveryJobs?.find((j) => j.branchId != null && Number(j.branchId) > 0)?.branchId;
  if (jobBranch != null) {
    return Number(jobBranch);
  }
  return null;
}

export function shouldIncludeOrderInOriginPickupQueue(
  order: ParcelOrderMinimal,
  effectiveBranchId?: number | null
): boolean {
  const s = String(order.status || '').trim().toUpperCase();
  if (!['CREATED', 'CONFIRMED', 'PICKUP_ASSIGNED', 'PICKED_UP', 'AT_ORIGIN_BRANCH'].includes(s)) {
    return false;
  }
  if (effectiveBranchId !== null && effectiveBranchId !== undefined) {
    return (
      order.originBranchId !== null &&
      order.originBranchId !== undefined &&
      Number(order.originBranchId) === Number(effectiveBranchId)
    );
  }
  return true;
}

export function shouldIncludeOrderInLastMileDeliveryQueue(
  order: ParcelOrderMinimal,
  effectiveBranchId?: number | null
): boolean {
  const s = String(order.status || '').trim().toUpperCase();
  const sameBranch = isSameBranchOrder(order);
  const isReadyForLastMile =
    s === 'AT_DESTINATION_BRANCH' ||
    (sameBranch && ['PICKED_UP', 'AT_ORIGIN_BRANCH'].includes(s));

  if (!isReadyForLastMile) {
    return false;
  }
  if (effectiveBranchId !== null && effectiveBranchId !== undefined) {
    const targetDestBranch = order.destinationBranchId ?? order.originBranchId;
    return (
      targetDestBranch !== null &&
      targetDestBranch !== undefined &&
      Number(targetDestBranch) === Number(effectiveBranchId)
    );
  }
  return true;
}

export function resolveFleetQueryBranchId(
  order: ParcelOrderMinimal,
  capabilities: ParcelModalCapabilities,
  effectiveBranchId?: number | null
): number | null {
  const requiresCourierFleet =
    capabilities.canAssignPickupCourier ||
    capabilities.canAssignDeliveryCourier ||
    capabilities.canSendToInterBranchTransport;

  if (!requiresCourierFleet) {
    return null;
  }

  if (effectiveBranchId !== null && effectiveBranchId !== undefined) {
    return Number(effectiveBranchId);
  }

  if (capabilities.canAssignDeliveryCourier) {
    const dest = order.destinationBranchId ?? order.originBranchId;
    return dest != null ? Number(dest) : null;
  }

  const origin = order.originBranchId ?? order.destinationBranchId;
  return origin != null ? Number(origin) : null;
}
