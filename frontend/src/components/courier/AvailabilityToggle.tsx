'use client';

import { Power } from 'lucide-react';
import { useSetAvailability } from '@/hooks/api/use-courier';
import type { CourierProfile } from '@/types/courier.types';
import { errorMessage } from './CourierUI';

const LABEL = { AVAILABLE: 'Available', BUSY: 'On a delivery', OFFLINE: 'Offline' } as const;
const BADGE = { AVAILABLE: 'badge badge-success', BUSY: 'badge badge-primary', OFFLINE: 'badge badge-danger' } as const;

/**
 * Online/offline switch. This is the status the dispatcher sees when choosing a
 * courier (AVAILABLE / BUSY / OFFLINE). BUSY is set by the backend while a job
 * is active; the courier only chooses online or offline.
 */
export default function AvailabilityToggle({ profile }: { profile: CourierProfile }) {
  const mutation = useSetAvailability();
  const online = profile.status !== 'OFFLINE';

  return (
    <div className="courier-availability">
      <div className="courier-row">
        <span className={BADGE[profile.status]}>
          {online && <span className="pulse-dot online" aria-hidden="true" />}
          {LABEL[profile.status]}
        </span>
        <button
          type="button"
          className={online ? 'btn btn-secondary' : 'btn btn-primary'}
          onClick={() => mutation.mutate(!online)}
          disabled={mutation.isPending}
          aria-pressed={online}
        >
          <Power size={16} aria-hidden="true" />
          {mutation.isPending ? 'Updating…' : online ? 'Go offline' : 'Go online'}
        </button>
      </div>
      {mutation.isError && (
        <span className="courier-alert" role="alert">
          {errorMessage(mutation.error, 'Could not update availability.')}
        </span>
      )}
    </div>
  );
}
