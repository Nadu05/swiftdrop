'use client';

import { useState } from 'react';
import { RefreshCw, Calendar } from 'lucide-react';

interface OverviewHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function OverviewHeader({
  onRefresh,
  isRefreshing = false,
}: OverviewHeaderProps) {
  const [currentDate] = useState(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date());
  });

  return (
    <header className="dispatcher-overview__header">
      <div className="dispatcher-overview__title-group">
        <h1 className="dispatcher-overview__title">Dispatch Overview</h1>
        <p className="dispatcher-overview__subtitle">
          Monitor your daily delivery operations.
        </p>
      </div>

      <div className="dispatcher-overview__actions">
        <div className="dispatcher-overview__date-badge" title="Current operations date">
          <Calendar size={15} className="dispatcher-overview__date-icon" aria-hidden="true" />
          <span>{currentDate}</span>
        </div>

        <button
          type="button"
          className="dispatcher-overview__refresh-btn"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh dashboard data"
        >
          <RefreshCw
            size={15}
            className={`dispatcher-overview__refresh-icon ${
              isRefreshing ? 'dispatcher-overview__refresh-icon--spinning' : ''
            }`}
            aria-hidden="true"
          />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>
    </header>
  );
}

