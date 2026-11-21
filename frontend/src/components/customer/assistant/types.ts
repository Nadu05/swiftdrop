export type ChatSender = 'user' | 'assistant';

export type ChatMessageCategory =
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

export interface AIResponsePayload {
  reply: string;
  category: ChatMessageCategory;
  extractedTrackingNumber?: string;
}

export interface AIAssistantService {
  sendMessage(message: string, conversationId: string): Promise<AIResponsePayload>;
}
