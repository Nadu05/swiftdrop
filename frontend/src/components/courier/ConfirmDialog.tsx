'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Short explanation of what will happen. */
  message: ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger' | 'warning';
  /** True while the request is in flight; the dialog stays open until the backend answers. */
  busy?: boolean;
  /** Error from the last attempt, shown inside the dialog so a failure is never hidden. */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

/**
 * Confirmation for consequential courier actions (pickup, delivery, failed attempt).
 * Closing is blocked while the request is running so the courier cannot double submit.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  tone = 'primary',
  busy = false,
  error,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="cp-modal__backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="cp-modal" role="alertdialog" aria-modal="true" aria-labelledby="cp-confirm-title" aria-describedby="cp-confirm-desc">
        <h2 id="cp-confirm-title" className="cp-section__title">
          {title}
        </h2>
        <div id="cp-confirm-desc" className="cp-muted cp-small">
          {message}
        </div>
        {children}
        {error && (
          <p role="alert" className="cp-error">
            {error}
          </p>
        )}
        <div className="cp-actions cp-actions--stack-mobile">
          <button type="button" className="cp-btn cp-btn--secondary" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`cp-btn cp-btn--${tone}`}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy && <Loader2 size={15} className="cp-spin" aria-hidden="true" />}
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
