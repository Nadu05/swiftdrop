import type {
  AssistantHistoryMessageDto,
  ChatMessageCategory,
  ChatMessageItem,
} from './types';

export const ASSISTANT_CHAT_ENDPOINT = '/api/v1/orders/assistant/chat';
export const ASSISTANT_MAX_MESSAGE_LENGTH = 1000;
export const ASSISTANT_MAX_HISTORY_MESSAGES = 10;
export const ASSISTANT_MAX_CONVERSATION_ID_LENGTH = 100;

const VALID_CATEGORIES: ReadonlySet<ChatMessageCategory> = new Set([
  'assistant',
  'welcome',
  'tracking_prompt',
  'tracking_code',
  'fee_estimate',
  'send_parcel',
  'failed_delivery',
  'pickup_dropoff',
  'delivery_time',
  'parcel_sizes',
  'delivery_process',
  'cancellation',
  'status_meaning',
  'support',
  'scope_boundary',
  'fallback',
  'user',
  'error',
]);

export interface AssistantAuthUserLike {
  roles?: readonly string[] | null;
  accountStatus?: string | null;
}

export interface AssistantApiErrorOptions {
  status: number;
  retryable: boolean;
  fieldErrors?: Record<string, string>;
  code?: string;
}

export class AssistantApiError extends Error {
  readonly status: number;
  readonly retryable: boolean;
  readonly fieldErrors?: Record<string, string>;
  readonly code?: string;

  constructor(message: string, options: AssistantApiErrorOptions) {
    super(message);
    this.name = 'AssistantApiError';
    this.status = options.status;
    this.retryable = options.retryable;
    this.fieldErrors = options.fieldErrors;
    this.code = options.code;
  }
}

interface BackendErrorPayload {
  status?: unknown;
  error?: unknown;
  message?: unknown;
  fieldErrors?: unknown;
}

