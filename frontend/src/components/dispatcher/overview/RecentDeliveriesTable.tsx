'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, ArrowRight, UserCheck, AlertTriangle } from 'lucide-react';
import {
  recentDeliveriesMock,
  type DeliveryStatus,
  type RecentDelivery,
} from './mockData';

const statusConfig: Record<
  DeliveryStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  OUT_FOR_DELIVERY: {
    label: 'Out for Delivery',
    bg: '#eff6ff',
    text: '#1d4ed8',
    dot: '#3b82f6',
  },
  IN_TRANSIT: {
    label: 'In Transit',
    bg: '#f0f9ff',
    text: '#0369a1',
    dot: '#0284c7',
  },
  PENDING_PICKUP: {
    label: 'Pending Pickup',
    bg: '#fffbeb',
    text: '#b45309',
    dot: '#f59e0b',
  },
  DELAYED: {
    label: 'Delayed',
    bg: '#fef2f2',
    text: '#b91c1c',
    dot: '#ef4444',
  },
  DELIVERED: {
    label: 'Delivered',
    bg: '#f0fdf4',
    text: '#15803d',
    dot: '#22c55e',
  },
};

export default function RecentDeliveriesTable() {
  const [deliveries] = useState<RecentDelivery[]>(recentDeliveriesMock);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredDeliveries = deliveries.filter((item) => {
    const matchesSearch =
      item.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.courierName && item.courierName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="dispatcher-card">
      <div className="dispatcher-card__header">
        <div>
          <h2 className="dispatcher-card__title">Recent Delivery Operations</h2>
          <p className="dispatcher-card__subtitle">
            Live parcel tracking and dispatched courier assignments
          </p>
        </div>

        <Link href="/dispatcher/deliveries" className="dispatcher-card__link">
          <span>View All Deliveries</span>
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="dispatcher-table-toolbar">
        <div className="dispatcher-search-input-wrapper">
          <Search size={15} className="dispatcher-search-icon" aria-hidden="true" />
          <input
            type="text"
            className="dispatcher-search-input"
            placeholder="Search tracking #, customer, address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="dispatcher-filter-chips">
          {['ALL', 'PENDING_PICKUP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELAYED'].map((filter) => (
            <button
              key={filter}
              type="button"
              className={`dispatcher-chip ${statusFilter === filter ? 'dispatcher-chip--active' : ''}`}
              onClick={() => setStatusFilter(filter)}
            >
              {filter === 'ALL'
                ? 'All Deliveries'
                : statusConfig[filter as DeliveryStatus]?.label || filter}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="dispatcher-table-container">
        <table className="dispatcher-table">
          <thead>
            <tr>
              <th>Tracking ID</th>
              <th>Customer &amp; Destination</th>
              <th>Courier</th>
              <th>Status</th>
              <th>Est. Time</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeliveries.length === 0 ? (
              <tr>
                <td colSpan={6} className="dispatcher-table__empty">
                  No deliveries match your current filters.
                </td>
              </tr>
            ) : (
              filteredDeliveries.map((delivery) => {
                const config = statusConfig[delivery.status];
                return (
                  <tr key={delivery.id}>
                    <td>
                      <div className="dispatcher-tracking-cell">
                        <span className="dispatcher-tracking-number">{delivery.trackingNumber}</span>
                        {delivery.priority === 'URGENT' && (
                          <span className="dispatcher-badge-urgent" title="Urgent Priority">
                            <AlertTriangle size={11} aria-hidden="true" />
                            Urgent
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="dispatcher-destination-cell">
                        <span className="dispatcher-customer-name">{delivery.customerName}</span>
                        <span className="dispatcher-address-text">{delivery.destination}</span>
                      </div>
                    </td>
                    <td>
                      {delivery.courierName ? (
                        <div className="dispatcher-courier-pill">
                          <UserCheck size={14} className="dispatcher-courier-pill-icon" aria-hidden="true" />
                          <span>{delivery.courierName}</span>
                        </div>
                      ) : (
                        <Link
                          href={`/dispatcher/assignments?id=${delivery.id}`}
                          className="dispatcher-assign-btn"
                        >
                          + Assign
                        </Link>
                      )}
                    </td>
                    <td>
                      <span
                        className="dispatcher-status-badge"
                        style={{
                          backgroundColor: config.bg,
                          color: config.text,
                        }}
                      >
                        <span
                          className="dispatcher-status-dot"
                          style={{ backgroundColor: config.dot }}
                          aria-hidden="true"
                        />
                        {config.label}
                      </span>
                    </td>
                    <td>
                      <span className="dispatcher-est-time">{delivery.estimatedDelivery}</span>
                    </td>
                    <td>
                      <Link
                        href={`/dispatcher/active-deliveries?track=${delivery.trackingNumber}`}
                        className="dispatcher-action-link"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

