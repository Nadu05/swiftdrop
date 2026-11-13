'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  User,
  Truck,
  Building,
  Key,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { loginUser } from '@/api/services/auth.api';
import type { UserRole } from '@/types/auth.types';

export default function LoginPage() {
  const router = useRouter();

  const [selectedRole, setSelectedRole] = useState<UserRole>('CUSTOMER');
  const [email, setEmail] = useState('customer@swiftdrop.lk');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rolePresets = {
    CUSTOMER: {
      role: 'CUSTOMER' as UserRole,
      title: 'Customer',
      email: 'customer@swiftdrop.lk',
      description: 'Book parcels, track active deliveries, and manage your account',
      targetRoute: '/customer/dashboard',
      icon: User,
      color: '#38bdf8',
      badge: 'Customer Portal',
    },
    STAFF: {
      role: 'STAFF' as UserRole,
      title: 'Branch Operator',
      email: 'dispatcher@swiftdrop.lk',
      description: 'Manage incoming requests, couriers, and dispatch operations',
      targetRoute: '/dispatcher/dashboard',
      icon: Truck,
      color: '#f59e0b',
      badge: 'Branch Operations',
    },
    ADMIN: {
      role: 'ADMIN' as UserRole,
      title: 'Administrator',
      email: 'admin@swiftdrop.lk',
      description: 'Microservices architecture monitoring, health & API diagnostics',
      targetRoute: '/',
      icon: Shield,
      color: '#a855f7',
      badge: 'Platform Tooling',
    },
  };

  const handleRoleSelect = (roleKey: UserRole) => {
    setSelectedRole(roleKey);
    setEmail(rolePresets[roleKey as keyof typeof rolePresets].email);
    setPassword('password123');
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { user } = await loginUser({
        email,
        password,
        role: selectedRole,
      });

      // Role-based destination routing
      if (user.role === 'CUSTOMER') {
        router.push('/customer/dashboard');
      } else if (user.role === 'STAFF') {
        router.push('/dispatcher/dashboard');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentPreset = rolePresets[selectedRole as keyof typeof rolePresets];

  return (
    <div className="login-page-container">
      <div className="login-card-wrapper">
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)',
              }}
            >
              <Sparkles size={20} color="#ffffff" />
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
              Swift<span style={{ color: '#38bdf8' }}>Drop</span>
            </h1>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 auto', maxWidth: '380px' }}>
            Role-Based Delivery & Logistics Management Platform
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div style={{ marginBottom: '1.75rem' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>
            Select Login Role:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {(Object.keys(rolePresets) as (keyof typeof rolePresets)[]).map((key) => {
              const preset = rolePresets[key];
              const Icon = preset.icon;
              const isSelected = selectedRole === preset.role;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleRoleSelect(preset.role)}
                  style={{
                    padding: '0.75rem 0.5rem',
                    borderRadius: '10px',
                    border: isSelected ? `2px solid ${preset.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isSelected ? 'rgba(30, 58, 138, 0.35)' : 'rgba(15, 23, 42, 0.6)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={18} color={isSelected ? preset.color : '#64748b'} />
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? '#ffffff' : '#94a3b8',
                    }}
                  >
                    {preset.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Role Description Card */}
        <div
          style={{
            padding: '0.85rem 1rem',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>
              {currentPreset.title} Experience
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
              {currentPreset.description}
            </div>
          </div>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '0.25rem 0.5rem',
              borderRadius: '999px',
              background: 'rgba(56, 189, 248, 0.12)',
              color: currentPreset.color,
              whiteSpace: 'nowrap',
            }}
          >
            {currentPreset.badge}
          </span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
              Email address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.7rem 0.85rem 0.7rem 2.4rem',
                  borderRadius: '9px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.7rem 0.85rem 0.7rem 2.4rem',
                  borderRadius: '9px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '0.85rem 1.25rem',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 16px rgba(37, 99, 235, 0.35)',
              marginTop: '0.5rem',
              transition: 'opacity 0.15s ease',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign in as {currentPreset.title}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.78rem', color: '#64748b' }}>
          <span>SwiftDrop Microservices Ecosystem &bull; Member 06 Customer Experience</span>
        </div>
      </div>

      <style jsx global>{`
        .login-page-container {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #070d18;
          padding: 1.5rem;
        }

        .login-card-wrapper {
          width: 100%;
          max-width: 440px;
          background: #0c1829;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 2.25rem 2rem;
          box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
        }

        @media (max-width: 480px) {
          .login-card-wrapper {
            padding: 1.5rem 1.25rem;
          }
        }
      `}</style>
    </div>
  );
}

