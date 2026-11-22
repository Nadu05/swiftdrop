'use client';

import React, { useEffect, useRef } from 'react';
import {
  ASSISTANT_MAX_MESSAGE_LENGTH,
  aiAssistantApiService,
  buildAssistantHistoryPayload,
  isCustomerAssistantAuthorized,
  normalizeAssistantApiError,
} from '@/api/services/assistant.api';
import { useAIAssistantStore } from '@/store/ai-assistant.store';
import { useAuthStore } from '@/store/auth.store';
import { AIChatWindow } from './AIChatWindow';
import { FloatingAssistantButton } from './FloatingAssistantButton';
import './assistant.css';

/**
 * Globally mounted customer-only SwiftDrop AI Delivery Assistant.
 * Connects authenticated active customers to the Order Service AI Assistant endpoint.
 */
export function CustomerAIAssistant() {
  const {
    conversationId,
    isOpen,
    hasOpenedOnce,
    messages,
    isLoading,
    error,
    canRetry,
    lastFailedMessage,
    toggleChat,
    minimizeChat,
    closeChat,
    appendMessage,
    setConversationId,
    setLoading,
    setError,
    clearConversation,
  } = useAIAssistantStore();
  const user = useAuthStore((state) => state.user);
  const activeRole = useAuthStore((state) => state.activeRole);
  const isCustomerAuthorized = isCustomerAssistantAuthorized(user, activeRole);
  const inFlightSessionRef = useRef<string | null>(null);
  const prevUserIdRef = useRef<string | null>(user?.userId ?? null);

  useEffect(() => {
    const currentUserId = user?.userId ?? null;
    if (prevUserIdRef.current !== null && prevUserIdRef.current !== currentUserId) {
      inFlightSessionRef.current = null;
      clearConversation();
    }
    prevUserIdRef.current = currentUserId;
  }, [user?.userId, clearConversation]);

  const fabRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wasOpenRef = useRef<boolean>(false);
  const activeSessionRef = useRef<string>(conversationId);

  useEffect(() => {
    activeSessionRef.current = conversationId;
  }, [conversationId]);

  // Move keyboard focus cleanly between the floating button and chat input on open/close.
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
      wasOpenRef.current = true;
      return () => window.clearTimeout(timer);
    }

    if (!isOpen && wasOpenRef.current) {
      wasOpenRef.current = false;
      fabRef.current?.focus();
    }

    return undefined;
  }, [isOpen]);

  const submitPrompt = async (
    rawMessage: string,
    options: {
      appendUserBubble?: boolean;
      excludeTrailingDuplicateUserMessage?: boolean;
    } = {}
  ) => {
    const {
      appendUserBubble = true,
      excludeTrailingDuplicateUserMessage = false,
    } = options;
    const trimmed = rawMessage.trim();
    if (!trimmed || !isCustomerAuthorized) {
      return;
    }

    const requestConversationId = conversationId;
    if (inFlightSessionRef.current === requestConversationId || isLoading) {
      return;
    }

    if (trimmed.length > ASSISTANT_MAX_MESSAGE_LENGTH) {
      setError(
        `Your message exceeds the ${ASSISTANT_MAX_MESSAGE_LENGTH}-character limit. Please shorten it and try again.`,
        { canRetry: false, lastFailedMessage: null }
      );
      return;
    }

    const historySource =
      excludeTrailingDuplicateUserMessage &&
      messages.length > 0 &&
      messages[messages.length - 1]?.sender === 'user' &&
      messages[messages.length - 1]?.content.trim() === trimmed
        ? messages.slice(0, -1)
        : messages;
    const historyPayload = buildAssistantHistoryPayload(historySource);

    inFlightSessionRef.current = requestConversationId;
    setError(null);
    if (appendUserBubble) {
      appendMessage({
        sender: 'user',
        content: trimmed,
        category: 'user',
      });
    }
    setLoading(true);

    try {
      const response = await aiAssistantApiService.sendMessage(
        trimmed,
        requestConversationId,
        historyPayload
      );

      // Ignore stale responses if the user cleared the conversation mid-flight.
      if (activeSessionRef.current !== requestConversationId) {
        return;
      }

      if (response.conversationId) {
        setConversationId(response.conversationId);
      }

      appendMessage({
        sender: 'assistant',
        content: response.reply,
        category: response.category,
      });
    } catch (err) {
      if (activeSessionRef.current !== requestConversationId) {
        return;
      }
      const normalized = normalizeAssistantApiError(err);
      setError(normalized.message, {
        canRetry: normalized.retryable,
        lastFailedMessage: normalized.retryable ? trimmed : null,
      });
    } finally {
      if (inFlightSessionRef.current === requestConversationId) {
        inFlightSessionRef.current = null;
      }
      if (activeSessionRef.current === requestConversationId) {
        setLoading(false);
      }
    }
  };

  const handleSendMessage = async (rawMessage: string) => {
    await submitPrompt(rawMessage, {
      appendUserBubble: true,
      excludeTrailingDuplicateUserMessage: false,
    });
  };

  const handleRetry = async () => {
    if (!lastFailedMessage) {
      return;
    }
    await submitPrompt(lastFailedMessage, {
      appendUserBubble: false,
      excludeTrailingDuplicateUserMessage: true,
    });
  };

  const handleClearConversation = () => {
    clearConversation();
    setLoading(false);
    inputRef.current?.focus();
  };

  if (!isCustomerAuthorized) {
    return null;
  }

  return (
    <div className="sd-ai-root">
      <AIChatWindow
        isOpen={isOpen}
        messages={messages}
        isLoading={isLoading}
        error={error}
        canRetry={canRetry}
        onSendMessage={handleSendMessage}
        onRetry={handleRetry}
        onMinimize={minimizeChat}
        onClose={closeChat}
        onClear={handleClearConversation}
        onDismissError={() => setError(null)}
        inputRef={inputRef}
      />

      <FloatingAssistantButton
        isOpen={isOpen}
        hasUnreadIndicator={!hasOpenedOnce}
        onClick={toggleChat}
        buttonRef={fabRef}
      />
    </div>
  );
}
