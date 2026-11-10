import { apiClient } from '@/api/axios-client';
import type { 
  OrderQuoteRequest, 
  OrderQuoteResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  DeliveryOrder,
  PublicTrackingResponse
} from '@/types/order.types';

/**
 * Order Service Domain API Module
 * Member 06 - Customer UI & Booking Experience
 *
 * This module isolates all HTTP communication with the Order Service
 * via the Spring Cloud API Gateway (/api/v1/orders/** and /api/v1/tracking/**).
 */

/**
 * Fetch an authoritative fee quote from the Order Service backend.
 * 
 * Endpoint: POST /api/v1/orders/quote (routed through API Gateway :8080 to Order Service :8083)
 *
 * @param quoteRequest The pickup address, destination, weight, and parcel size
 * @returns OrderQuoteResponse with estimatedFee, currency, and optional breakdown
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
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    if (error.response?.status === 404) {
      throw new Error(
        'The Order Quote Service endpoint (/api/v1/orders/quote) was not found on the backend Gateway.'
      );
    }
    if (error.code === 'ECONNABORTED' || !error.response) {
      throw new Error(
        'Unable to reach the API Gateway or Order Service. Please check that the backend is running at http://localhost:8080.'
      );
    }
    throw new Error(
      'An unexpected error occurred while calculating the delivery fee. Please try again.'
    );
  }
}

/**
 * Confirm booking and create an official delivery order in the Order Service backend.
 * 
 * Endpoint: POST /api/v1/orders (routed through API Gateway :8080 to Order Service :8083)
 *
 * @param orderRequest Complete delivery details (pickup, dropoff, parcel)
 * @returns CreateOrderResponse containing the authoritative tracking number, order ID, and status
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
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    if (error.response?.status === 401) {
      throw new Error('Your session has expired. Please sign in to create a delivery order.');
    }
    if (error.response?.status === 404) {
      throw new Error(
        'The Order Creation endpoint (/api/v1/orders) was not found on the backend Gateway.'
      );
    }
    if (error.code === 'ECONNABORTED' || !error.response) {
      throw new Error(
        'Unable to reach the API Gateway or Order Service. Please check that the backend is running at http://localhost:8080.'
      );
    }
    throw new Error(
      'An unexpected error occurred while creating your delivery booking. Please try again.'
    );
  }
}

/**
 * Fetch all delivery orders belonging to the authenticated customer.
 * 
 * Endpoint: GET /api/v1/orders
 * The backend Order Service automatically filters orders by the authenticated customer's JWT token.
 *
 * @returns List of DeliveryOrder objects
 */
export async function getCustomerOrders(): Promise<DeliveryOrder[]> {
  try {
    const response = await apiClient.get<DeliveryOrder[]>('/api/v1/orders');
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    if (error.response?.status === 401) {
      throw new Error('Your session has expired. Please sign in to view your delivery history.');
    }
    if (error.response?.status === 404) {
      throw new Error('The Orders Service endpoint (/api/v1/orders) was not found on the backend Gateway.');
    }
    if (error.code === 'ECONNABORTED' || !error.response) {
      throw new Error(
        'Unable to reach the API Gateway or Order Service. Please check that the backend is running at http://localhost:8080.'
      );
    }
    throw new Error('An unexpected error occurred while loading your delivery bookings. Please try again.');
  }
}

/**
 * Fetch individual order details by ID (Authenticated/Private).
 * 
 * Endpoint: GET /api/v1/orders/{id}
 *
 * @param id The numeric ID or tracking number of the order
 * @returns The full DeliveryOrder object
 */
export async function getOrderById(id: string | number): Promise<DeliveryOrder> {
  try {
    const response = await apiClient.get<DeliveryOrder>(`/api/v1/orders/${id}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to view this order.');
    }
    if (error.response?.status === 404) {
      throw new Error(`Order #${id} was not found.`);
    }
    if (error.code === 'ECONNABORTED' || !error.response) {
      throw new Error(
        'Unable to reach the API Gateway or Order Service. Please check that the backend is running at http://localhost:8080.'
      );
    }
    throw new Error('An unexpected error occurred while loading the order details. Please try again.');
  }
}

/**
 * Public Parcel Tracking (No login required).
 * 
 * Endpoint: GET /api/v1/tracking/{trackingNumber}
 * (With fallback to /api/v1/orders/tracking/{trackingNumber})
 * 
 * Accessible by anyone without signing in.
 * Returns strictly safe non-sensitive milestone and status data.
 *
 * @param trackingNumber The public tracking number (e.g. TRK-202611-00101)
 * @returns PublicTrackingResponse with safe tracking info
 */
export async function getPublicTracking(
  trackingNumber: string
): Promise<PublicTrackingResponse> {
  const cleanNumber = trackingNumber.trim();
  if (!cleanNumber) {
    throw new Error('Please enter a tracking number.');
  }

  try {
    try {
      const response = await apiClient.get<PublicTrackingResponse>(
        `/api/v1/tracking/${encodeURIComponent(cleanNumber)}`
      );
      return response.data;
    } catch (err: any) {
      // If the gateway maps order service under /api/v1/orders/**
      if (err.response?.status === 404) {
        const fallback = await apiClient.get<PublicTrackingResponse>(
          `/api/v1/orders/tracking/${encodeURIComponent(cleanNumber)}`
        );
        return fallback.data;
      }
      throw err;
    }
  } catch (error: any) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    if (error.response?.status === 404) {
      throw new Error(
        `We couldn't find a parcel with tracking number "${cleanNumber}". Please check the number and try again.`
      );
    }
    if (error.code === 'ECONNABORTED' || !error.response) {
      throw new Error(
        'Unable to retrieve tracking information. Please check your connection and try again.'
      );
    }
    throw new Error(
      'An unexpected error occurred while looking up the parcel. Please try again.'
    );
  }
}
