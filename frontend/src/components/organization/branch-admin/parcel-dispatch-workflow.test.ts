import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveParcelModalCapabilities,
  classifyOrderForBranchIncomingFlow,
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
