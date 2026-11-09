import { Package, Clock, Truck, CheckCircle2 } from 'lucide-react';
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

export const initialStatsData: StatItem[] = [
  {
    id: 'total',
    title: 'Total Deliveries',
    value: '1,284',
    description: 'Scheduled for today',
    icon: Package,
    iconColor: '#2563eb',
    iconBg: '#eff6ff',
    trend: {
      value: '+12.5%',
      isPositive: true,
      label: 'vs yesterday',
    },
  },
  {
    id: 'unassigned',
    title: 'Unassigned Deliveries',
    value: '42',
    description: 'Requires courier dispatch',
    icon: Clock,
    iconColor: '#d97706',
    iconBg: '#fffbeb',
    trend: {
      value: '-5.2%',
      isPositive: false,
      label: 'needs attention',
    },
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    value: '318',
    description: 'Currently out on route',
    icon: Truck,
    iconColor: '#0284c7',
    iconBg: '#f0f9ff',
    trend: {
      value: '+8.4%',
      isPositive: true,
      label: 'on track',
    },
  },
  {
    id: 'delivered',
    title: 'Delivered',
    value: '924',
    description: 'Completed successfully',
    icon: CheckCircle2,
    iconColor: '#16a34a',
    iconBg: '#f0fdf4',
    trend: {
      value: '+18.2%',
      isPositive: true,
      label: 'completed',
    },
  },
];

