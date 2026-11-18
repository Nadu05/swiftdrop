import { apiClient } from '@/api/axios-client';
import type {
  OrderQuoteRequest,
  OrderQuoteResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  DeliveryOrder,
  PublicTrackingResponse,
} from '@/types/order.types';

export class OrderApiError extends Error {
  status?: number;
  locationType?: string;
  fieldErrors?: Record<string, string>;

  constructor(
    message: string,
    status?: number,
    locationType?: string,
    fieldErrors?: Record<string, string>
  ) {
    super(message);
    this.name = 'OrderApiError';
    this.status = status;
    this.locationType = locationType;
    this.fieldErrors = fieldErrors;
  }
}

function normalizeOrderApiError(error: any, fallbackMessage: string): OrderApiError {
  const status: number | undefined = error?.response?.status;
  const data = error?.response?.data;

  if (status === 401) {
    return new OrderApiError(
      data?.message || 'Your session has expired. Please sign in again to continue.',
      401
    );
  }

  if (status === 403) {
    return new OrderApiError(
      data?.message || 'You do not have permission to access this delivery order.',
      403
    );
  }

  if (status === 422) {
    return new OrderApiError(
      data?.message ||
        'The specified pickup or destination location is outside active SwiftDrop branch coverage.',
      422,
      data?.locationType
    );
  }

  if (status === 400) {
    const fieldErrors: Record<string, string> | undefined =
      data?.errors && typeof data.errors === 'object' ? data.errors : undefined;
    const firstFieldError = fieldErrors ? Object.values(fieldErrors)[0] : undefined;
    return new OrderApiError(
      firstFieldError || data?.message || 'Please check the entered delivery details and try again.',
      400,
      undefined,
      fieldErrors
    );
  }

  if (status === 404) {
    return new OrderApiError(
      data?.message || 'The requested delivery order or tracking record could not be found.',
      404
    );
  }

  if (status === 503) {
    return new OrderApiError(
      data?.message ||
        'The Order or Organization Service is temporarily unavailable. Please try again shortly.',
      503
    );
  }

  if (data?.message) {
    return new OrderApiError(data.message, status);
  }

  if (error?.code === 'ECONNABORTED' || !error?.response) {
    return new OrderApiError(
      'Unable to reach the SwiftDrop Order Service. Please verify your network connection and backend status.',
      0
    );
  }

  return new OrderApiError(fallbackMessage, status);
}

/**
 * Fetch an authoritative fee quote and dual-coordinate branch resolution from the Order Service.
 * Endpoint: POST /api/v1/orders/quote
 */
export async function getOrderQuote(
  quoteRequest: OrderQuoteRequest
): Promise<OrderQuoteResponse> {
  try {
    const response = await apiClient.post<OrderQuoteResponse>(
      '/api/v1/orders/quote',
      quoteRequest
    );
    return response.data;
  } catch (error: any) {
    throw normalizeOrderApiError(
      error,
      'An unexpected error occurred while calculating the delivery quotation.'
    );
  }
}

/**
 * Create an official delivery order in the Order Service backend.
 * Endpoint: POST /api/v1/orders
 */
export async function createOrder(
  orderRequest: CreateOrderRequest
): Promise<CreateOrderResponse> {
  try {
    const response = await apiClient.post<CreateOrderResponse>(
      '/api/v1/orders',
      orderRequest
    );
    return response.data;
  } catch (error: any) {
    throw normalizeOrderApiError(
      error,
      'Failed to create delivery order. Please verify your booking details and try again.'
    );
  }
}

/**
 * Fetch all delivery orders belonging to the authenticated customer (or role-scoped user).
 * Endpoint: GET /api/v1/orders
 */
export async function getCustomerOrders(statusFilter?: string): Promise<DeliveryOrder[]> {
  try {
    const params = statusFilter && statusFilter !== 'ALL' ? { status: statusFilter } : undefined;
    const response = await apiClient.get<DeliveryOrder[]>('/api/v1/orders', { params });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: any) {
    // If the Order Service endpoint is unauthorized (401), forbidden (403), or not found (404),
    // gracefully return an empty array so customer views render their proper empty state (0 orders)
    // rather than crashing or showing a blocking error screen.
    if (
      error?.response?.status === 401 ||
      error?.response?.status === 403 ||
      error?.response?.status === 404
    ) {
      return [];
    }
    throw normalizeOrderApiError(
      error,
      'We could not load your delivery bookings from the Order Service.'
    );
  }
}

/**
 * Fetch individual order details by ID or tracking number (Authenticated).
 * Endpoint: GET /api/v1/orders/{id}
 */
export async function getOrderById(id: string | number): Promise<DeliveryOrder> {
  const cleanId = String(id).trim();
  if (!cleanId) {
    throw new OrderApiError('A valid order ID or tracking number is required.', 400);
  }

  try {
    const response = await apiClient.get<DeliveryOrder>(
      `/api/v1/orders/${encodeURIComponent(cleanId)}`
    );
    return response.data;
  } catch (error: any) {
    throw normalizeOrderApiError(
      error,
      `Unable to load delivery order "${cleanId}".`
    );
  }
}

/**
 * Public Parcel Tracking (No login required).
 * Endpoint: GET /api/v1/orders/tracking/{trackingNumber} (with fallback to /api/v1/tracking/{trackingNumber})
 * Returns strictly safe non-sensitive milestone and status data.
 */
export async function getPublicTracking(
  trackingNumber: string
): Promise<PublicTrackingResponse> {
  const cleanNumber = trackingNumber.trim();
  if (!cleanNumber) {
    throw new OrderApiError('Please enter a tracking number (e.g. SD-10518).', 400);
  }

  try {
    try {
      const response = await apiClient.get<PublicTrackingResponse>(
        `/api/v1/orders/tracking/${encodeURIComponent(cleanNumber)}`
      );
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        const fallback = await apiClient.get<PublicTrackingResponse>(
          `/api/v1/tracking/${encodeURIComponent(cleanNumber)}`
        );
        return fallback.data;
      }
      throw err;
    }
  } catch (error: any) {
    if (error?.response?.status === 404) {
      throw new OrderApiError(
        error?.response?.data?.message ||
          `We couldn't find a parcel with tracking number "${cleanNumber.toUpperCase()}". Please check the number and try again.`,
        404
      );
    }
    throw normalizeOrderApiError(
      error,
      'Unable to retrieve tracking information. Please check your connection and try again.'
    );
  }
}

/**
 * Confirm a PREPAID online payment reference for an order.
 * Endpoint: POST /api/v1/orders/{id}/payment/confirm
 */
export async function confirmOrderPrepaidPayment(
  id: string | number,
  externalTransactionRef: string,
  notes?: string
): Promise<DeliveryOrder> {
  try {
    const response = await apiClient.post<DeliveryOrder>(
      `/api/v1/orders/${encodeURIComponent(String(id))}/payment/confirm`,
      { externalTransactionRef, notes }
    );
    return response.data;
  } catch (error: any) {
    throw normalizeOrderApiError(
      error,
      'Unable to verify and confirm the prepaid payment reference.'
    );
  }
}

/**
 * Cancel a delivery order before pickup.
 * Endpoint: POST /api/v1/orders/{id}/cancel
 */
export async function cancelCustomerOrder(
  id: string | number,
  reason?: string
): Promise<DeliveryOrder> {
  try {
    const response = await apiClient.post<DeliveryOrder>(
      `/api/v1/orders/${encodeURIComponent(String(id))}/cancel`,
      { reason }
    );
    return response.data;
  } catch (error: any) {
    throw normalizeOrderApiError(error, 'Unable to cancel this delivery order.');
  }
}
