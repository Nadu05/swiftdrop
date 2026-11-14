/**
 * Typed and user-friendly error handlers for Dispatcher views and operations.
 * Translates backend status codes and technical exceptions into clear, actionable messages.
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

export const DEFAULT_MESSAGES: Record<DispatchErrorKind, string> = {
  conflict:
    'This delivery has already been assigned or updated by someone else. Please refresh the page to see the latest status.',
  courier_unavailable:
    'The selected courier is currently unavailable or has reached maximum delivery capacity. Please choose another courier.',
  unauthorized:
    'Your session has expired. Please sign in again to continue managing deliveries.',
  forbidden:
    'You do not have permission to perform this dispatch action.',
  validation:
    'Some information is incomplete or invalid. Please check the details and try again.',
  not_found:
    'The requested delivery or courier record was not found.',
  network:
    'Unable to connect to the Dispatch Service. Please check that the backend is running at http://localhost:8084.',
  not_configured:
    'This feature is currently not configured in the system.',
  unknown:
    'An unexpected error occurred while processing your request. Please try again.',
};

/**
 * Transforms raw backend messages or technical errors into friendly, understandable user prose.
 */
export function humanizeErrorMessage(rawMessage?: string, kind?: DispatchErrorKind): string {
  if (!rawMessage || rawMessage.trim() === '') {
    return kind ? DEFAULT_MESSAGES[kind] : DEFAULT_MESSAGES.unknown;
  }

  const msg = rawMessage.trim();

  // Concurrency & Duplicate assignments
  if (
    msg.includes('already has an active assignment') ||
    msg.includes('Database constraint violation') ||
    msg.includes('duplicate key')
  ) {
    return 'This order already has an active courier assignment. Please refresh the list to see current status.';
  }

  // Completed delivery reassignment rule
  if (msg.includes('Cannot reassign') && msg.includes('DELIVERED')) {
    return 'This delivery is already completed and cannot be reassigned.';
  }

  // Same courier reassignment rule
  if (msg.includes('already assigned to courier') || msg.includes('same courier')) {
    return 'This delivery is already assigned to this courier. Please select a different replacement courier.';
  }

  // Courier workload & capacity
  if (msg.includes('maximum delivery capacity') || msg.includes('max capacity') || msg.includes('capacity exceeded')) {
    return 'The selected courier has reached their maximum delivery capacity. Please select another available courier.';
  }

  // Courier status: offline / busy
  if (msg.includes('currently offline')) {
    return 'The selected courier is currently offline. Please choose an active courier.';
  }
  if (msg.includes('currently busy')) {
    return 'The selected courier is currently on a delivery run. Please select another courier with available capacity.';
  }

  // Service unavailable (e.g. order-service or database down)
  if (msg.includes('Order Service is unavailable') || msg.includes('Service Unavailable') || msg.includes('503')) {
    return 'The Order Service is temporarily unreachable. Please try again in a few moments.';
  }

  // Network connection failures
  if (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('Unable to connect to the remote server')
  ) {
    return 'Unable to connect to the Dispatch Service. Please ensure the backend is running on http://localhost:8084.';
  }

  // Field validation issues
  if (msg.toLowerCase().includes('reason cannot exceed')) {
    return 'The reassignment reason is too long (maximum 1,000 characters). Please shorten your note.';
  }
  if (msg.toLowerCase().includes('reason is required') || msg.toLowerCase().includes('reason is mandatory')) {
    return 'Please enter a reason explaining why this delivery is being reassigned.';
  }
  if (msg.toLowerCase().includes('courier id is required') || msg.toLowerCase().includes('select an eligible')) {
    return 'Please select an eligible replacement courier from the list.';
  }

  // Strip technical Java/Spring stack traces or exception prefixes if present
  const cleaned = msg
    .replace(/^(java\.[a-zA-Z0-9_.]+:|com\.[a-zA-Z0-9_.]+:)\s*/i, '')
    .replace(/^([A-Za-z]+Exception):\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .trim();

  return cleaned.length > 0 ? cleaned : (kind ? DEFAULT_MESSAGES[kind] : DEFAULT_MESSAGES.unknown);
}

export class DispatchApiError extends Error {
  readonly kind: DispatchErrorKind;
  readonly status?: number;

  constructor(kind: DispatchErrorKind, message?: string, status?: number) {
    const friendlyMessage = humanizeErrorMessage(message, kind);
    super(friendlyMessage);
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
    case 503:
      return 'network';
    default:
      return 'unknown';
  }
}

/** Normalises any caught error or exception into a user-friendly DispatchApiError. */
export function toDispatchError(error: unknown): DispatchApiError {
  if (error instanceof DispatchApiError) return error;
  if (error instanceof Error) {
    return new DispatchApiError('unknown', error.message);
  }
  if (typeof error === 'string') {
    return new DispatchApiError('unknown', error);
  }
  return new DispatchApiError('unknown');
}
