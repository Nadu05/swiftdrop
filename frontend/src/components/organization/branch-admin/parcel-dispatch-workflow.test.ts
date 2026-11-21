import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveParcelModalCapabilities,
  classifyOrderForBranchIncomingFlow,
  resolveEffectiveDispatcherBranchId,
  shouldIncludeOrderInOriginPickupQueue,
  shouldIncludeOrderInLastMileDeliveryQueue,
  resolveFleetQueryBranchId,
} from './parcel-dispatch-workflow.ts';

test('Inter-branch CONFIRMED order (Hub #3 -> Hub #5) shows as AWAITING_BRANCH_RECEIPT at Origin Hub #3 with Assign Pickup Courier capability, and ARRIVING_FROM_OTHER_BRANCHES at Destination Hub #5', () => {
  const interBranchConfirmed = {
    id: 2,
    trackingNumber: 'SD-52711',
    status: 'CONFIRMED',
    pickupMethod: 'COURIER_PICKUP',
    originBranchId: 3,
    destinationBranchId: 5,
    sameBranch: false,
  };

  // At Origin Branch (Hub #3): dispatcher sees it immediately awaiting pickup to branch
  const originClassification = classifyOrderForBranchIncomingFlow(interBranchConfirmed, 3);
  assert.ok(originClassification);
  assert.equal(originClassification.stageCode, 'AWAITING_BRANCH_RECEIPT');

  const originCaps = resolveParcelModalCapabilities(interBranchConfirmed, 3);
  assert.equal(originCaps.isSameBranch, false);
  assert.equal(originCaps.canAssignPickupCourier, true);
  assert.equal(originCaps.canSendToInterBranchTransport, false);
  assert.equal(originCaps.canAssignDeliveryCourier, false);

  // At Destination Branch (Hub #5): still at origin branch, so it is classified under ARRIVING_FROM_OTHER_BRANCHES (not prematurely AWAITING_BRANCH_RECEIPT)
  const destClassification = classifyOrderForBranchIncomingFlow(interBranchConfirmed, 5);
  assert.ok(destClassification);
  assert.equal(destClassification.stageCode, 'ARRIVING_FROM_OTHER_BRANCHES');
});

test('Inter-branch order at AT_ORIGIN_BRANCH enables Send to Inter-Branch Transport at Origin Hub #3', () => {
  const atOriginOrder = {
    id: 2,
    trackingNumber: 'SD-52711',
    status: 'AT_ORIGIN_BRANCH',
    pickupMethod: 'COURIER_PICKUP',
    originBranchId: 3,
    destinationBranchId: 5,
    sameBranch: false,
  };

  const originClassification = classifyOrderForBranchIncomingFlow(atOriginOrder, 3);
  assert.ok(originClassification);
  assert.equal(originClassification.stageCode, 'RECEIVED_BY_BRANCH');

  const originCaps = resolveParcelModalCapabilities(atOriginOrder, 3);
  assert.equal(originCaps.canSendToInterBranchTransport, true);
  assert.equal(originCaps.canAssignPickupCourier, false);
});

test('Same-branch order (Hub #3 -> Hub #3) does NOT use inter-branch transport or require branch arrival before direct delivery to destination user', () => {
  const sameBranchPickedUp = {
    id: 9,
    trackingNumber: 'SD-90001',
    status: 'PICKED_UP',
    pickupMethod: 'COURIER_PICKUP',
    originBranchId: 3,
    destinationBranchId: 3,
    sameBranch: true,
  };

  const caps = resolveParcelModalCapabilities(sameBranchPickedUp, 3);
  assert.equal(caps.isSameBranch, true);
  assert.equal(caps.canConfirmOriginBranchArrival, false);
  assert.equal(caps.canSendToInterBranchTransport, false);
  assert.equal(caps.canAssignDeliveryCourier, true);
});

test('Destination branch (Branch 5) excludes Origin Branch 3 orders from its Pickup Queue and disables Assign Pickup Courier / cross-branch fleet query', () => {
  const interBranchOrderFromBranch3To5 = {
    id: 2,
    trackingNumber: 'SD-52711',
    status: 'CONFIRMED',
    pickupMethod: 'COURIER_PICKUP',
    originBranchId: 3,
    destinationBranchId: 5,
    sameBranch: false,
  };

  const effectiveBranchId = resolveEffectiveDispatcherBranchId({
    userBranchId: null,
    couriers: [{ branchId: 5 }],
  });
  assert.equal(effectiveBranchId, 5);

  // Branch 5 must NOT include Branch 3's pickup order in Branch 5's origin pickup queue
  assert.equal(
    shouldIncludeOrderInOriginPickupQueue(interBranchOrderFromBranch3To5, effectiveBranchId),
    false
  );
  // Branch 3 MUST include its own pickup order in Branch 3's origin pickup queue
  assert.equal(
    shouldIncludeOrderInOriginPickupQueue(interBranchOrderFromBranch3To5, 3),
    true
  );

  // At Destination Branch 5 while order is still CONFIRMED at Branch 3:
  const destCaps = resolveParcelModalCapabilities(interBranchOrderFromBranch3To5, effectiveBranchId);
  assert.equal(destCaps.canAssignPickupCourier, false);
  assert.equal(destCaps.canAssignDeliveryCourier, false);
  assert.equal(destCaps.primaryNextActionLabel, 'Awaiting Pickup/Transfer at Origin Branch');

  // Modal at Branch 5 must NOT query Branch 3's courier fleet (which caused 'Dispatcher scoped to branch 5 cannot query branch 3')
  assert.equal(
    resolveFleetQueryBranchId(interBranchOrderFromBranch3To5, destCaps, effectiveBranchId),
    null
  );

  // Once parcel arrives AT_DESTINATION_BRANCH (Branch 5), Branch 5 can assign delivery courier and query Branch 5's fleet
  const arrivedAtDestOrder = {
    ...interBranchOrderFromBranch3To5,
    status: 'AT_DESTINATION_BRANCH',
  };
  assert.equal(
    shouldIncludeOrderInLastMileDeliveryQueue(arrivedAtDestOrder, effectiveBranchId),
    true
  );
  assert.equal(
    shouldIncludeOrderInLastMileDeliveryQueue(arrivedAtDestOrder, 3),
    false
  );
  const arrivedDestCaps = resolveParcelModalCapabilities(arrivedAtDestOrder, effectiveBranchId);
  assert.equal(arrivedDestCaps.canAssignDeliveryCourier, true);
  assert.equal(
    resolveFleetQueryBranchId(arrivedAtDestOrder, arrivedDestCaps, effectiveBranchId),
    5
  );
});
