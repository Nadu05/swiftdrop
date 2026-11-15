/**
 * Deliveries API abstraction connecting Dispatcher views to backend Dispatch Service.
 *
 * Primary endpoint:
 *   GET /api/v1/dispatch/unassigned
 */
import { dispatchRequest } from '../dispatcherApiClient';
import type { DeliveryPriority, DeliverySummaryMetrics, UnassignedDelivery } from './types';

interface BackendParcelInfo {
  weightKg?: number;
  packageType?: string;
  dimensions?: string;
  handlingNotes?: string;
}

interface BackendUnassignedDelivery {
  orderId: number;
  orderNumber?: string;
  trackingNumber?: string;
  recipientName?: string;
  recipientPhone?: string;
  deliveryAddress?: string;
  city?: string;
  merchantName?: string;
  merchantContact?: string;
  orderDate?: string;
  priority?: string;
  parcelInfo?: BackendParcelInfo;
}

function mapUnassignedDeliveryDto(dto: BackendUnassignedDelivery): UnassignedDelivery {
  return {
    orderId: String(dto.orderId ?? dto.orderNumber ?? 'ORD-0'),
    recipientName: dto.recipientName || 'Customer',
    recipientPhone: dto.recipientPhone || 'N/A',
    deliveryAddress: dto.deliveryAddress || 'Address on file',
    city: dto.city || 'Colombo',
    merchantName: dto.merchantName || 'Merchant',
    merchantContact: dto.merchantContact || undefined,
    orderDate: dto.orderDate ? new Date(dto.orderDate).toISOString() : new Date().toISOString(),
    priority: (dto.priority?.toUpperCase() as DeliveryPriority) || 'NORMAL',
    parcelInfo: {
      weightKg: dto.parcelInfo?.weightKg ?? 1.0,
      packageType: dto.parcelInfo?.packageType ?? 'Standard Package',
      dimensions: dto.parcelInfo?.dimensions ?? 'Standard size',
      handlingNotes: dto.parcelInfo?.handlingNotes ?? undefined,
    },
  };
}

/**
 * Retrieve unassigned deliveries from the Dispatch Service.
 * Calls GET /api/v1/dispatch/unassigned
 */
export async function getUnassignedDeliveries(): Promise<UnassignedDelivery[]> {
  try {
    const data = await dispatchRequest<BackendUnassignedDelivery[]>('/api/v1/dispatch/unassigned');
    if (Array.isArray(data)) {
      return data.map(mapUnassignedDeliveryDto);
    }
    return [];
  } catch (error) {
    console.warn('Backend /api/v1/dispatch/unassigned unreachable or returned error:', error);
    return [];
  }
}

/**
 * Calculate dynamic delivery summary metrics from live backend data.
 * Aggregates unassigned deliveries, courier availability, and assigned counts.
 */
export async function getDeliverySummaryMetrics(): Promise<DeliverySummaryMetrics> {
  const [deliveries, couriers, assignments] = await Promise.all([
    getUnassignedDeliveries().catch(() => [] as UnassignedDelivery[]),
    dispatchRequest<any[]>('/api/v1/dispatch/couriers/availability').catch(() => []),
    dispatchRequest<any[]>('/api/v1/dispatch/assignments').catch(() => []),
  ]);

  const highPriority = deliveries.filter(
    (item) => item.priority === 'URGENT' || item.priority === 'HIGH'
  ).length;

  const availableCouriers = Array.isArray(couriers)
    ? couriers.filter(
        (c: any) => c.status === 'AVAILABLE' && (c.activeDeliveries ?? 0) < (c.maxCapacity ?? 10)
      ).length
    : 0;

  const assignedCount = Array.isArray(assignments) ? assignments.length : 0;

  return {
    totalUnassigned: deliveries.length,
    availableCouriers,
    highPriorityDeliveries: highPriority,
    assignedToday: assignedCount,
  };
}
