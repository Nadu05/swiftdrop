'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bike, Car, ArrowRight, ShieldCheck, Phone } from 'lucide-react';
import { courierFleetMock, type CourierFleetMember, type CourierStatus } from './mockData';

const courierStatusBadge: Record<CourierStatus, { label: string; dot: string; bg: string; text: string }> = {
  AVAILABLE: {
    label: 'Available',
    dot: '#22c55e',
    bg: '#f0fdf4',
    text: '#15803d',
  },
  ON_DELIVERY: {
    label: 'On Route',
    dot: '#3b82f6',
    bg: '#eff6ff',
    text: '#1d4ed8',
  },
  BREAK: {
    label: 'On Break',
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

export default function CourierFleetStatus() {
  const [couriers] = useState<CourierFleetMember[]>(courierFleetMock);

  const availableCount = couriers.filter((c) => c.status === 'AVAILABLE').length;
  const onRouteCount = couriers.filter((c) => c.status === 'ON_DELIVERY').length;
  const onBreakCount = couriers.filter((c) => c.status === 'BREAK').length;
  const totalActive = availableCount + onRouteCount + onBreakCount;

  return (
    <div className="dispatcher-card">
      <div className="dispatcher-card__header">
        <div>
          <h2 className="dispatcher-card__title">Courier Fleet Status</h2>
          <p className="dispatcher-card__subtitle">Active workforce capacity</p>
        </div>
        <Link href="/dispatcher/couriers" className="dispatcher-card__link">
          <span>Manage</span>
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      {/* Capacity Overview Bar */}
      <div className="dispatcher-fleet-capacity">
        <div className="dispatcher-fleet-capacity__stats">
          <span className="dispatcher-fleet-capacity__total">
            {totalActive} <small>/ {couriers.length} Couriers Active</small>
          </span>
          <span className="dispatcher-fleet-capacity__badge">
            <ShieldCheck size={14} className="text-emerald-600" aria-hidden="true" />
            86% Capacity
          </span>
        </div>

        <div className="dispatcher-capacity-bar" aria-hidden="true">
          <div
            className="dispatcher-capacity-bar__segment dispatcher-capacity-bar__segment--blue"
            style={{ width: `${(onRouteCount / couriers.length) * 100}%` }}
            title={`${onRouteCount} On Route`}
          />
          <div
            className="dispatcher-capacity-bar__segment dispatcher-capacity-bar__segment--green"
            style={{ width: `${(availableCount / couriers.length) * 100}%` }}
            title={`${availableCount} Available`}
          />
          <div
            className="dispatcher-capacity-bar__segment dispatcher-capacity-bar__segment--amber"
            style={{ width: `${(onBreakCount / couriers.length) * 100}%` }}
            title={`${onBreakCount} On Break`}
          />
        </div>

        <div className="dispatcher-capacity-legend">
          <span className="dispatcher-legend-item">
            <span className="dispatcher-legend-dot bg-blue-500" /> On Route ({onRouteCount})
          </span>
          <span className="dispatcher-legend-item">
            <span className="dispatcher-legend-dot bg-emerald-500" /> Available ({availableCount})
          </span>
          <span className="dispatcher-legend-item">
            <span className="dispatcher-legend-dot bg-amber-500" /> Break ({onBreakCount})
          </span>
        </div>
      </div>

      {/* Courier List */}
      <div className="dispatcher-courier-list">
        {couriers.map((courier) => {
          const status = courierStatusBadge[courier.status];
          return (
            <div key={courier.id} className="dispatcher-courier-row">
              <div className="dispatcher-courier-row__main">
                <div className="dispatcher-courier-row__avatar" aria-hidden="true">
                  {courier.vehicle === 'Van' ? <Car size={16} /> : <Bike size={16} />}
                </div>
                <div className="dispatcher-courier-row__details">
                  <span className="dispatcher-courier-row__name">{courier.name}</span>
                  <span className="dispatcher-courier-row__zone">{courier.zone}</span>
                </div>
              </div>

              <div className="dispatcher-courier-row__right">
                {courier.status === 'ON_DELIVERY' ? (
                  <span className="dispatcher-courier-orders-badge">
                    {courier.activeOrders} orders
                  </span>
                ) : (
                  <span
                    className="dispatcher-courier-status-tag"
                    style={{ backgroundColor: status.bg, color: status.text }}
                  >
                    <span
                      className="dispatcher-courier-status-dot"
                      style={{ backgroundColor: status.dot }}
                    />
                    {status.label}
                  </span>
                )}
                <a
                  href={`tel:${courier.phone}`}
                  className="dispatcher-courier-phone-btn"
                  title={`Call ${courier.name}`}
                  aria-label={`Call ${courier.name}`}
                >
                  <Phone size={13} aria-hidden="true" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

