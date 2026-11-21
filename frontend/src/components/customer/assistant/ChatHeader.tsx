'use client';

import React from 'react';
import { Bot, Minus, RotateCcw, X } from 'lucide-react';

interface ChatHeaderProps {
  onMinimize: () => void;
  onClose: () => void;
  onClear: () => void;
  canClear: boolean;
}

export function ChatHeader({
  onMinimize,
  onClose,
  onClear,
  canClear,
}: ChatHeaderProps) {
  return (
    <header className="sd-ai-header">
      <div className="sd-ai-header__identity">
        <div className="sd-ai-header__avatar" aria-hidden="true">
          <Bot size={20} strokeWidth={2.2} />
        </div>
        <div className="sd-ai-header__title-wrap">
          <h2 id="swiftdrop-ai-title" className="sd-ai-header__title">
            SwiftDrop AI
          </h2>
          <div className="sd-ai-header__subtitle-row">
            <span className="sd-ai-header__status-dot" aria-hidden="true" />
            <span className="sd-ai-header__subtitle">Your delivery assistant</span>
          </div>
        </div>
      </div>

      <div className="sd-ai-header__actions">
        <button
          type="button"
          onClick={onClear}
          disabled={!canClear}
          aria-label="Clear conversation"
          title="Clear conversation"
          className="sd-ai-header__btn"
        >
          <RotateCcw size={15} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onMinimize}
          aria-label="Minimize SwiftDrop AI"
          title="Minimize"
          className="sd-ai-header__btn"
        >
          <Minus size={16} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close SwiftDrop AI"
          title="Close"
          className="sd-ai-header__btn"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