interface AxiosErrorLike {
  isAxiosError?: boolean;
  code?: unknown;
  message?: unknown;
  response?: {
    status?: unknown;
    data?: BackendErrorPayload;
  };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function sanitizeBackendMessage(raw: unknown): string | undefined {
  if (typeof raw !== 'string') {
    return undefined;
  }
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 240) {
    return undefined;
  }
  if (/(exception|stacktrace|trace|bearer\s+|sk-|api[_-]?key|secret|password|sql|http:\/\/|https:\/\/)/i.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

function extractFieldErrors(raw: unknown): Record<string, string> | undefined {
  if (!isObjectRecord(raw)) {
    return undefined;
  }
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const safe = sanitizeBackendMessage(value);
    if (safe) {
      result[key] = safe;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Maps unknown API/Axios failures into safe, customer-friendly AssistantApiError instances
 * without exposing raw server stack traces, secrets, or provider internals.
 */
export function normalizeAssistantApiError(err: unknown): AssistantApiError {
  if (err instanceof AssistantApiError) {
    return err;
  }

  const axiosErr: AxiosErrorLike = isObjectRecord(err) ? (err as AxiosErrorLike) : {};
  const status =
    typeof axiosErr.response?.status === 'number' ? axiosErr.response.status : 0;
  const code = typeof axiosErr.code === 'string' ? axiosErr.code : undefined;
  const data = isObjectRecord(axiosErr.response?.data)
    ? (axiosErr.response?.data as BackendErrorPayload)
    : undefined;
  const fieldErrors = extractFieldErrors(data?.fieldErrors);
  const safeServerMessage = sanitizeBackendMessage(data?.message);

  if (status === 400) {
    const firstFieldError = fieldErrors ? Object.values(fieldErrors)[0] : undefined;
    return new AssistantApiError(
      firstFieldError ||
        safeServerMessage ||
        `Please enter a valid message (up to ${ASSISTANT_MAX_MESSAGE_LENGTH} characters) and try again.`,
      {
        status: 400,
        retryable: false,
        fieldErrors,
        code,
      }
    );
  }

  if (status === 401) {
    return new AssistantApiError(
      'Your session has expired. Please sign in again to continue using SwiftDrop AI.',
      {
        status: 401,
        retryable: false,
        code,
      }
    );
  }

  if (status === 403) {
    return new AssistantApiError(
      'SwiftDrop AI is available exclusively for active customer accounts.',
      {
        status: 403,
        retryable: false,
        code,
      }
    );
  }

  if (status === 429) {
    return new AssistantApiError(
      safeServerMessage ||
        "You're sending messages a bit too fast. Please wait a moment and try again.",
      {
        status: 429,
        retryable: true,
        code,
      }
    );
  }

  if (status === 502 || status === 503 || status === 504) {
    return new AssistantApiError(
      safeServerMessage ||
        "Sorry, I'm temporarily unable to respond. Please try again in a moment.",
      {
        status,
        retryable: true,
        code,
      }
    );
  }

  const rawMessage = typeof axiosErr.message === 'string' ? axiosErr.message : '';
  const isTimeout =
    code === 'ECONNABORTED' ||
    code === 'ETIMEDOUT' ||
    /timeout/i.test(rawMessage);

  if (status === 0 && isTimeout) {
    return new AssistantApiError(
      'The request timed out while waiting for SwiftDrop AI. Please try again.',
      {
        status: 0,
        retryable: true,
        code: code ?? 'ECONNABORTED',
      }
    );
  }

  if (status === 0) {
    return new AssistantApiError(
      'Unable to reach SwiftDrop AI right now. Please check your connection and try again.',
      {
        status: 0,
        retryable: true,
        code,
      }
    );
  }

  return new AssistantApiError(
    status >= 500
      ? "Sorry, I'm temporarily unable to respond. Please try again in a moment."
      : 'Sorry, something went wrong while generating a reply. Please try again.',
    {
      status,
      retryable: status >= 500,
      code,
    }
  );
}

/**
 * Builds a bounded conversation history array matching the backend DTO contract:
 * excludes welcome/error items, trims content, caps per-message length and turn count.
 */
export function buildAssistantHistoryPayload(
  messages: readonly ChatMessageItem[],
  maxMessages: number = ASSISTANT_MAX_HISTORY_MESSAGES
): AssistantHistoryMessageDto[] {
  if (!Array.isArray(messages) || maxMessages <= 0) {
    return [];
  }

  const filtered: AssistantHistoryMessageDto[] = [];
  for (const msg of messages) {
    if (!msg || (msg.sender !== 'user' && msg.sender !== 'assistant')) {
      continue;
    }
    if (msg.isError || msg.category === 'error' || msg.category === 'welcome' || msg.id.startsWith('welcome-')) {
      continue;
    }
    const trimmed = typeof msg.content === 'string' ? msg.content.trim() : '';
    if (!trimmed) {
      continue;
    }
    filtered.push({
      role: msg.sender,
      content: trimmed.slice(0, ASSISTANT_MAX_MESSAGE_LENGTH),
    });
  }

  return filtered.slice(-maxMessages);
}

export function normalizeConversationId(conversationId?: string | null): string | undefined {
  if (typeof conversationId !== 'string') {
    return undefined;
  }
  const trimmed = conversationId.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.slice(0, ASSISTANT_MAX_CONVERSATION_ID_LENGTH);
}

export function mapAssistantCategory(category?: string | null): ChatMessageCategory {
  if (typeof category === 'string') {
    const normalized = category.trim().toLowerCase() as ChatMessageCategory;
    if (VALID_CATEGORIES.has(normalized)) {
      return normalized;
    }
  }
  return 'assistant';
}

function normalizeRoleValue(role: string): string {
  return role.trim().toUpperCase().replace(/^ROLE_/, '');
}

/**
 * Matches backend CustomerAssistantController security rules:
 * only active, authenticated CUSTOMER-only accounts may access SwiftDrop AI.
 */
export function isCustomerAssistantAuthorized(
  user: AssistantAuthUserLike | null | undefined,
  activeRole?: string | null
): boolean {
  if (!user) {
    return false;
  }

  const status =
    typeof user.accountStatus === 'string' ? user.accountStatus.trim().toUpperCase() : '';
  if (status !== 'ACTIVE') {
    return false;
  }

  const normalizedRoles = Array.isArray(user.roles)
    ? user.roles.map(normalizeRoleValue).filter(Boolean)
    : [];

  if (normalizedRoles.length === 0) {
    return false;
  }

  const isCustomerOnly =
    normalizedRoles.includes('CUSTOMER') &&
    normalizedRoles.every((role) => role === 'CUSTOMER');

  if (!isCustomerOnly) {
    return false;
  }

  if (typeof activeRole === 'string' && activeRole.trim() !== '') {
    return normalizeRoleValue(activeRole) === 'CUSTOMER';
  }

  return true;
}
