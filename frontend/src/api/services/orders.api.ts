import { apiClient } from '@/api/axios-client';
import type { OrderQuoteRequest, OrderQuoteResponse } from '@/types/order.types';

/**
 * Order Service Domain API Module
 * Member 06 - Customer UI & Booking Experience
 *
 * This module isolates all HTTP communication with the Order Service
 * via the API Gateway (/api/v1/orders/**).
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
    // If backend returned a specific error message, preserve it
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }

    // If HTTP 404 (e.g. endpoint not found / mock service pending)
    if (error.response?.status === 404) {
      throw new Error(
        'The Order Quote Service endpoint (/api/v1/orders/quote) was not found on the backend Gateway.'
      );
    }

    // If HTTP 503 or network failure (Gateway or Order Service down)
    if (error.code === 'ECONNABORTED' || !error.response) {
      throw new Error(
        'Unable to reach the API Gateway or Order Service. Please check that the backend is running at http://localhost:8080.'
      );
    }

    // Default friendly message
    throw new Error(
      'An unexpected error occurred while calculating the delivery fee. Please try again.'
    );
  }
}

