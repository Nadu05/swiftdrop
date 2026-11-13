'use client';

import { Check, ShieldAlert } from 'lucide-react';
import {
  getInitials,
  getWorkloadLevel,
  getWorkloadPercent,
  isCourierSelectable,
  WORKLOAD_LABELS,
} from './courierUtils';
import type { CourierAvailability, CourierAvailabilityStatus } from './types';

interface CourierSelectionCardProps {
  courier: CourierAvailability;
  isSelected: boolean;
  onSelect: (courier: CourierAvailability) => void;
  disabled?: boolean;
}

const STATUS_CONFIG: Record<
  CourierAvailabilityStatus,
  { label: string; dot: string; bg: string; text: string }
> = {
  AVAILABLE: {
    label: 'Available',
    dot: '#22c55e',
    bg: '#f0fdf4',
    text: '#15803d',
  },
  BUSY: {
    label: 'Busy',
    dot: '#f59e0b',
    bg: '#fffbeb',
    text: '#b45309',
  },
  OFFLINE: {
    label: 'Offline',
    dot: '#94a3b8',
    bg: '#f8fafc',
    text: '#64748b',
  },
};

export default function CourierSelectionCard({
  courier,
  isSelected,
  onSelect,
  disabled = false,
}: CourierSelectionCardProps) {
  const selectable = !disabled && isCourierSelectable(courier);
  const statusInfo = STATUS_CONFIG[courier.status];
  const workloadLevel = getWorkloadLevel(courier.activeDeliveries);
  const workloadPercent = getWorkloadPercent(courier.activeDeliveries, courier.maxCapacity);

  const handleClick = () => {
    if (selectable) onSelect(courier);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!selectable) return;
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      onSelect(courier);
    }
  };

  let modifier = '';
  if (isSelected) {
    modifier = ' dispatcher-courier-card--selected';
  } else if (!selectable) {
    modifier = ' dispatcher-courier-card--disabled';
  }

  return (
    <div
      role="button"
      tabIndex={selectable ? 0 : -1}
      aria-pressed={isSelected}
      aria-disabled={!selectable}
      className={`dispatcher-courier-card${modifier}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="dispatcher-courier-card__header">
        <div className="dispatcher-courier-card__identity">
          <span className="dispatcher-courier-card__avatar" aria-hidden="true">
            {getInitials(courier.name)}
          </span>
          <div className="dispatcher-courier-card__names">
            <span className="dispatcher-courier-card__name">{courier.name}</span>
            <span className="dispatcher-courier-card__code">{courier.courierCode}</span>
          </div>
        </div>

        <span
          className="dispatcher-status-badge"
          style={{ backgroundColor: statusInfo.bg, color: statusInfo.text }}
        >
          <span
            className="dispatcher-status-dot"
            style={{ backgroundColor: statusInfo.dot }}
            aria-hidden="true"
          />
          {statusInfo.label}
        </span>
      </div>

      <div className="dispatcher-courier-card__stats">
        <div className="dispatcher-courier-card__stat">
          <span className="dispatcher-courier-card__stat-label">Active</span>
          <span className="dispatcher-courier-card__stat-value">
            {courier.activeDeliveries}
            <span className="dispatcher-courier-card__stat-capacity">
              /{courier.maxCapacity}
            </span>
          </span>
        </div>

        {courier.completedToday !== undefined && (
          <div className="dispatcher-courier-card__stat">
            <span className="dispatcher-courier-card__stat-label">Done Today</span>
            <span className="dispatcher-courier-card__stat-value">{courier.completedToday}</span>
          </div>
        )}

        <div className="dispatcher-courier-card__stat">
          <span className="dispatcher-courier-card__stat-label">Workload</span>
          <span className="dispatcher-courier-card__stat-value">
            {WORKLOAD_LABELS[workloadLevel]}
          </span>
        </div>
      </div>

      <div
        className="dispatcher-courier-card__workload"
        role="progressbar"
        aria-valuenow={courier.activeDeliveries}
        aria-valuemin={0}
        aria-valuemax={courier.maxCapacity}
        aria-label={`${courier.name} delivery workload: ${workloadPercent}%`}
      >
        <div className="dispatcher-courier-card__bar-track">
          <div
            className={`dispatcher-courier-card__bar-fill dispatcher-courier-card__bar-fill--${workloadLevel}`}
            style={{ width: `${workloadPercent}%` }}
          />
        </div>
      </div>

      {!courier.isEligible && courier.ineligibilityReason && (
        <div className="dispatcher-courier-card__ineligible-note">
          <ShieldAlert size={13} aria-hidden="true" />
          <span>{courier.ineligibilityReason}</span>
        </div>
      )}

      {courier.isEligible && courier.status !== 'AVAILABLE' && (
        <div className="dispatcher-courier-card__ineligible-note">
          <span>Courier is not currently available for dispatch.</span>
        </div>
      )}

      <div className="dispatcher-courier-card__footer">
        <button
          type="button"
          tabIndex={-1}
          disabled={!selectable}
          className={`dispatcher-courier-card__select-btn${
            isSelected ? ' dispatcher-courier-card__select-btn--selected' : ''
          }`}
          aria-label={
            isSelected
              ? `${courier.name} selected`
              : selectable
              ? `Select ${courier.name}`
              : `${courier.name} unavailable`
          }
        >
          {isSelected ? (
            <>
              <Check size={14} aria-hidden="true" />
              <span>Selected</span>
            </>
          ) : (
            <span>{selectable ? 'Select Courier' : 'Unavailable'}</span>
          )}
        </button>
      </div>
    </div>
  );
}

