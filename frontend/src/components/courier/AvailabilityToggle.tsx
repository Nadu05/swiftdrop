'use client';

import { useState } from 'react';
import { Coffee, Loader2, Power } from 'lucide-react';
import { mapCourierProfileDto } from '@/api/services/courier.api';
import { useUpdateCourierAvailabilityMutation } from '@/hooks/api/use-courier';
import type { CourierAvailabilityStatus, CourierProfile } from '@/types/courier.types';
import { AvailabilityBadge } from './CourierUI';

interface AvailabilityToggleProps {
  profile: CourierProfile;
  onChange: (updated: CourierProfile) => void;
}

/** Online / break / offline switch. What the courier sets here is what branch dispatchers see. */
export default function AvailabilityToggle({ profile, onChange }: AvailabilityToggleProps) {
  const [error, setError] = useState<string | null>(null);
  const mutation = useUpdateCourierAvailabilityMutation();
  const isOnline = profile.status !== 'OFFLINE';
  const busy = mutation.isPending;

  const setStatus = async (status: CourierAvailabilityStatus) => {
    setError(null);
    try {
      const dto = await mutation.mutateAsync({ online: status !== 'OFFLINE', status });
      onChange(mapCourierProfileDto(dto));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your availability.');
    }
  };

  const spinner = <Loader2 size={14} className="cp-spin" aria-hidden="true" />;

  return (
    <div className="cp-stack">
      <div className="cp-row">
        <AvailabilityBadge status={profile.status} />
        {isOnline ? (
          <>
            {profile.status === 'ON_BREAK' ? (
              <button type="button" className="cp-btn cp-btn--primary cp-btn--sm" disabled={busy} onClick={() => setStatus('AVAILABLE')}>
                {busy ? spinner : <Power size={14} aria-hidden="true" />} Resume
              </button>
            ) : (
              <button type="button" className="cp-btn cp-btn--secondary cp-btn--sm" disabled={busy} onClick={() => setStatus('ON_BREAK')}>
                {busy ? spinner : <Coffee size={14} aria-hidden="true" />} Take a break
              </button>
            )}
            <button type="button" className="cp-btn cp-btn--danger cp-btn--sm" disabled={busy} onClick={() => setStatus('OFFLINE')}>
              Go offline
            </button>
          </>
        ) : (
          <button type="button" className="cp-btn cp-btn--primary cp-btn--sm" disabled={busy} onClick={() => setStatus('AVAILABLE')}>
            {busy ? spinner : <Power size={14} aria-hidden="true" />} Go online
          </button>
        )}
      </div>
      {error && (
        <span role="alert" className="cp-error">
          {error}
        </span>
      )}
    </div>
  );
}
