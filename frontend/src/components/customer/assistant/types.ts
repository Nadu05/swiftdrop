export type ChatSender = 'user' | 'assistant';

export type ChatMessageCategory =
  | 'assistant'
  | 'welcome'
  | 'tracking_prompt'
  | 'tracking_code'
  | 'fee_estimate'
  | 'send_parcel'
  | 'failed_delivery'
  | 'pickup_dropoff'
  | 'delivery_time'
  | 'parcel_sizes'
  | 'delivery_process'
  | 'cancellation'
  | 'status_meaning'
  | 'support'
  | 'scope_boundary'
  | 'fallback'
  | 'user'
  | 'error';

export interface ChatMessageItem {
  id: string;
  sender: ChatSender;
  content: string;
  timestamp: string;
  category?: ChatMessageCategory;
  isError?: boolean;
}

export interface SuggestedQuestionItem {
  id: string;
  text: string;
}

export interface AssistantHistoryMessageDto {
  role: ChatSender;
  content: string;
}

export interface AssistantChatRequestDto {
  message: string;
  conversationId?: string;
  history?: AssistantHistoryMessageDto[];
}

export interface AssistantChatResponseDto {
  reply: string;
  category?: string | null;
  conversationId?: string | null;
  timestamp?: string | null;
}

export interface AIResponsePayload {
  reply: string;
  category: ChatMessageCategory;
  conversationId?: string;
  timestamp?: string;
  extractedTrackingNumber?: string;
}

export interface AIAssistantService {
  sendMessage(
    message: string,
    conversationId: string,
    history?: AssistantHistoryMessageDto[]
  ): Promise<AIResponsePayload>;
}
