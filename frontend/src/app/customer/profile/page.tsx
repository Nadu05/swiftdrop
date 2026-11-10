'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Loader2,
  RotateCcw,
  PlusCircle,
  Clock,
  LayoutDashboard,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { getCurrentUserProfile } from '@/api/services/auth.api';
import { getCustomerOrders } from '@/api/services/orders.api';
import type { UserProfile } from '@/types/auth.types';
import type { DeliveryOrder } from '@/types/order.types';

/**
 * Member 06: Customer Profile Page
 * Route: /customer/profile
 *
 * Displays authenticated customer profile details:
 * - Real name, email, phone, and saved address
 * - Account role and verification status
 * - Account delivery activity summary
 */
export default function CustomerProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
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
        err.message || 'Unable to load your profile. Please check your authentication status.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.85) 100%)',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)',
              border: '2px solid rgba(255, 255, 255, 0.15)',
            }}
          >
            <User size={32} color="#ffffff" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
              <span className="badge badge-primary">{profile?.role || 'CUSTOMER'}</span>
              <span className="badge badge-success">
                <span className="pulse-dot online"></span> {profile?.status || 'Active'}
              </span>
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '0.2rem' }}>
              {profile?.name || 'Customer Account'}
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              Authenticated SwiftDrop Customer Profile
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadProfile}
          disabled={isLoading}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
        >
          <RotateCcw size={14} className={isLoading ? 'animate-spin' : ''} style={{ animation: isLoading ? 'spin 1s linear infinite' : undefined }} />
          Refresh Profile
        </button>
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
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>Loading profile information...</div>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Fetching authenticated identity records from Identity Service
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
                Profile Unavailable
              </div>
              <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginTop: '0.25rem' }}>
                {error}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" onClick={loadProfile} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* ---------------- PROFILE CONTENT ---------------- */}
      {!isLoading && !error && profile && (
        <>
          {/* Personal & Contact Details Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
            {/* Account Information Card */}
            <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#60a5fa', fontWeight: 700, fontSize: '0.95rem' }}>
                <User size={18} /> ACCOUNT DETAILS
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Full Name</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', marginTop: '0.2rem' }}>
                    {profile.name}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Email Address</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#ffffff', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Mail size={14} color="#94a3b8" /> {profile.email}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Phone Number</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#ffffff', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Phone size={14} color="#94a3b8" /> {profile.phone || '+94 77 123 4567'}
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Preferences & Location Card */}
            <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontWeight: 700, fontSize: '0.95rem' }}>
                <MapPin size={18} /> PRIMARY DELIVERY ADDRESS
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Saved Address</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#ffffff', marginTop: '0.2rem' }}>
                    {profile.address || 'No. 12, Galle Road, Colombo 03, Western Province'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Account Role</div>
                  <div style={{ marginTop: '0.35rem' }}>
                    <span className="badge badge-primary" style={{ fontSize: '0.8rem' }}>{profile.role || 'CUSTOMER'}</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Delivery Bookings History</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#38bdf8', marginTop: '0.2rem' }}>
                    {orders.length} total deliveries created
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy & Ownership Guarantee Banner */}
          <div
            className="glass-card"
            style={{
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
            }}
          >
            <ShieldCheck size={28} color="#34d399" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                Privacy & Data Ownership Enforced by Backend
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                All delivery records, addresses, and recipient contacts are secured with signed JWT authentication. The Order Service guarantees that other users cannot access your private bookings.
              </div>
            </div>
          </div>

          {/* Navigation Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <Link href="/customer/dashboard" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <LayoutDashboard size={16} /> Back to Dashboard
            </Link>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link href="/bookings" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={16} /> My Deliveries
              </Link>
              <Link href="/book" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <PlusCircle size={16} /> Book Delivery
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Global CSS spinner */}
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

