import { apiClient } from '@/api/axios-client';
import type {
  AIAssistantService,
  AIResponsePayload,
  AssistantChatRequestDto,
  AssistantChatResponseDto,
  AssistantHistoryMessageDto,
} from '@/components/customer/assistant/types';
import {
  ASSISTANT_CHAT_ENDPOINT,
  ASSISTANT_MAX_HISTORY_MESSAGES,
  ASSISTANT_MAX_MESSAGE_LENGTH,
  AssistantApiError,
  buildAssistantHistoryPayload,
  isCustomerAssistantAuthorized,
  mapAssistantCategory,
  normalizeAssistantApiError,
  normalizeConversationId,
} from '@/components/customer/assistant/assistant-helpers';

export {
  ASSISTANT_CHAT_ENDPOINT,
  ASSISTANT_MAX_HISTORY_MESSAGES,
  ASSISTANT_MAX_MESSAGE_LENGTH,
  AssistantApiError,
  buildAssistantHistoryPayload,
  isCustomerAssistantAuthorized,
  mapAssistantCategory,
  normalizeAssistantApiError,
  normalizeConversationId,
};

function sanitizeHistoryPayload(
  history?: readonly AssistantHistoryMessageDto[]
): AssistantHistoryMessageDto[] | undefined {
  if (!Array.isArray(history) || history.length === 0) {
    return undefined;
  }

  const sanitized = history
    .filter(
      (item): item is AssistantHistoryMessageDto =>
        Boolean(item) &&
        (item.role === 'user' || item.role === 'assistant') &&
        typeof item.content === 'string' &&
        item.content.trim().length > 0
    )
    .map((item) => ({
      role: item.role,
      content: item.content.trim().slice(0, ASSISTANT_MAX_MESSAGE_LENGTH),
    }))
    .slice(-ASSISTANT_MAX_HISTORY_MESSAGES);

  return sanitized.length > 0 ? sanitized : undefined;
}

/**
 * Sends a customer chat message to the Order Service AI Assistant via the API Gateway.
 * Authentication is carried automatically via HttpOnly cookies (withCredentials: true).
 */
export async function sendAssistantChatMessage(
  request: AssistantChatRequestDto
): Promise<AIResponsePayload> {
  const trimmedMessage = typeof request.message === 'string' ? request.message.trim() : '';
  if (!trimmedMessage) {
    throw new AssistantApiError('Please enter a message before sending.', {
      status: 400,
      retryable: false,
    });
  }

  if (trimmedMessage.length > ASSISTANT_MAX_MESSAGE_LENGTH) {
    throw new AssistantApiError(
      `Your message exceeds the ${ASSISTANT_MAX_MESSAGE_LENGTH}-character limit. Please shorten it and try again.`,
      {
        status: 400,
        retryable: false,
      }
    );
  }

  const conversationId = normalizeConversationId(request.conversationId);
  const history = sanitizeHistoryPayload(request.history);

  const payload: AssistantChatRequestDto = {
    message: trimmedMessage,
    ...(conversationId ? { conversationId } : {}),
    ...(history ? { history } : {}),
  };

  try {
    const response = await apiClient.post<AssistantChatResponseDto>(
      ASSISTANT_CHAT_ENDPOINT,
      payload,
      { timeout: 45000 }
    );

    const data = response.data;
    const reply = typeof data?.reply === 'string' ? data.reply.trim() : '';
    if (!reply) {
      throw new AssistantApiError(
        "Sorry, I'm temporarily unable to respond. Please try again in a moment.",
        {
          status: 503,
          retryable: true,
        }
      );
    }

    return {
      reply,
      category: mapAssistantCategory(data?.category),
      conversationId: normalizeConversationId(data?.conversationId) ?? conversationId,
      timestamp: typeof data?.timestamp === 'string' ? data.timestamp : undefined,
    };
  } catch (err) {
    throw normalizeAssistantApiError(err);
  }
}

export const aiAssistantApiService: AIAssistantService = {
  sendMessage(
    message: string,
    conversationId: string,
    history?: AssistantHistoryMessageDto[]
  ): Promise<AIResponsePayload> {
    return sendAssistantChatMessage({ message, conversationId, history });
  },
};
