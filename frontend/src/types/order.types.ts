/**
 * Order, Quotation, Lifecycle & Public Tracking Type Definitions for SwiftDrop
 * Aligned with Order Service Backend (`services/order-service`)
 */

export type ParcelSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE';

export type PickupMethod = 'COURIER_PICKUP' | 'BRANCH_DROPOFF';

export type PaymentMethod = 'PREPAID' | 'COD';

export type PaymentStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'COD_PENDING_COLLECTION'
  | 'COD_COLLECTED'
  | 'FAILED'
  | 'REFUNDED'
  | string;

export type OrderStatus =
  | 'CREATED'
  | 'CONFIRMED'
  | 'PICKUP_ASSIGNED'
  | 'PICKED_UP'
  | 'AT_ORIGIN_BRANCH'
  | 'IN_TRANSIT'
  | 'AT_DESTINATION_BRANCH'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'DELIVERY_FAILED'
  | 'PENDING_DISPATCHER_DECISION'
  | 'RETURN_TO_SENDER'
  | 'RETURNED_TO_SENDER'
  | 'CANCELLED'
  | string;

export interface BranchResolutionInfo {
  branchId: number;
  branchCode: string;
  branchName: string;
  distanceKm?: number;
  eligible: boolean;
}

/**
 * Request payload sent to POST /api/v1/orders/quote
 */
export interface OrderQuoteRequest {
  pickupAddress: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  dropoffAddress: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
  weightKg: number;
  parcelSize: ParcelSize;
}

/**
 * Response received from POST /api/v1/orders/quote
 */
export interface OrderQuoteResponse {
  quoteReference?: string;
  estimatedFee: number;
  currency: string;
  estimatedDistanceKm?: number;
  provisionalPricing?: boolean;
  originBranch?: BranchResolutionInfo;
  destinationBranch?: BranchResolutionInfo;
  sameBranch?: boolean;
  breakdown?: {
    baseFee: number;
    distanceFee?: number;
    weightFee: number;
    sizeSurcharge?: number;
  };
  expiresAt?: string;
}

/**
 * Request payload sent to POST /api/v1/orders
 */
export interface CreateOrderRequest {
  orderSourceType?: 'CUSTOMER' | 'MERCHANT';
  merchantOrganizationId?: string;
  pickupMethod?: PickupMethod;
  paymentMethod?: PaymentMethod;
  codAmount?: number;
  quoteReference?: string;
  paymentConfirmationToken?: string;
  pickupAddress: string;
  pickupCity?: string;
  pickupPostalCode?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  pickupContactName: string;
  pickupContactPhone: string;
  pickupContactEmail?: string;
  dropoffAddress: string;
  dropoffCity?: string;
  dropoffPostalCode?: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
  dropoffContactName: string;
  dropoffContactPhone: string;
  dropoffContactEmail?: string;
  parcelDescription: string;
  parcelSize: ParcelSize;
  weightKg: number;
  fragile?: boolean;
  declaredValue?: number;
  deliveryInstructions?: string;
}

export interface OrderTrackingEventDto {
  id?: number;
  status: OrderStatus;
  statusLabel?: string;
  location?: string;
  description?: string;
  actorRole?: string;
  timestamp?: string;
}

export interface PaymentReferenceDto {
  id?: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryFeeAmount: number;
  codCollectionAmount?: number;
  currency: string;
  gatewayProvider?: string;
  externalTransactionRef?: string;
  verified: boolean;
  verifiedAt?: string;
  createdAt?: string;
}

/**
 * Full Delivery Order representation returned by:
 * POST /api/v1/orders
 * GET /api/v1/orders
 * GET /api/v1/orders/{id}
 */
export interface DeliveryOrder {
  id: number | string;
  trackingNumber: string;
  orderSourceType?: 'CUSTOMER' | 'MERCHANT' | string;
  customerUserId?: string;
  customerEmail?: string;
  merchantOrganizationId?: string;
  pickupMethod?: PickupMethod | string;
  status: OrderStatus;
  statusLabel?: string;
  failedAttemptCount?: number;
  deliveryFee: number;
  baseFee?: number;
  distanceFee?: number;
  weightFee?: number;
  sizeSurcharge?: number;
  currency: string;
  paymentMethod?: PaymentMethod | string;
  paymentStatus?: PaymentStatus;
  codAmount?: number;
  quoteReference?: string;
  pickupAddress: string;
  pickupCity?: string;
  pickupPostalCode?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  pickupContactName?: string;
  pickupContactPhone?: string;
  pickupContactEmail?: string;
  dropoffAddress: string;
  dropoffCity?: string;
  dropoffPostalCode?: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
  dropoffContactName?: string;
  dropoffContactPhone?: string;
  dropoffContactEmail?: string;
  originBranchId?: number;
  originBranchCode?: string;
  originBranchName?: string;
  destinationBranchId?: number;
  destinationBranchCode?: string;
  destinationBranchName?: string;
  sameBranch?: boolean;
  branch?: string;
  distanceKm?: number;
  parcelDescription?: string;
  parcelSize?: ParcelSize;
  weightKg?: number;
  fragile?: boolean;
  declaredValue?: number;
  deliveryInstructions?: string;
  courierId?: string;
  courierName?: string;
  courierVehicle?: string;
  courierPhone?: string;
  recipientConfirmedName?: string;
  signatureReference?: string;
  photoEvidenceUrl?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt?: string;
  message?: string;
  trackingEvents?: OrderTrackingEventDto[];
  paymentReferences?: PaymentReferenceDto[];
}

export type CreateOrderResponse = DeliveryOrder;
export type OrderResponse = DeliveryOrder;

/**
 * Milestone event in a parcel's public delivery lifecycle
 */
export interface PublicTrackingEvent {
  status: OrderStatus;
  statusLabel?: string;
  timestamp?: string;
  location?: string;
  description?: string;
}

/**
 * Safe Public Tracking Response:
 * GET /api/v1/orders/tracking/{trackingNumber} (and /api/v1/tracking/{trackingNumber})
 * Contains strictly safe public data — NO private phone numbers, emails, or internal IDs.
 */
export interface PublicTrackingResponse {
  trackingNumber: string;
  status: OrderStatus;
  statusLabel?: string;
  origin?: string;
  destination?: string;
  parcelCategory?: string;
  branch?: string;
  destinationBranch?: string;
  distanceKm?: number;
  estimatedDelivery?: string;
  updatedAt?: string;
  events?: PublicTrackingEvent[];
}
