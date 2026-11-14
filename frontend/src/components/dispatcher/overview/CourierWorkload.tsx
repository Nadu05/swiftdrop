'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronRight, UserCheck, AlertCircle, UserMinus } from 'lucide-react';
import { getCourierProfiles } from '../couriers/couriersApi';
import type { CourierProfile, CourierStatus } from '../couriers/types';

// Configurable workload threshold logic
function getWorkloadLevel(active: number): {
  level: 'low' | 'moderate' | 'high';
  label: string;
  colorClass: string;
} {
  if (active >= 7) {
    return { level: 'high', label: 'High Load', colorClass: 'dispatcher-workload-bar__fill--high' };
  }
  if (active >= 4) {
    return { level: 'moderate', label: 'Moderate', colorClass: 'dispatcher-workload-bar__fill--moderate' };
  }
  return { level: 'low', label: 'Optimal', colorClass: 'dispatcher-workload-bar__fill--low' };
}

const statusConfig: Record<
  CourierStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  AVAILABLE: {
    label: 'Available',
    bg: '#f0fdf4',
    text: '#15803d',
    dot: '#22c55e',
  },
  BUSY: {
    label: 'Busy',
    bg: '#fffbeb',
    text: '#b45309',
    dot: '#f59e0b',
  },
  ON_BREAK: {
    label: 'On Break',
    bg: '#f8fafc',
    text: '#64748b',
    dot: '#94a3b8',
  },
  OFFLINE: {
    label: 'Offline',
    bg: '#f1f5f9',
    text: '#475569',
    dot: '#64748b',
  },
};

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function CourierWorkload() {
  const [couriers, setCouriers] = useState<CourierProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getCourierProfiles()
      .then((data) => {
        if (isMounted) {
          setCouriers(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const totalCouriers = couriers.length;
  const availableCouriers = couriers.filter((c) => c.status === 'AVAILABLE').length;
  const busyCouriers = couriers.filter((c) => c.status === 'BUSY').length;
  const offlineCouriers = couriers.filter((c) => c.status === 'OFFLINE').length;

  return (
    <article className="dispatcher-card dispatcher-workload-card">
      {/* Header with Title and "View All Couriers" Link */}
      <div className="dispatcher-card__header">
        <div>
          <h2 className="dispatcher-card__title">Courier Workload Monitoring</h2>
          <p className="dispatcher-card__subtitle">
            Real-time active delivery capacity and courier availability status
          </p>
        </div>

        <Link href="/dispatcher/couriers" className="dispatcher-card__link">
          <span>View All Couriers</span>
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      {/* Courier Summary Metrics Bar */}
      <div className="dispatcher-workload-summary" aria-label="Courier availability summary">
        <div className="dispatcher-workload-summary__item">
          <span className="dispatcher-workload-summary__label">Total Fleet</span>
          <span className="dispatcher-workload-summary__count">{totalCouriers}</span>
        </div>

        <div className="dispatcher-workload-summary__item dispatcher-workload-summary__item--available">
          <div className="dispatcher-workload-summary__header-row">
            <UserCheck size={14} aria-hidden="true" />
            <span className="dispatcher-workload-summary__label">Available</span>
          </div>
          <span className="dispatcher-workload-summary__count text-emerald-600">
            {availableCouriers}
          </span>
        </div>

        <div className="dispatcher-workload-summary__item dispatcher-workload-summary__item--busy">
          <div className="dispatcher-workload-summary__header-row">
            <AlertCircle size={14} aria-hidden="true" />
            <span className="dispatcher-workload-summary__label">Busy</span>
          </div>
          <span className="dispatcher-workload-summary__count text-amber-600">
            {busyCouriers}
          </span>
        </div>

        <div className="dispatcher-workload-summary__item dispatcher-workload-summary__item--offline">
          <div className="dispatcher-workload-summary__header-row">
            <UserMinus size={14} aria-hidden="true" />
            <span className="dispatcher-workload-summary__label">Offline</span>
          </div>
          <span className="dispatcher-workload-summary__count text-slate-500">
            {offlineCouriers}
          </span>
        </div>
      </div>

      {/* Courier Workload Table / List */}
      <div className="dispatcher-table-container">
        <table className="dispatcher-table dispatcher-workload-table">
          <thead>
            <tr>
              <th>Courier</th>
              <th>Status</th>
              <th>Active Deliveries</th>
              <th>Completed Today</th>
              <th>Workload Capacity</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {couriers.map((courier) => {
              const status = statusConfig[courier.status];
              const workload = getWorkloadLevel(courier.activeDeliveries);
              const percent = Math.min(
                100,
                Math.round((courier.activeDeliveries / courier.maxCapacity) * 100)
              );

              return (
                <tr key={courier.id}>
                  {/* 1. Courier info with Avatar / Initials */}
                  <td>
                    <div className="dispatcher-courier-profile-cell">
                      <div className="dispatcher-courier-avatar" aria-hidden="true">
                        <span>{getInitials(courier.name)}</span>
                        <span
                          className="dispatcher-courier-avatar__dot"
                          style={{ backgroundColor: status.dot }}
                        />
                      </div>
                      <div className="dispatcher-courier-profile-info">
                        <span className="dispatcher-courier-profile-name">{courier.name}</span>
                        <span className="dispatcher-courier-profile-code">
                          {courier.courierCode} • {courier.zone}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* 2. Availability Status */}
                  <td>
                    <span
                      className="dispatcher-status-badge"
                      style={{ backgroundColor: status.bg, color: status.text }}
                    >
                      <span
                        className="dispatcher-status-dot"
                        style={{ backgroundColor: status.dot }}
                        aria-hidden="true"
                      />
                      {status.label}
                    </span>
                  </td>

                  {/* 3. Active Deliveries */}
                  <td>
                    <span className="dispatcher-workload-number">
                      <strong>{courier.activeDeliveries}</strong>
                      <span className="dispatcher-workload-number__sub">active</span>
                    </span>
                  </td>

                  {/* 4. Completed Today */}
                  <td>
                    <span className="dispatcher-workload-number">
                      <strong>{courier.completedToday}</strong>
                      <span className="dispatcher-workload-number__sub">delivered</span>
                    </span>
                  </td>

                  {/* 5. Workload Capacity Progress Bar */}
                  <td>
                    <div className="dispatcher-workload-bar-wrapper">
                      <div className="dispatcher-workload-bar-top">
                        <span className="dispatcher-workload-bar-level">
                          {workload.label}
                        </span>
                        <span className="dispatcher-workload-bar-ratio">
                          {courier.activeDeliveries}/{courier.maxCapacity} ({percent}%)
                        </span>
                      </div>
                      <div
                        className="dispatcher-workload-bar-track"
                        role="progressbar"
                        aria-valuenow={courier.activeDeliveries}
                        aria-valuemin={0}
                        aria-valuemax={courier.maxCapacity}
                        aria-label={`${courier.name} delivery workload: ${percent}%`}
                      >
                        <div
                          className={`dispatcher-workload-bar-fill ${workload.colorClass}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* 6. View Details Action */}
                  <td>
                    <Link
                      href={`/dispatcher/couriers?id=${courier.id}`}
                      className="dispatcher-action-link dispatcher-workload-action-link"
                      title={`View details for ${courier.name}`}
                    >
                      <span>View Details</span>
                      <ChevronRight size={14} aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}

