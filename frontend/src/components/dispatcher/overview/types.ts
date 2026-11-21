import type { LucideIcon } from 'lucide-react';

export interface StatTrend {
  value: string;
  isPositive: boolean;
  label?: string;
}

export interface StatItem {
  id: string;
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  trend?: StatTrend;
}

export interface DailyActivityData {
  day: string;
  date: string;
  deliveries: number;
}

export interface DeliveryStatusData {
  name: string;
  value: number;
  color: string;
}

export type CourierWorkloadStatus = 'AVAILABLE' | 'BUSY' | 'ON_BREAK' | 'OFFLINE';

export interface CourierWorkloadItem {
  id: string;
  courierCode: string;
  name: string;
  phone: string;
  status: CourierWorkloadStatus;
  activeDeliveries: number;
  completedToday: number;
  maxCapacity: number;
  vehicleType: 'Motorcycle' | 'Van' | 'Bicycle' | string;
  zone: string;
}

