'use client';

import { useState } from 'react';
import { Power } from 'lucide-react';
import { setMyAvailability } from '@/api/services/courier.api';
import type { CourierProfile } from '@/types/courier.types';

const LABEL = { AVAILABLE: 'Available', BUSY: 'On a delivery', OFFLINE: 'Offline' } as const;
const BADGE = { AVAILABLE: 'badge badge-success', BUSY: 'badge badge-primary', OFFLINE: 'badge badge-danger' } as const;

/**
 * Online/offline switch. This is the status the dispatcher sees when choosing
 * a courier (AVAILABLE / BUSY / OFFLINE). BUSY is set by the system while a
 * job is active; the courier only chooses online or offline.
 */
export default function AvailabilityToggle({
  profile,
  onChange,
}: {
  profile: CourierProfile;
  onChange: (profile: CourierProfile) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const online = profile.status !== 'OFFLINE';

  const toggle = async () => {
    setSaving(true);
    setError(null);
    try {
      onChange(await setMyAvailability(!online));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update availability.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span className={BADGE[profile.status]}>
          {profile.status !== 'OFFLINE' && <span className="pulse-dot online" />}
          {LABEL[profile.status]}
        </span>
        <button
          type="button"
          className={online ? 'btn btn-secondary' : 'btn btn-primary'}
          onClick={toggle}
          disabled={saving}
          aria-pressed={online}
        >
          <Power size={16} />
          {saving ? 'Updating…' : online ? 'Go offline' : 'Go online'}
        </button>
      </div>
      {error && (
        <span role="alert" style={{ fontSize: '0.8rem', color: '#fca5a5' }}>
          {error}
        </span>
      )}
    </div>
  );
}
