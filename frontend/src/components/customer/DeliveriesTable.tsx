'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, PackageOpen, SearchX, ChevronLeft, ChevronRight } from 'lucide-react';
import type { DeliveryOrder, ParcelSize } from '@/types/order.types';

/**
 * Customer deliveries list: the same row design as "Recent Deliveries" on the customer dashboard
 * (icon, tracking number + status badge, route, fee, action buttons), with paging.
 */
interface DeliveriesTableProps {
  orders: DeliveryOrder[];
  /** Shown when there are no rows to display. */
  emptyMessage: string;
  /** Icon for the empty state: an empty box, or a "nothing found" search icon. */
  emptyIcon?: 'parcel' | 'search';
  pageSize?: number;
}

const SIZE_LABEL: Record<ParcelSize, string> = {
  SMALL: 'Small',
  MEDIUM: 'Medium',
  LARGE: 'Large',
  EXTRA_LARGE: 'XL Bulk',
};

/** 'OUT_FOR_DELIVERY' -> 'Out for delivery' (the Order Service returns status codes) */
function statusLabel(status?: string): string {
  if (!status) return 'Created';
  const text = status.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

/** 'Kasun Perera · Small · 0.5 kg · Nov 10, 2026' */
function detailsLine(order: DeliveryOrder): string {
  const parts: string[] = [];
  if (order.dropoffContactName) parts.push(`Recipient: ${order.dropoffContactName}`);
  if (order.parcelSize) {
    const size = SIZE_LABEL[order.parcelSize] || order.parcelSize;
    parts.push(order.weightKg ? `${size} · ${Number(order.weightKg).toFixed(1)} kg` : size);
  }
  const date = formatDate(order.createdAt);
  if (date) parts.push(date);
  return parts.join(' · ');
}

export default function DeliveriesTable({ orders, emptyMessage, emptyIcon = 'parcel', pageSize = 6 }: DeliveriesTableProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(orders.length / pageSize));

  // Go back to a valid page when the list shrinks (search or tab change)
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const start = (page - 1) * pageSize;
  const rows = orders.slice(start, start + pageSize);

  return (
    <div className="sd-card cust-list-card">
      {rows.length === 0 ? (
        <div className="cust-list-empty">
          <div className="cust-list-empty-icon">
            {emptyIcon === 'search' ? <SearchX size={30} color="#2563eb" /> : <PackageOpen size={30} color="#2563eb" />}
          </div>
          <div className="cust-list-empty-text">{emptyMessage}</div>
        </div>
      ) : (
        <div className="cust-orders-list">
          {rows.map((order) => {
            const isDelivered = (order.status || '').toUpperCase() === 'DELIVERED';
            const details = detailsLine(order);
            return (
              <div key={order.id} className="cust-order-item">
                <div className="cust-order-item-left">
                  <div className="cust-order-item-icon">
                    <Package size={18} color="#2563eb" />
                  </div>
                  <div>
                    <div className="cust-order-title-row">
                      <code className="cust-order-code">{order.trackingNumber || `#${order.id}`}</code>
                      <span className={`cust-status-badge ${isDelivered ? 'delivered' : 'active'}`}>
                        {statusLabel(order.status)}
                      </span>
                    </div>
                    <div className="cust-order-route">
                      {order.pickupAddress} <span style={{ color: '#94a3b8' }}>→</span> {order.dropoffAddress}
                    </div>
                    {details && <div className="cust-order-route">{details}</div>}
                  </div>
                </div>

                <div className="cust-order-item-right">
                  <div className="cust-order-fee">
                    <div className="cust-fee-val">
                      {order.currency || 'LKR'} {Number(order.deliveryFee || 0).toFixed(2)}
                    </div>
                    {order.parcelDescription && <div className="cust-fee-desc">{order.parcelDescription}</div>}
                  </div>

                  <div className="cust-order-actions-row">
                    <Link
                      href={`/tracking?trackingNumber=${encodeURIComponent(order.trackingNumber || '')}`}
                      className="cust-action-chip"
                    >
                      Track
                    </Link>
                    <Link
                      href={`/bookings/${order.id}`}
                      className="cust-action-chip"
                      aria-label={`View delivery ${order.trackingNumber || order.id}`}
                    >
                      View
                    </Link>
                    <Link href={`/bookings/${order.id}/receipt`} className="cust-action-chip">
                      Receipt
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="cust-pagination">
        <div className="cust-pagination-info">
          Showing <strong>{orders.length > 0 ? start + 1 : 0}</strong> to{' '}
          <strong>{Math.min(start + pageSize, orders.length)}</strong> of <strong>{orders.length}</strong> deliveries
        </div>
        <div className="cust-pagination-controls">
          <button
            type="button"
            className="cust-pagination-btn"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            aria-label="Go to previous page"
          >
            <ChevronLeft size={16} aria-hidden="true" />
            <span>Previous</span>
          </button>
          <span className="cust-pagination-current">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="cust-pagination-btn"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            aria-label="Go to next page"
          >
            <span>Next</span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <style jsx global>{`
        .cust-list-card {
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .cust-list-empty {
          padding: 2.5rem 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.85rem;
          text-align: center;
        }
        .cust-list-empty-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cust-list-empty-text {
          color: #64748b;
          font-size: 0.92rem;
          font-weight: 500;
        }
        .cust-status-badge {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 9999px;
          width: fit-content;
        }
        .cust-status-badge.active {
          background: #eff6ff;
          color: #1d4ed8;
        }
        .cust-status-badge.delivered {
          background: #ecfdf5;
          color: #15803d;
        }
        .cust-orders-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .cust-order-item {
          padding: 0.95rem 1.15rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.75rem;
          transition: border-color 0.15s, background 0.15s;
        }
        .cust-order-item:hover {
          border-color: #cbd5e1;
          background: #ffffff;
        }
        .cust-order-item-left {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          min-width: 0;
        }
        .cust-order-item-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .cust-order-title-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .cust-order-code {
          font-size: 0.88rem;
          font-weight: 700;
          color: #0f172a;
        }
        .cust-order-route {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 2px;
        }
        .cust-order-item-right {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }
        .cust-order-fee {
          text-align: right;
        }
        .cust-fee-val {
          font-size: 0.85rem;
          font-weight: 700;
          color: #1e40af;
        }
        .cust-fee-desc {
          font-size: 0.68rem;
          color: #94a3b8;
        }
        .cust-order-actions-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .cust-action-chip {
          font-size: 0.72rem;
          font-weight: 600;
          padding: 0.35rem 0.65rem;
          border-radius: 6px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #334155;
          text-decoration: none;
          transition: all 0.15s;
        }
        .cust-action-chip:hover {
          background: #eff6ff;
          color: #2563eb;
          border-color: #93c5fd;
        }
        .cust-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #f1f5f9;
          font-size: 0.8125rem;
          color: #64748b;
        }
        .cust-pagination-info strong {
          color: #0f172a;
        }
        .cust-pagination-controls {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }
        .cust-pagination-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.35rem 0.7rem;
          background: #ffffff;
          border: 1px solid #e6ebf2;
          border-radius: 6px;
          color: #334155;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .cust-pagination-btn:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #0f172a;
        }
        .cust-pagination-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .cust-pagination-current {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.78rem;
        }

        @media (max-width: 720px) {
          .cust-order-item-right {
            width: 100%;
            justify-content: space-between;
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}
