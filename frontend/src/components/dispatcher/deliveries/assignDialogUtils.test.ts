import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAssignDialogPresentation } from './assignDialogUtils';

test('Pickup task presentation shows Assign Pickup Courier title and Pickup Location with pickupAddress and pickupCity instead of dropoffAddress', () => {
  const pickupOrder = {
    orderId: '2',
    trackingNumber: 'SD-52711',
    pickupTaskId: 2,
    taskCode: 'PKP-10002',
    taskType: 'PICKUP' as const,
    branchId: 3,
    pickupAddress: '45 Chatham Street',
    deliveryAddress: '3fregerb',
    city: 'Colombo 01 - Fort',
    recipientName: 'fvfbdgb',
    recipientPhone: '+94771112222',
    merchantName: 'Nimal Perera (Customer)',
    orderDate: '2026-11-19T10:00:00Z',
    priority: 'NORMAL' as const,
    parcelInfo: {
      weightKg: 0.5,
      packageType: 'charger',
    },
  };

  const presentation = resolveAssignDialogPresentation(pickupOrder);
  assert.equal(presentation.title, 'Assign Pickup Courier');
  assert.equal(presentation.locationLabel, 'Pickup Location');
  assert.equal(presentation.locationValue, '45 Chatham Street (Colombo 01 - Fort)');
});

test('Delivery job presentation shows Assign Courier title and Destination with deliveryAddress and city', () => {
  const deliveryOrder = {
    orderId: '2',
    trackingNumber: 'SD-52711',
    deliveryJobId: 10,
    taskCode: 'DLV-20002',
    taskType: 'DELIVERY' as const,
    branchId: 5,
    pickupAddress: '45 Chatham Street',
    deliveryAddress: '12 Galle Road',
    city: 'Colombo 03',
    recipientName: 'fvfbdgb',
    recipientPhone: '+94771112222',
    merchantName: 'Nimal Perera (Customer)',
    orderDate: '2026-11-19T10:00:00Z',
    priority: 'NORMAL' as const,
    parcelInfo: {
      weightKg: 0.5,
      packageType: 'charger',
    },
  };

  const presentation = resolveAssignDialogPresentation(deliveryOrder);
  assert.equal(presentation.title, 'Assign Courier');
  assert.equal(presentation.locationLabel, 'Destination');
  assert.equal(presentation.locationValue, '12 Galle Road (Colombo 03)');
});
