'use client';

import React, { useEffect, useRef } from 'react';
import { useAIAssistantStore } from '@/store/ai-assistant.store';
import { AIChatWindow } from './AIChatWindow';
import { FloatingAssistantButton } from './FloatingAssistantButton';
import { aiAssistantService } from './mockAIResponse';
import './assistant.css';

/**
 * Globally mounted customer-only SwiftDrop AI Delivery Assistant.
 * Uses an isolated mock-response service ready to be swapped for a real API later.
 */
export function CustomerAIAssistant() {
  const {
    conversationId,
    isOpen,
    hasOpenedOnce,
    messages,
    isLoading,
    error,
    toggleChat,
    minimizeChat,
    closeChat,
    appendMessage,
    setLoading,
    setError,
    clearConversation,
  } = useAIAssistantStore();

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

  const handleSendMessage = async (rawMessage: string) => {
    const trimmed = rawMessage.trim();
    if (!trimmed || isLoading) {
      return;
    }

    const requestConversationId = conversationId;
    setError(null);
    appendMessage({
      sender: 'user',
      content: trimmed,
      category: 'user',
    });
    setLoading(true);

    try {
      const response = await aiAssistantService.sendMessage(trimmed, requestConversationId);

      // Ignore stale responses if the user cleared the conversation mid-flight.
      if (activeSessionRef.current !== requestConversationId) {
        return;
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
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Sorry, something went wrong while generating a reply. Please try again.';
      setError(message);
    } finally {
      if (activeSessionRef.current === requestConversationId) {
        setLoading(false);
      }
    }
  };

  const handleClearConversation = () => {
    clearConversation();
    setLoading(false);
    inputRef.current?.focus();
  };

  return (
    <div className="sd-ai-root">
      <AIChatWindow
        isOpen={isOpen}
        messages={messages}
        isLoading={isLoading}
        error={error}
        onSendMessage={handleSendMessage}
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
