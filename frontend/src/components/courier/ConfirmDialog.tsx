'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Short explanation of what will happen. */
  message: ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  /** True while the request is in flight; the dialog stays open until the backend answers. */
  busy?: boolean;
  /** Error from the last attempt, shown inside the dialog so a failure is never hidden. */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const backdrop: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1rem',
  background: 'rgba(15, 23, 42, 0.55)',
};

const panel: CSSProperties = {
  width: '100%',
  maxWidth: '440px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.9rem',
  padding: '1.4rem',
  borderRadius: '14px',
  background: 'var(--ds-surface, #ffffff)',
  border: '1px solid var(--ds-border, #e2e8f0)',
  boxShadow: '0 20px 45px rgba(15, 23, 42, 0.25)',
  color: 'var(--ds-text, #0f172a)',
};

/**
 * Confirmation for consequential courier actions (pickup, delivery, failed attempt).
 * Closing is blocked while the request is running so the courier cannot submit twice.
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
      role="presentation"
      style={backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div role="alertdialog" aria-modal="true" aria-labelledby="courier-confirm-title" aria-describedby="courier-confirm-desc" style={panel}>
        <h2 id="courier-confirm-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
          {title}
        </h2>
        <div id="courier-confirm-desc" style={{ fontSize: '0.875rem', color: 'var(--ds-text-muted, #64748b)' }}>
          {message}
        </div>
        {error && (
          <p role="alert" style={{ margin: 0, fontSize: '0.85rem', color: '#dc2626', fontWeight: 600 }}>
            {error}
          </p>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={onConfirm}
            style={tone === 'danger' ? { background: '#dc2626', borderColor: '#dc2626' } : undefined}
          >
            {busy && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
