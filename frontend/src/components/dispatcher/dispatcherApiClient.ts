import { DispatchApiError, errorKindFromStatus } from './deliveries/dispatchErrors';

/**
 * Shared HTTP client utility for Dispatcher views.
 *
 * Configured according to SwiftDrop architecture:
 * - Directs traffic through the API Gateway (port 8080 by default) or Dispatch Service (port 8084)
 * - Automatically falls back to direct port 8084 if Gateway (8080) is not running locally
 * - Attaches authentication token from storage if present
 * - Attaches required dispatcher headers (X-User-Id, X-User-Role)
 */

const DEFAULT_DIRECT_URL = 'http://localhost:8084';
const DEFAULT_GATEWAY_URL = 'http://localhost:8080';

export function getDispatchBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_DISPATCH_API_URL) {
    return process.env.NEXT_PUBLIC_DISPATCH_API_URL.replace(/\/+$/, '');
  }
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/+$/, '');
  }
  // Default to local Dispatch Service port 8084
  return DEFAULT_DIRECT_URL;
}

export async function dispatchRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const primaryBase = getDispatchBaseUrl();
  const fallbackBase = DEFAULT_DIRECT_URL;

  let token: string | null = null;
  if (typeof window !== 'undefined') {
    token =
      localStorage.getItem('swiftdrop_auth_token') ||
      sessionStorage.getItem('swiftdrop_auth_token');
  }

  const defaultHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'X-User-Id': '1',
    'X-User-Role': 'DISPATCHER',
  };

  const headers = {
    ...defaultHeaders,
    ...((init.headers as Record<string, string>) || {}),
  };

  let response: Response;

  try {
    response = await fetch(`${primaryBase}${path}`, {
      ...init,
      headers,
    });
  } catch (primaryErr) {
    // If primary URL failed on network level (e.g. gateway 8080 is down), try direct dispatch port 8084
    if (primaryBase !== fallbackBase) {
      try {
        response = await fetch(`${fallbackBase}${path}`, {
          ...init,
          headers,
        });
      } catch {
        throw new DispatchApiError('network');
      }
    } else {
      throw new DispatchApiError('network');
    }
  }

  if (!response.ok) {
    let errorDetail: string | undefined;
    try {
      const errBody = await response.json();
      if (errBody?.validationErrors && typeof errBody.validationErrors === 'object') {
        const errorList = Object.values(errBody.validationErrors).filter(Boolean);
        if (errorList.length > 0) {
          errorDetail = errorList.join('. ');
        }
      }
      if (!errorDetail) {
        errorDetail = errBody?.message || errBody?.error;
      }
    } catch {
      // Body not JSON
    }
    throw new DispatchApiError(
      errorKindFromStatus(response.status),
      errorDetail,
      response.status
    );
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json().catch(() => null as T);
}

