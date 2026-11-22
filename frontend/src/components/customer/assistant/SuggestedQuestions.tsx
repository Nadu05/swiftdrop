'use client';

import React from 'react';
import type { SuggestedQuestionItem } from './types';

interface SuggestedQuestionsProps {
  suggestions: readonly SuggestedQuestionItem[];
  onSelect: (questionText: string) => void;
  disabled?: boolean;
}

export function SuggestedQuestions({
  suggestions,
  onSelect,
  disabled = false,
}: SuggestedQuestionsProps) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="sd-ai-suggestions" role="group" aria-label="Suggested delivery questions">
      <span className="sd-ai-suggestions__label">Quick questions</span>
      <div className="sd-ai-suggestions__list">
        {suggestions.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(item.text)}
            className="sd-ai-suggestion-chip"
          >
            {item.text}
          </button>
        ))}
      </div>
    </div>
  );
}
