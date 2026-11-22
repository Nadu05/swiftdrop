'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
}

export function ChatInput({ onSend, isLoading, inputRef }: ChatInputProps) {
  const [draft, setDraft] = useState('');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const trimmedDraft = draft.trim();
  const canSend = trimmedDraft.length > 0 && !isLoading;

  useEffect(() => {
    const el = inputRef?.current;
    if (!el) {
      return;
    }
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [draft, inputRef]);

  const submitMessage = () => {
    if (isLoading) {
      return;
    }

    if (!trimmedDraft) {
      if (draft.length > 0) {
        setValidationMessage('Please enter a delivery question before sending.');
      }
      return;
    }

    setValidationMessage(null);
    onSend(trimmedDraft);
    setDraft('');
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitMessage();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value;
    setDraft(nextValue);
    if (validationMessage && nextValue.trim().length > 0) {
      setValidationMessage(null);
    } else if (validationMessage && nextValue.length === 0) {
      setValidationMessage(null);
    }
  };

  return (
    <div className="sd-ai-input-area">
      <form onSubmit={handleSubmit} className="sd-ai-input-form" noValidate>
        <textarea
          ref={inputRef}
          rows={1}
          value={draft}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="Ask about your delivery..."
          aria-label="Ask SwiftDrop AI about your delivery"
          aria-invalid={Boolean(validationMessage)}
          className="sd-ai-input"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label={isLoading ? 'Sending message' : 'Send message'}
          title="Send message"
          className="sd-ai-send-btn"
        >
          {isLoading ? (
            <Loader2 size={17} className="sd-ai-spin" aria-hidden="true" />
          ) : (
            <Send size={16} aria-hidden="true" />
          )}
        </button>
      </form>

      <div className="sd-ai-input-meta">
        {validationMessage ? (
          <span role="alert" className="sd-ai-input-validation">
            {validationMessage}
          </span>
        ) : (
          <span className="sd-ai-input-hint">
            Press Enter to send · Shift + Enter for new line
          </span>
        )}
      </div>
    </div>
  );
}
