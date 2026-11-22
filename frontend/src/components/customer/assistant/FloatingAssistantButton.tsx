'use client';

import React from 'react';
import { Bot, X } from 'lucide-react';

interface FloatingAssistantButtonProps {
  isOpen: boolean;
  hasUnreadIndicator: boolean;
  onClick: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement>;
}

export function FloatingAssistantButton({
  isOpen,
  hasUnreadIndicator,
  onClick,
  buttonRef,
}: FloatingAssistantButtonProps) {
  return (
    <div className="sd-ai-fab-wrapper">
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        aria-label={isOpen ? 'Close SwiftDrop AI assistant' : 'Ask SwiftDrop AI'}
        aria-expanded={isOpen}
        aria-controls="swiftdrop-ai-chat-window"
        aria-describedby="swiftdrop-ai-fab-tooltip"
        className="sd-ai-fab"
      >
        {isOpen ? (
          <X size={22} strokeWidth={2.2} aria-hidden="true" />
        ) : (
          <Bot size={24} strokeWidth={2.1} aria-hidden="true" />
        )}

        {!isOpen && (
          <span
            aria-hidden="true"
            className={`sd-ai-fab__indicator ${
              hasUnreadIndicator ? 'sd-ai-fab__indicator--pulse' : ''
            }`}
          />
        )}
      </button>

      <span id="swiftdrop-ai-fab-tooltip" role="tooltip" className="sd-ai-fab__tooltip">
        Ask SwiftDrop AI
      </span>
    </div>
  );
}
