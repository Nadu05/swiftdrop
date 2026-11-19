import type { UnassignedDelivery } from './types.ts';

export interface AssignDialogPresentation {
  title: string;
  subtitle: string;
  locationLabel: string;
  locationValue: string;
}

export function resolveAssignDialogPresentation(
  order: UnassignedDelivery
): AssignDialogPresentation {
  const isPickup = order.taskType === 'PICKUP' || Boolean(order.pickupTaskId && !order.deliveryJobId);

  if (isPickup) {
    const pickupAddr =
      order.pickupAddress && order.pickupAddress !== '—'
        ? order.pickupAddress
        : order.deliveryAddress;
    return {
      title: 'Assign Pickup Courier',
      subtitle: 'Select an eligible courier to collect this parcel from the sender.',
      locationLabel: 'Pickup Location',
      locationValue: `${pickupAddr} (${order.city})`,
    };
  }

  return {
    title: 'Assign Courier',
    subtitle: 'Select an eligible courier to dispatch this delivery.',
    locationLabel: 'Destination',
    locationValue: `${order.deliveryAddress} (${order.city})`,
  };
}
