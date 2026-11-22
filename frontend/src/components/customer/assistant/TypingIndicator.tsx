'use client';

import React from 'react';
import { Bot } from 'lucide-react';

export function TypingIndicator() {
  return (
    <div
      className="sd-ai-msg sd-ai-msg--assistant"
      role="status"
      aria-live="polite"
      aria-label="SwiftDrop AI is typing"
    >
      <div className="sd-ai-msg__avatar" aria-hidden="true">
        <Bot size={15} strokeWidth={2.2} />
      </div>
      <div className="sd-ai-typing">
        <span className="sd-ai-typing__dot" />
        <span className="sd-ai-typing__dot" />
        <span className="sd-ai-typing__dot" />
      </div>
    </div>
  );
}
