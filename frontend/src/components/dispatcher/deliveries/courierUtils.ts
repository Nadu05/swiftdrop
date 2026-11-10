import type { CourierAvailability } from './types';

/**
 * Workload thresholds (active deliveries). Provisional demo values —
 * replace with the backend's business rules once they are defined.
 */
export const WORKLOAD_THRESHOLDS = {
  moderateFrom: 4,
  highFrom: 7,
} as const;

export type WorkloadLevel = 'low' | 'moderate' | 'high';

export const WORKLOAD_LABELS: Record<WorkloadLevel, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
};

export function getWorkloadLevel(
  activeDeliveries: number,
  thresholds: { moderateFrom: number; highFrom: number } = WORKLOAD_THRESHOLDS,
): WorkloadLevel {
  if (activeDeliveries >= thresholds.highFrom) return 'high';
  if (activeDeliveries >= thresholds.moderateFrom) return 'moderate';
  return 'low';
}

export function getWorkloadPercent(activeDeliveries: number, maxCapacity: number): number {
  if (maxCapacity <= 0) return 100;
  return Math.min(100, Math.round((activeDeliveries / maxCapacity) * 100));
}

/** Only couriers that are both AVAILABLE and eligible for the order may be selected. */
export function isCourierSelectable(courier: CourierAvailability): boolean {
  return courier.status === 'AVAILABLE' && courier.isEligible;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

