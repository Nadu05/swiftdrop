import { dispatchApi, type CourierProfileDto } from '@/api/services/dispatch.api';
import type {
  CourierAssignmentRecord,
  CourierProfile,
  CourierStatus,
  CourierSummaryMetrics,
  VehicleType,
} from './types';

function normalizeStatus(value?: string): CourierStatus {
  if (value === 'AVAILABLE' || value === 'BUSY' || value === 'ON_BREAK' || value === 'OFFLINE') {
    return value;
  }
  return 'OFFLINE';
}

function normalizeVehicle(value?: string): VehicleType {
  if (value === 'Van' || value === 'Bicycle') return value;
  return 'Motorcycle';
}

function normalizeAssignedOrderStatus(value?: string): CourierAssignmentRecord['status'] {
  if (value === 'IN_TRANSIT' || value === 'In Transit') return 'In Transit';
  if (value === 'DELIVERED' || value === 'Delivered') return 'Delivered';
  return 'Assigned';
}

function normalizePriority(value?: string): CourierAssignmentRecord['priority'] {
  if (value === 'URGENT' || value === 'EXPRESS') return 'URGENT';
  if (value === 'HIGH') return 'HIGH';
  return 'NORMAL';
}

export function mapCourierProfileToFleetRecord(dto: CourierProfileDto): CourierProfile {
  return {
    id: String(dto.id || dto.courierCode),
    courierCode: dto.courierCode || String(dto.id),
    name: dto.name,
    phone: dto.phone || '—',
    email: dto.email || '',
    status: normalizeStatus(dto.status),
    vehicleType: normalizeVehicle(dto.vehicleType),
    vehiclePlate: dto.vehiclePlate || '—',
    zone: dto.zone || dto.branchName || 'Unassigned Zone',
    activeDeliveries: Number(dto.activeDeliveries ?? 0),
    maxCapacity: Number(dto.maxCapacity ?? 8),
    completedToday: Number(dto.completedToday ?? 0),
    totalCompletedLifetime: Number(dto.totalCompletedLifetime ?? 0),
    rating: Number(dto.rating ?? 5),
    shiftStart: dto.shiftStart || '08:00 AM',
    lastActive: dto.lastActive || 'Active',
    assignedOrders: (dto.assignedOrders || []).map((o) => ({
      orderId: String(o.orderId),
      trackingNumber: o.trackingNumber || '—',
      destination: o.dropoffCity || '—',
      priority: normalizePriority(o.priority),
      status: normalizeAssignedOrderStatus(o.status),
      assignedTime: o.merchantName ? `Sender: ${o.merchantName}` : 'Active task',
    })),
  };
}

export function calculateCourierSummaryMetrics(couriers: CourierProfile[]): CourierSummaryMetrics {
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

export async function getCourierProfiles(): Promise<CourierProfile[]> {
  const list = await dispatchApi.getCouriers();
  return list.map(mapCourierProfileToFleetRecord);
}

export async function getCourierSummary(): Promise<CourierSummaryMetrics> {
  const couriers = await getCourierProfiles();
  return calculateCourierSummaryMetrics(couriers);
}
