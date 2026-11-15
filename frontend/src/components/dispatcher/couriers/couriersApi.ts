/**
 * Couriers API abstraction connecting Dispatcher views to backend Dispatch Service.
 *
 * Primary endpoints:
 *   GET /api/v1/dispatch/couriers/availability
 *   GET /api/v1/dispatch/couriers/{id}/availability
 */
import { dispatchRequest } from '../dispatcherApiClient';
import type { CourierProfile, CourierStatus, CourierSummaryMetrics, VehicleType } from './types';

interface BackendCourierAvailability {
  id: number;
  courierCode: string;
  name: string;
  status: string;
  activeDeliveries?: number;
  maxCapacity?: number;
  isEligible?: boolean;
  ineligibilityReason?: string | null;
  phone?: string;
  vehicleType?: string;
  vehiclePlate?: string;
}

function mapCourierProfileDto(dto: BackendCourierAvailability): CourierProfile {
  const normalizedStatus: CourierStatus =
    dto.status === 'BUSY' || dto.status === 'AVAILABLE' || dto.status === 'OFFLINE'
      ? (dto.status as CourierStatus)
      : 'AVAILABLE';

  let vehicleType: VehicleType = 'Motorcycle';
  if (dto.vehicleType) {
    const vt = dto.vehicleType.toUpperCase();
    if (vt === 'VAN') vehicleType = 'Van';
    else if (vt === 'BICYCLE') vehicleType = 'Bicycle';
  }

  return {
    id: String(dto.id),
    courierCode: dto.courierCode,
    name: dto.name,
    phone: dto.phone || '+94 77 123 4567',
    email: `${dto.courierCode.toLowerCase().replace(/[^a-z0-9]/g, '')}@swiftdrop.lk`,
    status: normalizedStatus,
    vehicleType,
    vehiclePlate: dto.vehiclePlate || 'WP BDF-8942',
    zone: 'Colombo Central Hub',
    activeDeliveries: dto.activeDeliveries ?? 0,
    maxCapacity: dto.maxCapacity ?? 8,
    completedToday: 0,
    totalCompletedLifetime: 100,
    rating: 4.9,
    shiftStart: '08:00 AM',
    lastActive: 'Active now',
    assignedOrders: [],
  };
}

/**
 * Calculates summary metrics dynamically using actual courier records.
 */
export function calculateCourierSummaryMetrics(
  couriers: CourierProfile[]
): CourierSummaryMetrics {
  const totalCouriers = couriers.length;
  const availableCouriers = couriers.filter((c) => c.status === 'AVAILABLE').length;
  const couriersOnDelivery = couriers.filter((c) => c.status === 'BUSY').length;
  const unavailableCouriers = couriers.filter(
    (c) => c.status === 'ON_BREAK' || c.status === 'OFFLINE'
  ).length;

  return {
    totalCouriers,
    availableCouriers,
    couriersOnDelivery,
    unavailableCouriers,
  };
}

/**
 * Fetch all couriers and active workloads from the Dispatch Service.
 * Calls GET /api/v1/dispatch/couriers/availability
 */
export async function getCourierProfiles(): Promise<CourierProfile[]> {
  const data = await dispatchRequest<BackendCourierAvailability[]>('/api/v1/dispatch/couriers/availability');
  if (Array.isArray(data)) {
    return data.map(mapCourierProfileDto);
  }
  return [];
}

/**
 * Fetch dynamic summary metrics for all couriers in the fleet.
 */
export async function getCourierSummary(): Promise<CourierSummaryMetrics> {
  const couriers = await getCourierProfiles();
  return calculateCourierSummaryMetrics(couriers);
}
