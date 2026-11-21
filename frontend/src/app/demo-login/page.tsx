'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  User,
  Truck,
  Building2,
  Store,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { useLogin, getApiErrorMessage } from '@/hooks/api/use-auth';

const SEEDED_ACCOUNTS = [
  {
    key: 'CUSTOMER',
    title: 'Customer',
    email: 'customer@swiftdrop.lk',
    description: 'Book parcels, track active deliveries, and manage your customer account',
    icon: User,
    color: '#38bdf8',
    badge: '/customer/dashboard',
  },
  {
    key: 'MERCHANT',
    title: 'Merchant',
    email: 'merchant@swiftdrop.lk',
    description: 'Manage merchant orders, fulfillment status, and business onboarding',
    icon: Store,
    color: '#818cf8',
    badge: '/merchant/dashboard',
  },
  {
    key: 'COURIER',
    title: 'Courier',
    email: 'courier@swiftdrop.lk',
    description: 'Accept pickups, confirm parcel collection, and complete field deliveries',
    icon: Truck,
    color: '#10b981',
    badge: '/courier/dashboard',
  },
  {
    key: 'DISPATCHER',
    title: 'Dispatcher',
    email: 'dispatcher@swiftdrop.lk',
    description: 'Manage hub pickup tasks, delivery jobs, and courier assignments',
    icon: Truck,
    color: '#f59e0b',
    badge: '/dispatcher/dashboard',
  },
  {
    key: 'BRANCH_ADMIN',
    title: 'Branch Manager',
    email: 'manager.cmb@swiftdrop.lk',
    description: 'Monitor Colombo Central Hub incoming/outgoing manifests and branch couriers',
    icon: Building2,
    color: '#ec4899',
    badge: '/organization',
  },
  {
    key: 'SYSTEM_ADMIN',
    title: 'System Admin',
    email: 'admin@swiftdrop.lk',
    description: 'System-wide user management, branch governance, merchant approvals & health',
    icon: Shield,
    color: '#a855f7',
    badge: '/organization',
  },
] as const;

export default function DemoLoginPage() {
  const loginMutation = useLogin();

  const [selectedKey, setSelectedKey] = useState<string>('CUSTOMER');
  const [email, setEmail] = useState<string>('customer@swiftdrop.lk');
  const [password, setPassword] = useState<string>('password123');
  const [error, setError] = useState<string | null>(null);

  const currentPreset =
    SEEDED_ACCOUNTS.find((a) => a.key === selectedKey) || SEEDED_ACCOUNTS[0];

  const handleSelectAccount = (account: (typeof SEEDED_ACCOUNTS)[number]) => {
    setSelectedKey(account.key);
    setEmail(account.email);
    setPassword('password123');
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      // Authenticate strictly through the Identity Service; role redirection is
      // resolved automatically from the backend JWT/AuthResponse in useLogin().
      await loginMutation.mutateAsync({ email, password });
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#070d18] p-6">
      <div className="w-full max-w-lg bg-[#0c1829] border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Home
          </Link>
          <Link
            href="/login"
            className="text-xs font-semibold text-sky-400 hover:text-sky-300"
          >
            Standard Login
          </Link>
        </div>

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-700 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Sparkles size={18} color="#ffffff" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Swift<span className="text-sky-400">Drop</span>
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Quick-Fill Seeded Accounts (Authenticated via Identity Service)
          </p>
        </div>

        <div className="mb-5">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
            Select Seeded Account Credential Preset:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SEEDED_ACCOUNTS.map((preset) => {
              const Icon = preset.icon;
              const isSelected = selectedKey === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => handleSelectAccount(preset)}
                  style={{
                    borderColor: isSelected ? preset.color : 'rgba(255,255,255,0.08)',
                    background: isSelected
                      ? 'rgba(30, 58, 138, 0.35)'
                      : 'rgba(15, 23, 42, 0.6)',
                  }}
                  className="p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Icon size={17} color={isSelected ? preset.color : '#64748b'} />
                  <span
                    className={`text-xs ${
                      isSelected ? 'font-bold text-white' : 'font-medium text-slate-400'
                    }`}
                  >
                    {preset.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 mb-5 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-white">
              {currentPreset.title} Account
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {currentPreset.description}
            </div>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 whitespace-nowrap">
            {currentPreset.badge}
          </span>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Email address
            </label>
            <div className="relative">
              <Mail
                size={15}
                color="#64748b"
                className="absolute left-3 top-1/2 -translate-y-1/2"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full py-2.5 pl-9 pr-3 rounded-lg bg-slate-900/80 border border-white/15 text-white text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock
                size={15}
                color="#64748b"
                className="absolute left-3 top-1/2 -translate-y-1/2"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full py-2.5 pl-9 pr-3 rounded-lg bg-slate-900/80 border border-white/15 text-white text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="py-3 px-4 rounded-lg bg-gradient-to-r from-blue-700 to-blue-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 hover:from-blue-600 hover:to-blue-500 disabled:opacity-50 cursor-pointer"
          >
            {loginMutation.isPending ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                <span>Authenticating with Identity Service...</span>
              </>
            ) : (
              <>
                <span>Sign in as {currentPreset.title}</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
