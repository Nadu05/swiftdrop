'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Package,
  PlusCircle,
  RotateCcw,
  Search,
  MapPin,
  Calendar,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  ChevronRight,
  Truck,
  Box,
  Layers,
} from 'lucide-react';
import { getCustomerOrders } from '@/api/services/orders.api';
import type { DeliveryOrder } from '@/types/order.types';

/**
 * Member 06: Customer Booking History Page
 * Route: /bookings
 *
 * Displays the authenticated customer's previous and active deliveries.
 * Authenticated API: GET /api/v1/orders
 */
export default function CustomerBookingsPage() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | number | null>(null);

  // Fetch orders from backend
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getCustomerOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(
        err.message || 'Unable to load your delivery history. Please check your connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Copy tracking number helper
  const handleCopy = (trackingNumber: string, id: string | number) => {
    navigator.clipboard.writeText(trackingNumber);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to color-code authoritative backend status
  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'DELIVERED') {
      return <span className="badge badge-success"><span className="pulse-dot online"></span> Delivered</span>;
    }
    if (s === 'IN TRANSIT' || s === 'OUT FOR DELIVERY') {
      return <span className="badge badge-warning" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}><span className="pulse-dot online"></span> {status}</span>;
    }
    if (s === 'PICKED UP') {
      return <span className="badge badge-primary" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.3)' }}>{status}</span>;
    }
    if (s === 'FAILED' || s === 'CANCELLED') {
      return <span className="badge badge-danger" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>{status}</span>;
    }
    return <span className="badge badge-primary">{status || 'Created'}</span>;
  };

  // Filter orders by search query
  const filteredOrders = orders.filter((order) => {
    const q = searchQuery.toLowerCase();
    return (
      (order.trackingNumber && order.trackingNumber.toLowerCase().includes(q)) ||
      (order.pickupAddress && order.pickupAddress.toLowerCase().includes(q)) ||
      (order.dropoffAddress && order.dropoffAddress.toLowerCase().includes(q)) ||
      (order.parcelDescription && order.parcelDescription.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '16px',
          padding: '2rem 2.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <span className="badge badge-primary">Customer Deliveries</span>
            <span className="badge badge-success">Live Order History</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
            My Deliveries
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            Track your parcel delivery lifecycle and review past courier bookings.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={fetchOrders}
            disabled={isLoading}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <RotateCcw size={15} className={isLoading ? 'animate-spin' : ''} style={{ animation: isLoading ? 'spin 1s linear infinite' : undefined }} />
            Refresh
          </button>
          <Link
            href="/book"
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <PlusCircle size={16} /> Book Delivery
          </Link>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-card" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Search size={18} color="#94a3b8" />
        <input
          type="text"
          placeholder="Filter by tracking number, pickup, destination, or parcel description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            fontSize: '0.9rem',
            outline: 'none',
          }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* ---------------- STATE 1: LOADING ---------------- */}
      {isLoading && (
        <div
          className="glass-card"
          style={{
            padding: '4rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
          }}
        >
          <Loader2 size={36} color="#3b82f6" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff' }}>Loading your deliveries...</div>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Retrieving authenticated order history from Order Service (GET /api/v1/orders)
          </p>
        </div>
      )}

      {/* ---------------- STATE 2: ERROR ---------------- */}
      {!isLoading && error && (
        <div
          className="glass-card"
          style={{
            padding: '2rem',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            background: 'rgba(239, 68, 68, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <AlertCircle size={22} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f87171' }}>
                We Couldn't Load Your Deliveries
              </div>
              <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginTop: '0.25rem' }}>
                {error}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={fetchOrders}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <RotateCcw size={14} /> Try Again
            </button>
          </div>
        </div>
      )}

      {/* ---------------- STATE 3: EMPTY STATE ---------------- */}
      {!isLoading && !error && orders.length === 0 && (
        <div
          className="glass-card"
          style={{
            padding: '4rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'rgba(59, 130, 246, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(59, 130, 246, 0.25)',
            }}
          >
            <Box size={32} color="#60a5fa" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.35rem' }}>
              No deliveries yet
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '450px' }}>
              You haven't created any delivery bookings yet. Book a courier today for secure, fast parcel delivery.
            </p>
          </div>
          <Link href="/book" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <PlusCircle size={16} /> Book Your First Delivery
          </Link>
        </div>
      )}

      {/* ---------------- STATE 4: POPULATED ORDERS LIST ---------------- */}
      {!isLoading && !error && orders.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Showing <strong>{filteredOrders.length}</strong> of {orders.length} deliveries
            </span>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              No deliveries match your search query: "<strong>{searchQuery}</strong>"
            </div>
          ) : (
            filteredOrders.map((order) => {
              const orderId = order.id;
              const isCopied = copiedId === orderId;

              return (
                <div
                  key={orderId}
                  className="glass-card"
                  style={{
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Top Row: Tracking Number, Status, Copy */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid rgba(59, 130, 246, 0.12)', paddingBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Tracking:</span>
                      <code style={{ fontSize: '1.05rem', fontWeight: 700, color: '#60a5fa' }}>
                        {order.trackingNumber || `ORD-#${order.id}`}
                      </code>
                      {order.trackingNumber && (
                        <button
                          type="button"
                          onClick={() => handleCopy(order.trackingNumber, orderId)}
                          title="Copy Tracking Number"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: isCopied ? '#10b981' : '#94a3b8',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.75rem',
                          }}
                        >
                          {isCopied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {getStatusBadge(order.status)}
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        #{orderId}
                      </span>
                    </div>
                  </div>

                  {/* Middle Row: Route Information */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <MapPin size={16} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Pickup</div>
                        <div style={{ fontSize: '0.875rem', color: '#ffffff', fontWeight: 500 }}>{order.pickupAddress}</div>
                        {order.pickupContactName && (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Contact: {order.pickupContactName}</div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <MapPin size={16} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Destination</div>
                        <div style={{ fontSize: '0.875rem', color: '#ffffff', fontWeight: 500 }}>{order.dropoffAddress}</div>
                        {order.dropoffContactName && (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Recipient: {order.dropoffContactName}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Parcel, Fee, Date & View Details Link */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                      fontSize: '0.825rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', color: '#94a3b8' }}>
                      {order.parcelDescription && (
                        <div>
                          <span style={{ color: '#64748b' }}>Parcel: </span>
                          <strong style={{ color: '#e2e8f0' }}>{order.parcelDescription}</strong>
                          {order.weightKg && <span> ({order.weightKg} kg)</span>}
                        </div>
                      )}
                      <div>
                        <span style={{ color: '#64748b' }}>Fee: </span>
                        <strong style={{ color: '#38bdf8' }}>{order.currency || 'LKR'} {Number(order.deliveryFee || 0).toFixed(2)}</strong>
                      </div>
                    </div>

                    <Link
                      href={`/bookings/${orderId}`}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      View Details <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Global CSS for spinner */}
      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

