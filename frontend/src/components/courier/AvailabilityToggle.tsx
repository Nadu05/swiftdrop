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
    badgeBg: '#ecfdf5',
    borderColor: '#a7f3d0',
    textColor: '#065f46',
  },
  BUSY: {
    label: 'On Active Route',
    dot: '#f59e0b',
    badgeBg: '#fffbeb',
    borderColor: '#fde68a',
    textColor: '#92400e',
  },
  ON_BREAK: {
    label: 'On Break',
    dot: '#3b82f6',
    badgeBg: '#eff6ff',
    borderColor: '#bfdbfe',
    textColor: '#1e40af',
  },
  OFFLINE: {
    label: 'Offline',
    dot: '#94a3b8',
    badgeBg: '#f8fafc',
    borderColor: '#e2e8f0',
    textColor: '#64748b',
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.35rem 0.75rem',
            borderRadius: '9999px',
            background: style.badgeBg,
            border: `1px solid ${style.borderColor}`,
            color: style.textColor,
            fontSize: '0.8125rem',
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
                className="dispatcher-overview__refresh-btn"
                disabled={mutation.isPending}
                onClick={() => handleSetStatus('ON_BREAK')}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
              >
                {mutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Coffee size={13} />}
                <span>Take Break</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={mutation.isPending}
                onClick={() => handleSetStatus('AVAILABLE')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(22, 163, 74, 0.3)',
                }}
              >
                {mutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Power size={13} />}
                <span>Resume Online</span>
              </button>
            )}

            <button
              type="button"
              className="dispatcher-overview__refresh-btn"
              disabled={mutation.isPending}
              onClick={() => handleSetStatus('OFFLINE')}
              style={{
                fontSize: '0.8rem',
                padding: '0.4rem 0.75rem',
                color: '#b91c1c',
                borderColor: '#fca5a5',
                background: '#fef2f2',
              }}
            >
              Go Offline
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={() => handleSetStatus('AVAILABLE')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.9rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(37, 99, 235, 0.3)',
            }}
          >
            {mutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Power size={13} />}
            <span>Go Online</span>
          </button>
        )}
      </div>

      {error && (
        <span role="alert" style={{ fontSize: '0.75rem', color: '#dc2626' }}>
          {error}
        </span>
      )}
    </div>
  );
}
