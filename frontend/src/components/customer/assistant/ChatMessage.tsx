'use client';

import React from 'react';
import { Bot } from 'lucide-react';
import type { ChatMessageItem } from './types';

interface ChatMessageProps {
  message: ChatMessageItem;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.sender === 'user';

  const bubbleClass = isUser
    ? 'sd-ai-msg__bubble sd-ai-msg__bubble--user'
    : message.isError
      ? 'sd-ai-msg__bubble sd-ai-msg__bubble--error'
      : 'sd-ai-msg__bubble sd-ai-msg__bubble--assistant';

  return (
    <div
      className={`sd-ai-msg ${isUser ? 'sd-ai-msg--user' : 'sd-ai-msg--assistant'}`}
      role="article"
      aria-label={isUser ? 'Your message' : 'SwiftDrop AI message'}
    >
      {!isUser && (
        <div className="sd-ai-msg__avatar" aria-hidden="true">
          <Bot size={15} strokeWidth={2.2} />
        </div>
      )}

      <div className="sd-ai-msg__content-wrap">
        <div className={bubbleClass}>{message.content}</div>
        {message.timestamp && (
          <span className="sd-ai-msg__time">{message.timestamp}</span>
        )}
      </div>
    </div>
  );
}
