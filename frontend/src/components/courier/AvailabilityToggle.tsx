'use client';

import { useState } from 'react';
import { Coffee, Loader2, Power } from 'lucide-react';
import { mapCourierProfileDto } from '@/api/services/courier.api';
import { useUpdateCourierAvailabilityMutation } from '@/hooks/api/use-courier';
import type { CourierAvailabilityStatus, CourierProfile } from '@/types/courier.types';

interface AvailabilityToggleProps {
  profile: CourierProfile;
  onChange: (updated: CourierProfile) => void;
}

const STATUS_STYLE: Record<
  CourierAvailabilityStatus,
  { label: string; dot: string; badgeBg: string; borderColor: string; textColor: string }
> = {
  AVAILABLE: {
    label: 'Online & Available',
    dot: '#10b981',
    badgeBg: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    textColor: '#6ee7b7',
  },
  BUSY: {
    label: 'On Active Route',
    dot: '#f59e0b',
    badgeBg: 'rgba(245, 158, 11, 0.14)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    textColor: '#fcd34d',
  },
  ON_BREAK: {
    label: 'On Break',
    dot: '#38bdf8',
    badgeBg: 'rgba(56, 189, 248, 0.14)',
    borderColor: 'rgba(56, 189, 248, 0.35)',
    textColor: '#7dd3fc',
  },
  OFFLINE: {
    label: 'Offline',
    dot: '#64748b',
    badgeBg: 'rgba(100, 116, 139, 0.16)',
    borderColor: 'rgba(148, 163, 184, 0.25)',
    textColor: '#94a3b8',
  },
};

export default function AvailabilityToggle({ profile, onChange }: AvailabilityToggleProps) {
  const [error, setError] = useState<string | null>(null);
  const mutation = useUpdateCourierAvailabilityMutation();
  const isOnline = profile.status !== 'OFFLINE';
  const style = STATUS_STYLE[profile.status] ?? STATUS_STYLE.OFFLINE;

  const handleSetStatus = async (status: CourierAvailabilityStatus) => {
    setError(null);
    try {
      const dto = await mutation.mutateAsync({
        online: status !== 'OFFLINE',
        status,
      });
      onChange(mapCourierProfileDto(dto));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update availability');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.45rem 0.85rem',
            borderRadius: '999px',
            background: style.badgeBg,
            border: `1px solid ${style.borderColor}`,
            color: style.textColor,
            fontSize: '0.8rem',
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: style.dot,
              display: 'inline-block',
            }}
          />
          {style.label}
        </span>

        {isOnline ? (
          <>
            {profile.status !== 'ON_BREAK' ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={mutation.isPending}
                onClick={() => handleSetStatus('ON_BREAK')}
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
              >
                {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Coffee size={14} />}
                Take Break
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                disabled={mutation.isPending}
                onClick={() => handleSetStatus('AVAILABLE')}
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
              >
                {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                Resume Online
              </button>
            )}

            <button
              type="button"
              className="btn btn-secondary"
              disabled={mutation.isPending}
              onClick={() => handleSetStatus('OFFLINE')}
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', color: '#fca5a5' }}
            >
              Go Offline
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={mutation.isPending}
            onClick={() => handleSetStatus('AVAILABLE')}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
          >
            {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
            Go Online
          </button>
        )}
      </div>

      {error && (
        <span role="alert" style={{ fontSize: '0.75rem', color: '#fca5a5' }}>
          {error}
        </span>
      )}
    </div>
  );
}
