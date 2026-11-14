import {
  dispatchApi,
  type DeliveryJobDto,
  type PickupTaskDto,
} from '@/api/services/dispatch.api';
import { isSameLocalDay } from '@/components/dispatcher/dateUtils';
import type {
  DeliveryPriority,
  DeliverySummaryMetrics,
  UnassignedDelivery,
} from './types';

function normalizePriority(value?: string): DeliveryPriority {
  if (value === 'URGENT' || value === 'EXPRESS') return 'URGENT';
  if (value === 'HIGH') return 'HIGH';
  return 'NORMAL';
}

export function mapDeliveryJobToUnassigned(dto: DeliveryJobDto): UnassignedDelivery {
  const recipientName = dto.recipient?.name || dto.recipientName || 'Recipient';
  const recipientPhone = dto.recipient?.phone || dto.recipientPhone || '—';
  const deliveryAddress = dto.recipient?.address || dto.dropoffAddress || '—';
  const city = dto.recipient?.city || dto.dropoffCity || '—';
  const weightKg = Number(dto.parcelInfo?.weightKg ?? dto.parcel?.weightKg ?? 0);

  return {
    orderId: String(dto.orderId ?? dto.id),
    trackingNumber: dto.trackingNumber,
    deliveryJobId: dto.id,
    taskCode: dto.jobCode,
    taskType: 'DELIVERY',
    branchId: dto.branchId,
    branchCode: dto.branchCode,
    branchName: dto.branchName,
    pickupAddress: dto.pickupAddress,
    recipientName,
    recipientPhone,
    deliveryAddress,
    city,
    merchantName: dto.merchantName || dto.senderName || 'Customer / Merchant',
    merchantContact: dto.senderPhone,
    orderDate: dto.createdAt || dto.assignedAt || new Date().toISOString(),
    priority: normalizePriority(dto.priority),
    parcelInfo: {
      weightKg: Number.isFinite(weightKg) ? weightKg : 0,
      packageType: dto.parcelInfo?.category || dto.parcel?.description || 'Standard Parcel',
      dimensions: dto.parcelInfo?.size || dto.parcel?.size,
      handlingNotes: dto.parcelInfo?.notes || dto.parcel?.notes,
    },
  };
}

export function mapPickupTaskToQueueItem(dto: PickupTaskDto): UnassignedDelivery {
  const weightKg = Number(dto.weightKg ?? 0);
  return {
    orderId: String(dto.orderId),
    trackingNumber: dto.trackingNumber,
    pickupTaskId: dto.id,
    taskCode: dto.taskCode,
    taskType: 'PICKUP',
    pickupMethod: dto.pickupMethod,
    branchId: dto.originBranchId,
    branchCode: dto.originBranchCode,
    branchName: dto.originBranchName,
    pickupAddress: dto.pickupAddress || '—',
    recipientName: dto.recipientName || 'Recipient',
    recipientPhone: dto.recipientPhone || '—',
    deliveryAddress: dto.dropoffAddress || '—',
    city: dto.pickupCity || dto.dropoffCity || '—',
    merchantName: dto.merchantName || dto.senderName || 'Sender',
    merchantContact: dto.senderPhone,
    orderDate: dto.createdAt || new Date().toISOString(),
    priority: normalizePriority(dto.priority),
    parcelInfo: {
      weightKg: Number.isFinite(weightKg) ? weightKg : 0,
      packageType: dto.parcelCategory || 'Courier Pickup',
      dimensions: dto.parcelSize,
      handlingNotes: dto.handlingNotes,
    },
  };
}

export async function getUnassignedDeliveries(): Promise<UnassignedDelivery[]> {
  const list = await dispatchApi.getUnassignedDeliveries();
  return list.map(mapDeliveryJobToUnassigned);
}

export async function getPendingPickupTasks(): Promise<PickupTaskDto[]> {
  return dispatchApi.getPickupTasks();
}

export async function getDeliverySummaryMetrics(): Promise<DeliverySummaryMetrics> {
  const [unassigned, pickupTasks, couriers, assignments] = await Promise.all([
    dispatchApi.getUnassignedDeliveries(),
    dispatchApi.getPickupTasks(),
    dispatchApi.getCouriers(),
    dispatchApi.getAssignments(),
  ]);

  const now = new Date();
  const pendingPickups = pickupTasks.filter(
    (t) => t.status === 'PENDING_ASSIGNMENT'
  ).length;
  const availableCouriers = couriers.filter(
    (c) => c.status !== 'OFFLINE' && c.status !== 'ON_BREAK' && c.activeDeliveries < c.maxCapacity
  ).length;
  const highPriorityDeliveries = unassigned.filter(
    (item) => item.priority === 'URGENT' || item.priority === 'HIGH'
  ).length;
  const assignedToday = assignments.filter((a) =>
    isSameLocalDay(a.assignedAt || a.assignedDate, now)
  ).length;

  return {
    totalUnassigned: unassigned.length,
    availableCouriers,
    highPriorityDeliveries,
    assignedToday,
    pendingPickups,
  };
}
