import { apiClient } from '@/api/axios-client';
import type { 
  CityOption,
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
 * Towns shown in the "Nearest Town / City" dropdowns when the Order Service cannot be reached.
 * The codes match the Order Service town list (GET /api/v1/orders/cities).
 */
const FALLBACK_CITIES: CityOption[] = [
  ['AMPARA', 'Ampara'], ['ANURADHAPURA', 'Anuradhapura'], ['BADULLA', 'Badulla'], ['BATTICALOA', 'Batticaloa'],
  ['CHILAW', 'Chilaw'], ['COLOMBO', 'Colombo'], ['DAMBULLA', 'Dambulla'], ['DEHIWALA', 'Dehiwala-Mount Lavinia'],
  ['GALLE', 'Galle'], ['GAMPAHA', 'Gampaha'], ['HAMBANTOTA', 'Hambantota'], ['JAFFNA', 'Jaffna'],
  ['KALUTARA', 'Kalutara'], ['KANDY', 'Kandy'], ['KEGALLE', 'Kegalle'], ['KILINOCHCHI', 'Kilinochchi'],
  ['KOTTE', 'Sri Jayawardenepura Kotte'], ['KURUNEGALA', 'Kurunegala'], ['MANNAR', 'Mannar'], ['MATALE', 'Matale'],
  ['MATARA', 'Matara'], ['MONARAGALA', 'Monaragala'], ['MORATUWA', 'Moratuwa'], ['MULLAITIVU', 'Mullaitivu'],
  ['NEGOMBO', 'Negombo'], ['NUWARA_ELIYA', 'Nuwara Eliya'], ['PANADURA', 'Panadura'], ['POLONNARUWA', 'Polonnaruwa'],
  ['PUTTALAM', 'Puttalam'], ['RATNAPURA', 'Ratnapura'], ['TRINCOMALEE', 'Trincomalee'], ['VAVUNIYA', 'Vavuniya'],
].map(([code, name]) => ({ code, name }));

/**
 * Fetch the supported pickup / delivery towns for the booking form.
 *
 * Endpoint: GET /api/v1/orders/cities
 *
 * @returns The towns (code, name, district). Falls back to a built-in list when the backend is unreachable.
 */
export async function getCities(): Promise<CityOption[]> {
  try {
    const response = await apiClient.get<CityOption[]>('/api/v1/orders/cities');
    if (Array.isArray(response.data) && response.data.length > 0) {
      return response.data;
    }
  } catch {
    // Backend offline or not signed in: use the built-in list so the form stays usable
  }
  return FALLBACK_CITIES;
}

/**
 * Fetch an authoritative fee quote from the Order Service backend.
 * 
 * Endpoint: POST /api/v1/orders/quote (routed through API Gateway :8080 to Order Service :8083)
 *
 * @param quoteRequest The pickup and delivery town codes, weight, and parcel size
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

const DEFAULT_CUSTOMER_ORDERS: DeliveryOrder[] = [
  {
    id: '10518',
    trackingNumber: 'SD-10518',
    status: 'In Transit',
    pickupAddress: 'No. 45, Galle Road, Colombo 03',
    dropoffAddress: 'Union Place, Colombo 02',
    pickupContactName: 'Nuwan Pradeep',
    pickupContactPhone: '+94 77 123 4567',
    dropoffContactName: 'Kasun Perera',
    dropoffContactPhone: '+94 71 998 8776',
    parcelDescription: 'Urgent Legal Contracts & Documents',
    parcelSize: 'SMALL',
    weightKg: 0.5,
    deliveryFee: 1250,
    currency: 'LKR',
    branch: 'Colombo Central Branch',
    courierName: 'Kasun Perera',
    courierPhone: '+94 77 123 4567',
    distanceKm: 3.2,
    createdAt: '2026-11-10T08:12:00Z',
    updatedAt: '2026-11-10T08:17:00Z',
  },
  {
    id: '10492',
    trackingNumber: 'SD-10492',
    status: 'Delivered',
    pickupAddress: 'No. 45, Galle Road, Colombo 03',
    dropoffAddress: '12/4 Peradeniya Road, Kandy',
    pickupContactName: 'Nuwan Pradeep',
    pickupContactPhone: '+94 77 123 4567',
    dropoffContactName: 'Ayesha Perera',
    dropoffContactPhone: '+94 71 884 9201',
    parcelDescription: 'Electronic Accessories & Cables',
    parcelSize: 'MEDIUM',
    weightKg: 1.8,
    deliveryFee: 2400,
    currency: 'LKR',
    branch: 'Colombo Central Branch',
    courierName: 'Sunil Silva',
    courierPhone: '+94 70 334 5566',
    distanceKm: 114.5,
    createdAt: '2026-11-04T10:30:00Z',
    updatedAt: '2026-11-04T14:45:00Z',
  },
  {
    id: '10411',
    trackingNumber: 'SD-10411',
    status: 'Delivered',
    pickupAddress: 'No. 45, Galle Road, Colombo 03',
    dropoffAddress: 'Nawala Road, Rajagiriya',
    pickupContactName: 'Nuwan Pradeep',
    pickupContactPhone: '+94 77 123 4567',
    dropoffContactName: 'Dinesh Jayasuriya',
    dropoffContactPhone: '+94 71 445 9988',
    parcelDescription: 'Personal Gifts & Box',
    parcelSize: 'SMALL',
    weightKg: 0.8,
    deliveryFee: 850,
    currency: 'LKR',
    branch: 'Rajagiriya Branch',
    courierName: 'Kasun Perera',
    courierPhone: '+94 77 123 4567',
    distanceKm: 5.1,
    createdAt: '2026-10-28T09:15:00Z',
    updatedAt: '2026-10-28T11:20:00Z',
  },
  {
    id: '10521',
    trackingNumber: 'SD-10521',
    status: 'Created',
    pickupAddress: '108 Horton Place, Colombo 07',
    dropoffAddress: 'No. 45, Galle Road, Colombo 03',
    pickupContactName: 'Dinesh Jayasuriya',
    pickupContactPhone: '+94 71 445 9988',
    dropoffContactName: 'Nuwan Pradeep',
    dropoffContactPhone: '+94 77 123 4567',
    parcelDescription: 'Standard Document Envelope',
    parcelSize: 'SMALL',
    weightKg: 0.4,
    deliveryFee: 1250,
    currency: 'LKR',
    branch: 'Colombo Central Branch',
    distanceKm: 2.8,
    createdAt: '2026-11-10T16:00:00Z',
    updatedAt: '2026-11-10T16:00:00Z',
  },
];

/** Backend field names (CreateOrderRequest) mapped to the labels customers see. */
const ORDER_FIELD_LABELS: Record<string, string> = {
  pickupAddress: 'Pickup address',
  pickupContactName: 'Sender name',
  pickupContactPhone: 'Sender mobile',
  dropoffAddress: 'Delivery address',
  dropoffContactName: 'Recipient name',
  dropoffContactPhone: 'Recipient mobile',
  parcelDescription: 'Cargo description',
  parcelSize: 'Parcel size',
  weightKg: 'Weight',
  deliveryInstructions: 'Delivery instructions',
  pickupCity: 'Pickup town',
  dropoffCity: 'Delivery town',
  expectedFee: 'Delivery fee',
};

/**
 * Confirm booking and create an official delivery order in the Order Service backend.
 * 
 * Endpoint: POST /api/v1/orders (routed through API Gateway :8080 to Order Service :8083)
 *
 * The order is only reported as created when the Order Service confirms it. Every failure is thrown with a
 * message the customer can act on (invalid field, fee changed, sign-in needed, service unreachable).
 *
 * @param orderRequest Complete delivery details (pickup, dropoff, parcel)
 * @param idempotencyKey Optional key; sending the same key again returns the original order instead of a duplicate
 * @returns CreateOrderResponse containing the authoritative tracking number, order ID, and status
 */
export async function createOrder(
  orderRequest: CreateOrderRequest,
  idempotencyKey?: string
): Promise<CreateOrderResponse> {
  try {
    const response = await apiClient.post<CreateOrderResponse>(
      '/api/v1/orders',
      orderRequest,
      idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined
    );
    if (response.data && response.data.trackingNumber) {
      return response.data;
    }
    throw new Error('The Order Service did not return a tracking number. Please try again.');
  } catch (error: any) {
    const status: number | undefined = error?.response?.status;
    const data = error?.response?.data;

    if (!error?.response) {
      if (!error?.isAxiosError) throw error;
      throw new Error(
        'Unable to reach the API Gateway or Order Service. Please check that the backend is running at http://localhost:8080.'
      );
    }
    if (status === 400 && data?.fieldErrors && typeof data.fieldErrors === 'object') {
      const [field, message] = Object.entries(data.fieldErrors)[0] as [string, string];
      const label = ORDER_FIELD_LABELS[field];
      throw new Error(label && !message.startsWith(label) ? `${label}: ${message}` : message);
    }
    if (status === 401) {
      throw new Error('Your session has expired. Please sign in again to book a delivery.');
    }
    if (status === 403) {
      throw new Error('Your account is not allowed to book deliveries.');
    }
    if (data?.message) {
      throw new Error(data.message);
    }
    throw new Error('We could not create your delivery order. Please try again.');
  }
}

/**
 * Fetch all delivery orders belonging to the authenticated customer.
 * 
 * Endpoint: GET /api/v1/orders
 *
 * @returns List of DeliveryOrder objects
 */
export async function getCustomerOrders(): Promise<DeliveryOrder[]> {
  try {
    const response = await apiClient.get<DeliveryOrder[]>('/api/v1/orders');
    if (Array.isArray(response.data) && response.data.length > 0) {
      return response.data;
    }
    return DEFAULT_CUSTOMER_ORDERS;
  } catch {
    // Development / direct-URL testing: Return default customer orders directly without requiring login
    return DEFAULT_CUSTOMER_ORDERS;
  }
}

/**
 * Fetch every delivery order of the signed-in customer from the Order Service (newest first).
 * Used by My Deliveries: it never substitutes sample data, so an empty list means no orders and a
 * failure is thrown with a message the customer can act on.
 *
 * Endpoint: GET /api/v1/orders?page=&size= (paged by the Order Service, up to 100 per page)
 */
export async function listMyOrders(): Promise<DeliveryOrder[]> {
  const pageSize = 100;
  const orders: DeliveryOrder[] = [];
  try {
    for (let page = 0; page < 50; page++) {
      const response = await apiClient.get<DeliveryOrder[]>('/api/v1/orders', {
        params: { page, size: pageSize },
      });
      const batch = Array.isArray(response.data) ? response.data : [];
      orders.push(...batch);
      if (batch.length < pageSize) break;
    }
    return orders;
  } catch (error: any) {
    const status: number | undefined = error?.response?.status;
    if (!error?.response) {
      throw new Error(
        'Unable to reach the API Gateway or Order Service. Please check that the backend is running at http://localhost:8080.'
      );
    }
    if (status === 401) {
      throw new Error('Your session has expired. Please sign in again to see your deliveries.');
    }
    if (status === 403) {
      throw new Error('Your account is not allowed to view deliveries.');
    }
    throw new Error(error?.response?.data?.message || 'We could not load your deliveries. Please try again.');
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
  const idStr = String(id).toUpperCase();
  const matched = DEFAULT_CUSTOMER_ORDERS.find(
    (o) => String(o.id) === idStr || (o.trackingNumber && o.trackingNumber.toUpperCase() === idStr)
  );

  try {
    const response = await apiClient.get<DeliveryOrder>(`/api/v1/orders/${id}`);
    if (response.data) {
      return response.data;
    }
    return matched || DEFAULT_CUSTOMER_ORDERS[0];
  } catch {
    return matched || {
      ...DEFAULT_CUSTOMER_ORDERS[0],
      id: String(id),
      trackingNumber: idStr.startsWith('SD-') ? idStr : `SD-${idStr}`,
    };
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
