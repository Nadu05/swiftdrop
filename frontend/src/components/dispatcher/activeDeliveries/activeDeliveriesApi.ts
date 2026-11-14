import { getAssignments } from '../assignments/assignmentsApi';
import {
  isActiveStatus,
  type ActiveDeliveryRecord,
  type ActiveDeliverySummaryMetrics,
} from './types';

export async function getActiveDeliveries(): Promise<{
  deliveries: ActiveDeliveryRecord[];
  metrics: ActiveDeliverySummaryMetrics;
}> {
  const allAssignments = await getAssignments();

  const activeDeliveries = allAssignments.filter((record): record is ActiveDeliveryRecord =>
    isActiveStatus(record.deliveryStatus)
  );

  const assigned = activeDeliveries.filter((d) => d.deliveryStatus === 'ASSIGNED').length;
  const accepted = activeDeliveries.filter((d) => d.deliveryStatus === 'ACCEPTED').length;
  const inTransit = activeDeliveries.filter((d) => d.deliveryStatus === 'IN_TRANSIT').length;

  return {
    deliveries: activeDeliveries,
    metrics: {
      totalActive: activeDeliveries.length,
      assigned,
      accepted,
      inTransit,
    },
  };
}
