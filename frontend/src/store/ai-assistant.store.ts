'use client';

import { create } from 'zustand';
import { SWIFTDROP_AI_WELCOME_MESSAGE } from '@/components/customer/assistant/mockAIResponse';
import type { ChatMessageItem } from '@/components/customer/assistant/types';

function createMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatCurrentTime(): string {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function createWelcomeMessage(): ChatMessageItem {
  return {
    id: 'welcome-message',
    sender: 'assistant',
    content: SWIFTDROP_AI_WELCOME_MESSAGE,
    timestamp: '',
    category: 'welcome',
  };
}

export type NewChatMessageInput = Omit<ChatMessageItem, 'id' | 'timestamp'> & {
  id?: string;
  timestamp?: string;
};

interface AIAssistantState {
  conversationId: string;
  isOpen: boolean;
  isMinimized: boolean;
  hasOpenedOnce: boolean;
  messages: ChatMessageItem[];
  isLoading: boolean;
  error: string | null;

  openChat: () => void;
  minimizeChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  appendMessage: (message: NewChatMessageInput) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearConversation: () => void;
}

/**
 * In-memory session state for the Customer AI Delivery Assistant.
 * Preserves conversation messages across minimize/close/reopen and page navigation
 * within the current session without persisting to localStorage.
 */
export const useAIAssistantStore = create<AIAssistantState>((set) => ({
  conversationId: 'cust-session-1',
  isOpen: false,
  isMinimized: false,
  hasOpenedOnce: false,
  messages: [createWelcomeMessage()],
  isLoading: false,
  error: null,

  openChat: () =>
    set({
      isOpen: true,
      isMinimized: false,
      hasOpenedOnce: true,
    }),

  minimizeChat: () =>
    set({
      isOpen: false,
      isMinimized: true,
    }),

  closeChat: () =>
    set({
      isOpen: false,
      isMinimized: false,
    }),

  toggleChat: () =>
    set((state) => ({
      isOpen: !state.isOpen,
      isMinimized: state.isOpen ? false : false,
      hasOpenedOnce: true,
    })),

  appendMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: message.id ?? createMessageId(),
          timestamp: message.timestamp ?? formatCurrentTime(),
        },
      ],
    })),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  clearConversation: () =>
    set((state) => {
      const nextCounter = Number(state.conversationId.split('-').pop() || '1') + 1;
      return {
        conversationId: `cust-session-${Number.isFinite(nextCounter) ? nextCounter : Date.now()}`,
        messages: [createWelcomeMessage()],
        isLoading: false,
        error: null,
      };
    }),
}));
