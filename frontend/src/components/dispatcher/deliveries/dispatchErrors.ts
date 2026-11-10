/**
 * Typed errors for dispatch API calls. Kinds are derived from HTTP status
 * codes only, so no assumptions are made about the backend's error body.
 */

export type DispatchErrorKind =
  | 'conflict'
  | 'courier_unavailable'
  | 'unauthorized'
  | 'forbidden'
  | 'validation'
  | 'not_found'
  | 'network'
  | 'not_configured'
  | 'unknown';

const DEFAULT_MESSAGES: Record<DispatchErrorKind, string> = {
  conflict:
    'This delivery was already assigned or changed by someone else. Close this dialog and refresh the list.',
  courier_unavailable:
    'The selected courier is no longer available. Please choose another courier.',
  unauthorized:
    'You are not signed in or your session has expired. Sign in again to assign deliveries.',
  forbidden: 'You do not have permission to assign deliveries.',
  validation:
    'The assignment request was rejected as invalid. Check the order and courier, then try again.',
  not_found: 'The dispatch service could not find this endpoint or resource.',
  network: 'Could not reach the dispatch service. Check your connection and try again.',
  not_configured:
    'Backend integration is not configured yet: the request/response format for this endpoint has not been confirmed.',
  unknown: 'The request could not be completed because of an unexpected error.',
};

export class DispatchApiError extends Error {
  readonly kind: DispatchErrorKind;
  readonly status?: number;

  constructor(kind: DispatchErrorKind, message?: string, status?: number) {
    super(message ?? DEFAULT_MESSAGES[kind]);
    this.name = 'DispatchApiError';
    this.kind = kind;
    this.status = status;
  }
}

export function errorKindFromStatus(status: number): DispatchErrorKind {
  switch (status) {
    case 400:
    case 422:
      return 'validation';
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'not_found';
    case 409:
      return 'conflict';
    default:
      return 'unknown';
  }
}

/** Normalises anything thrown into a DispatchApiError. */
export function toDispatchError(error: unknown): DispatchApiError {
  if (error instanceof DispatchApiError) return error;
  return new DispatchApiError('unknown');
}

