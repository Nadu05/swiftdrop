import { getAssignments } from '../assignments/assignmentsApi';
import type { ActiveDeliveryRecord, ActiveDeliverySummaryMetrics } from './types';
import { isActiveStatus } from './types';

/**
 * Service abstraction for Active Deliveries.
 * Reuses the agreed backend endpoint: GET /api/v1/dispatch/assignments
 * Filters strictly for active delivery statuses (ASSIGNED, ACCEPTED, IN_TRANSIT)
 * and calculates all summary metrics from the same underlying dataset.
 */
export async function getActiveDeliveries(): Promise<{
  deliveries: ActiveDeliveryRecord[];
  metrics: ActiveDeliverySummaryMetrics;
}> {
  const allAssignments = await getAssignments();

  // Filter strictly for active delivery statuses
  const activeList: ActiveDeliveryRecord[] = allAssignments.filter((a): a is ActiveDeliveryRecord =>
    isActiveStatus(a.deliveryStatus)
  );

  // Calculate metrics consistently from the active dataset
  const assigned = activeList.filter((a) => a.deliveryStatus === 'ASSIGNED').length;
  const accepted = activeList.filter((a) => a.deliveryStatus === 'ACCEPTED').length;
  const inTransit = activeList.filter((a) => a.deliveryStatus === 'IN_TRANSIT').length;

  const metrics: ActiveDeliverySummaryMetrics = {
    totalActive: activeList.length,
    assigned,
    accepted,
    inTransit,
  };

  return {
    deliveries: activeList,
    metrics,
  };
}

