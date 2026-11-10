import { apiClient } from '@/api/axios-client';
import type { 
  OrderQuoteRequest, 
  OrderQuoteResponse,
  CreateOrderRequest,
  CreateOrderResponse
} from '@/types/order.types';

/**
 * Order Service Domain API Module
 * Member 06 - Customer UI & Booking Experience
 *
 * This module isolates all HTTP communication with the Order Service
 * via the Spring Cloud API Gateway (/api/v1/orders/**).
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
