export type CourierStatus = 'AVAILABLE' | 'BUSY' | 'ON_BREAK' | 'OFFLINE';
export type VehicleType = 'Motorcycle' | 'Van' | 'Bicycle';

export interface CourierProfile {
  id: string;
  courierCode: string;
  name: string;
  phone: string;
  email: string;
  status: CourierStatus;
  vehicleType: VehicleType;
  vehiclePlate: string;
  zone: string;
  activeDeliveries: number;
  maxCapacity: number;
  completedToday: number;
  totalCompletedLifetime: number;
  rating: number; // e.g. 4.9
  shiftStart: string;
  lastActive: string;
}

export interface CourierFleetSummaryMetrics {
  totalFleet: number;
  available: number;
  busy: number;
  onBreak: number;
  offline: number;
}

