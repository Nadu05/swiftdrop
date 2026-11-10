'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Package,
  PlusCircle,
  Clock,
  Compass,
  User,
  Truck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  ArrowRight,
  MapPin,
  Calendar,
  Box,
  Layers,
  Sparkles,
} from 'lucide-react';
import { getCustomerOrders } from '@/api/services/orders.api';
import { getCurrentUserProfile } from '@/api/services/auth.api';
import type { DeliveryOrder } from '@/types/order.types';
import type { UserProfile, CustomerDeliveryStats } from '@/types/auth.types';

/**
 * Member 06: Customer Dashboard Page
 * Route: /customer/dashboard
 *
 * Central hub for logged-in customers:
 * - Dynamic welcome message
 * - Summary statistics computed from real Order Service data
 * - Spotlight on active delivery
 * - Quick action shortcuts
 * - Recent delivery history preview
 */
export default function CustomerDashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch both profile and customer orders concurrently
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [userProfile, customerOrders] = await Promise.all([
        getCurrentUserProfile(),
        getCustomerOrders().catch(() => [] as DeliveryOrder[]),
      ]);

      setProfile(userProfile);
      setOrders(Array.isArray(customerOrders) ? customerOrders : []);
    } catch (err: any) {
      setError(
        err.message || 'Unable to load customer dashboard data. Please check your backend connection.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Compute delivery statistics dynamically from real backend order records
  const stats: CustomerDeliveryStats = {
    total: orders.length,
    active: orders.filter((o) => {
      const s = (o.status || '').toUpperCase();
      return s === 'CREATED' || s === 'PICKED UP' || s === 'IN TRANSIT' || s === 'OUT FOR DELIVERY';
    }).length,
    delivered: orders.filter((o) => (o.status || '').toUpperCase() === 'DELIVERED').length,
    failed: orders.filter((o) => {
      const s = (o.status || '').toUpperCase();
      return s === 'FAILED' || s === 'CANCELLED';
    }).length,
  };

  // Find the most recent active order to spotlight
  const activeOrder = orders.find((o) => {
    const s = (o.status || '').toUpperCase();
    return s === 'CREATED' || s === 'PICKED UP' || s === 'IN TRANSIT' || s === 'OUT FOR DELIVERY';
  });

  // Recent 4 deliveries for the table/cards
  const recentOrders = orders.slice(0, 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* ---------------- WELCOME HERO BANNER ---------------- */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.45) 0%, rgba(15, 23, 42, 0.9) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '16px',
          padding: '2.25rem 2.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          flexWrap: 'wrap',
          gap: '1.25rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <span className="badge badge-primary">Customer Portal</span>
            <span className="badge badge-success">Authenticated Experience</span>
          </div>
          <h1 style={{ fontSize: '1.95rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>
            Welcome back, <span style={{ color: '#60a5fa' }}>{profile?.name || 'Customer'}</span> 👋
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: '640px' }}>
            Manage your parcels, track active deliveries, request instant price quotes, and review your courier history.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={loadDashboardData}
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
            <PlusCircle size={16} /> New Delivery
          </Link>
        </div>
      </div>

      {/* ---------------- LOADING STATE ---------------- */}
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
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>Loading your dashboard...</div>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Synchronizing account profile and order history from the Order Service
          </p>
        </div>
      )}

      {/* ---------------- ERROR STATE ---------------- */}
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
                Unable to Load Dashboard
              </div>
              <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginTop: '0.25rem' }}>
                {error}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={loadDashboardData}
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem' }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ---------------- DASHBOARD CONTENT ---------------- */}
      {!isLoading && !error && (
        <>
          {/* QUICK ACTION CARDS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <Link
              href="/book"
              className="glass-card"
              style={{
                padding: '1.25rem',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                transition: 'all 0.2s ease',
                border: '1px solid rgba(59, 130, 246, 0.25)',
              }}
            >
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PlusCircle size={20} color="#60a5fa" />
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>Book Delivery</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Get quote & send parcel</div>
              </div>
            </Link>

            <Link
              href="/bookings"
              className="glass-card"
              style={{
                padding: '1.25rem',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                transition: 'all 0.2s ease',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={20} color="#34d399" />
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>My Deliveries</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>View past & active bookings</div>
              </div>
            </Link>

            <Link
              href="/tracking"
              className="glass-card"
              style={{
                padding: '1.25rem',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                transition: 'all 0.2s ease',
                border: '1px solid rgba(6, 182, 212, 0.25)',
              }}
            >
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Compass size={20} color="#22d3ee" />
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>Track Parcel</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Public tracking lookup</div>
              </div>
            </Link>

            <Link
              href="/customer/profile"
              className="glass-card"
              style={{
                padding: '1.25rem',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                transition: 'all 0.2s ease',
                border: '1px solid rgba(139, 92, 246, 0.25)',
              }}
            >
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={20} color="#a78bfa" />
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>My Profile</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Account & contact details</div>
              </div>
            </Link>
          </div>

          {/* REAL DELIVERY SUMMARY METRICS */}
          <div className="grid-cols-4">
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Total Bookings</span>
                <Package size={18} color="#3b82f6" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff' }}>{stats.total}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem' }}>All recorded orders</div>
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Active Shipments</span>
                <Truck size={18} color="#f59e0b" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fbbf24' }}>{stats.active}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem' }}>In transit or pending pickup</div>
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Delivered</span>
                <CheckCircle2 size={18} color="#10b981" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#34d399' }}>{stats.delivered}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem' }}>Successfully completed</div>
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Action Required</span>
                <AlertCircle size={18} color="#ef4444" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: stats.failed > 0 ? '#f87171' : '#94a3b8' }}>
                {stats.failed}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem' }}>Failed or cancelled</div>
            </div>
          </div>

          {/* ACTIVE DELIVERY SPOTLIGHT (If an active order exists) */}
          {activeOrder && (
            <div
              className="glass-card"
              style={{
                padding: '1.75rem 2rem',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 23, 42, 0.9) 100%)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge badge-warning" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                    <span className="pulse-dot online"></span> Active Shipment Spotlight
                  </span>
                  <code style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>{activeOrder.trackingNumber}</code>
                </div>

                <Link
                  href={`/bookings/${activeOrder.id}`}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  View Live Progress <ArrowRight size={14} />
                </Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Pickup: </span>
                  <strong style={{ color: '#ffffff' }}>{activeOrder.pickupAddress}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Destination: </span>
                  <strong style={{ color: '#ffffff' }}>{activeOrder.dropoffAddress}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Current Status: </span>
                  <span className="badge badge-primary">{activeOrder.status}</span>
                </div>
              </div>
            </div>
          )}

          {/* RECENT DELIVERIES SECTION */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={18} color="#3b82f6" />
                  Recent Deliveries
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  Your most recent courier bookings recorded in the Order database
                </p>
              </div>

              {orders.length > 0 && (
                <Link href="/bookings" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}>
                  View All ({orders.length}) →
                </Link>
              )}
            </div>

            {orders.length === 0 ? (
              /* EMPTY STATE */
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box size={28} color="#60a5fa" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.25rem' }}>No deliveries yet</h3>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '400px' }}>
                    You haven't created any deliveries yet. Book your first courier delivery today!
                  </p>
                </div>
                <Link href="/book" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                  <PlusCircle size={16} /> Create Your First Delivery
                </Link>
              </div>
            ) : (
              /* ORDERS LIST */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    style={{
                      padding: '1rem 1.25rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      borderRadius: '10px',
                      border: '1px solid rgba(59, 130, 246, 0.12)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={18} color="#60a5fa" />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <code style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                            {order.trackingNumber || `#${order.id}`}
                          </code>
                          <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{order.status}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                          {order.pickupAddress} → {order.dropoffAddress}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 700, color: '#38bdf8' }}>
                          {order.currency || 'LKR'} {Number(order.deliveryFee || 0).toFixed(2)}
                        </div>
                        {order.parcelDescription && (
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{order.parcelDescription}</div>
                        )}
                      </div>

                      <Link
                        href={`/bookings/${order.id}`}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Global spinner styling */}
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

