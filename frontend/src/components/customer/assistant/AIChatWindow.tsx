'use client';

import React, { useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { ChatHeader } from './ChatHeader';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { SuggestedQuestions } from './SuggestedQuestions';
import { TypingIndicator } from './TypingIndicator';
import { SWIFTDROP_AI_INITIAL_SUGGESTIONS } from './mockAIResponse';
import type { ChatMessageItem } from './types';

interface AIChatWindowProps {
  isOpen: boolean;
  messages: ChatMessageItem[];
  isLoading: boolean;
  error: string | null;
  canRetry?: boolean;
  onSendMessage: (message: string) => void;
  onRetry?: () => void;
  onMinimize: () => void;
  onClose: () => void;
  onClear: () => void;
  onDismissError: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}

export function AIChatWindow({
  isOpen,
  messages,
  isLoading,
  error,
  canRetry = false,
  onSendMessage,
  onRetry,
  onMinimize,
  onClose,
  onClear,
  onDismissError,
  inputRef,
}: AIChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [isOpen, messages, isLoading, error]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape' && isOpen) {
      event.stopPropagation();
      onMinimize();
    }
  };

  const showInitialSuggestions = messages.length === 1 && !isLoading;
  const canClear = messages.length > 1 && !isLoading;

  return (
    <section
      id="swiftdrop-ai-chat-window"
      role="dialog"
      aria-modal="false"
      aria-labelledby="swiftdrop-ai-title"
      aria-hidden={!isOpen}
      onKeyDown={handleKeyDown}
      className={`sd-ai-window ${isOpen ? 'sd-ai-window--open' : ''}`}
    >
      <ChatHeader
        onMinimize={onMinimize}
        onClose={onClose}
        onClear={onClear}
        canClear={canClear}
      />

      <div
        className="sd-ai-messages"
        role="log"
        aria-live="polite"
        aria-label="Conversation with SwiftDrop AI"
      >
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {showInitialSuggestions && (
          <SuggestedQuestions
            suggestions={SWIFTDROP_AI_INITIAL_SUGGESTIONS}
            onSelect={onSendMessage}
            disabled={isLoading}
          />
        )}

        {isLoading && <TypingIndicator />}

        {error && (
          <div className="sd-ai-error-banner" role="alert">
            <div className="sd-ai-error-banner__content">
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
              <span>{error}</span>
            </div>
            <div className="sd-ai-error-banner__actions">
              {canRetry && onRetry && !isLoading && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="sd-ai-error-banner__retry"
                >
                  Retry
                </button>
              )}
              <button
                type="button"
                onClick={onDismissError}
                className="sd-ai-error-banner__dismiss"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        onSend={onSendMessage}
        isLoading={isLoading}
        inputRef={inputRef}
      />
    </section>
  );
}
