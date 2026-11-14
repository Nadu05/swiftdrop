'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Box,
  Search,
  Truck,
  ShieldCheck,
  Building2,
  Clock,
  MapPin,
  ArrowRight,
  PackageCheck,
  Store,
  UserCheck,
  CheckCircle2,
  PhoneCall,
  Mail,
  Globe,
  LogIn,
  UserPlus,
  Menu,
  X,
  Layers,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/api/use-auth';
import { useAuthStore } from '@/store/auth.store';
import { resolveDashboardRoute } from '@/lib/auth/role-resolver';

const FEATURES = [
  {
    icon: Truck,
    title: 'Hub-and-Spoke Express Dispatch',
    description:
      'Automated origin branch pickup assignment, linehaul manifest transfers, and last-mile courier dispatch across all regional hubs.',
  },
  {
    icon: MapPin,
    title: 'Real-Time Milestone Tracking',
    description:
      'Live shipment visibility from booking confirmation and hub sorting to out-for-delivery and verified proof-of-delivery.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified Proof of Delivery (POD)',
    description:
      'Recipient OTP/PIN verification, signature capture, and automated Return-to-Sender (RTS) workflows for failed attempts.',
  },
  {
    icon: Store,
    title: 'Enterprise Merchant Integration',
    description:
      'Dedicated merchant portal with streamlined onboarding approval, bulk shipment management, and Cash-on-Delivery (COD) reconciliation.',
  },
  {
    icon: Building2,
    title: 'Multi-Branch Network Governance',
    description:
      'Branch managers and dispatchers coordinate incoming/outgoing inter-branch manifests and real-time courier fleet capacity.',
  },
  {
    icon: Clock,
    title: 'Instant Dynamic Rate Quotes',
    description:
      'Transparent pricing based on parcel weight, service tier (Same-Day, Express, Standard), and origin-destination zone distance.',
  },
];

const HUB_LOCATIONS = [
  { name: 'Colombo Central Hub', code: 'CMB-01', coverage: 'Western Province & Express Metro' },
  { name: 'Kandy Regional Hub', code: 'KDY-01', coverage: 'Central & Hill Country Corridor' },
  { name: 'Galle Southern Hub', code: 'GAL-01', coverage: 'Southern Coastal & Highway Network' },
  { name: 'Negombo Logistics Hub', code: 'NEG-01', coverage: 'Airport & North-Western Corridor' },
];

export default function SwiftDropLandingPage() {
  const router = useRouter();
  const { data: currentUser, isLoading } = useCurrentUser();
  const storedUser = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  const activeUser = currentUser || storedUser;

  const [trackingQuery, setTrackingQuery] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Phase 2 requirement: If the user is already authenticated, automatically redirect
  // to their role-specific dashboard.
  useEffect(() => {
    if (isInitialized && !isLoading && activeUser) {
      const targetDashboard = resolveDashboardRoute(activeUser, activeRole);
      router.replace(targetDashboard);
    }
  }, [isInitialized, isLoading, activeUser, activeRole, router]);

  const handleTrackingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = trackingQuery.trim();
    if (trimmed) {
      router.push(`/tracking?trackingNumber=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/tracking');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#060d1a] text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-blue-500/15 bg-[#071122]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 text-decoration-none">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Box className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-white">
                Swift<span className="text-sky-400">Drop</span>
              </span>
              <span className="block text-[11px] font-medium text-slate-400">
                Logistics &amp; Delivery Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#tracking" className="hover:text-sky-400 transition-colors">
              Track Parcel
            </a>
            <a href="#services" className="hover:text-sky-400 transition-colors">
              Services
            </a>
            <a href="#solutions" className="hover:text-sky-400 transition-colors">
              Customers &amp; Merchants
            </a>
            <a href="#network" className="hover:text-sky-400 transition-colors">
              Hub Network
            </a>
          </nav>

          {/* Auth Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {activeUser ? (
              <Link
                href={resolveDashboardRoute(activeUser, activeRole)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 transition-all"
              >
                <span>Open My Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-400/25 bg-slate-900/60 hover:bg-slate-800 text-slate-100 text-sm font-semibold transition-colors"
                >
                  <LogIn className="h-4 w-4 text-sky-400" />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 transition-all"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Create Account</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            className="md:hidden p-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white"
            aria-label="Toggle Menu"
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileNavOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#081326] px-4 py-5 space-y-4">
            <div className="flex flex-col space-y-2.5 text-sm font-medium text-slate-300">
              <a
                href="#tracking"
                onClick={() => setMobileNavOpen(false)}
                className="py-1.5 hover:text-sky-400"
              >
                Track Parcel
              </a>
              <a
                href="#services"
                onClick={() => setMobileNavOpen(false)}
                className="py-1.5 hover:text-sky-400"
              >
                Services &amp; Features
              </a>
              <a
                href="#solutions"
                onClick={() => setMobileNavOpen(false)}
                className="py-1.5 hover:text-sky-400"
              >
                Customers &amp; Merchants
              </a>
              <a
                href="#network"
                onClick={() => setMobileNavOpen(false)}
                className="py-1.5 hover:text-sky-400"
              >
                Hub Network
              </a>
            </div>
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5">
              <Link
                href="/login"
                className="w-full py-2.5 rounded-xl border border-blue-400/30 text-center text-sm font-semibold text-white"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="w-full py-2.5 rounded-xl bg-blue-600 text-center text-sm font-semibold text-white"
              >
                Create Account
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section + Parcel Tracking Entry Point */}
      <section
        id="tracking"
        className="relative overflow-hidden py-16 sm:py-24 lg:py-28 border-b border-blue-500/15"
        style={{
          background:
            'radial-gradient(circle at 20% 20%, rgba(29, 78, 216, 0.22), transparent 45%), radial-gradient(circle at 80% 30%, rgba(14, 165, 233, 0.14), transparent 45%), #060d1a',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Hero Copy */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/25 text-sky-400 text-xs font-semibold">
                <Layers className="h-3.5 w-3.5" />
                <span>Island-Wide Hub-and-Spoke Delivery Network</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
                Reliable Parcel Logistics Built for{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">
                  Every Mile.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                SwiftDrop connects customers, e-commerce merchants, field couriers, regional
                dispatchers, and branch hubs on one unified logistics platform—from instant
                parcel booking to verified proof of delivery.
              </p>

              {/* Live Parcel Tracking Bar */}
              <div className="p-2 sm:p-2.5 rounded-2xl bg-[#0c1a30]/95 border border-blue-400/30 shadow-2xl max-w-2xl">
                <form
                  onSubmit={handleTrackingSubmit}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                >
                  <div className="relative flex-1">
                    <Search className="h-5 w-5 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={trackingQuery}
                      onChange={(e) => setTrackingQuery(e.target.value)}
                      placeholder="Enter tracking number (e.g. SD-2026-0001)"
                      aria-label="Enter tracking number"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-sky-400"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer shrink-0"
                  >
                    <span>Track Shipment</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
                <div className="px-3 pt-2 pb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <span>Real-time milestone updates without logging in</span>
                  <Link
                    href="/tracking"
                    className="text-sky-400 hover:text-sky-300 font-semibold"
                  >
                    Open Full Tracking Portal &rarr;
                  </Link>
                </div>
              </div>

              {/* Quick CTA Actions */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-950 hover:bg-slate-100 font-bold text-sm transition-colors"
                >
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-blue-400/30 bg-blue-500/10 hover:bg-blue-500/20 text-sky-300 font-semibold text-sm transition-colors"
                >
                  <span>Create Customer Account</span>
                </Link>
              </div>
            </div>

            {/* Hero Right Operational Card */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-[#0b172a] border border-blue-500/25 p-6 sm:p-7 shadow-2xl space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                      Unified Entry Point
                    </span>
                    <h2 className="text-lg font-bold text-white mt-0.5">
                      Role-Based Operational Portals
                    </h2>
                  </div>
                  <PackageCheck className="h-7 w-7 text-sky-400" />
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Sign in once through our centralized authentication gateway. SwiftDrop
                  automatically identifies your verified account role and routes you directly
                  to your operational workspace:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10">
                    <div className="font-bold text-sky-400">Customer Portal</div>
                    <p className="text-slate-400 mt-1">
                      Book deliveries, calculate rates, and track active parcels.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10">
                    <div className="font-bold text-indigo-400">Merchant Portal</div>
                    <p className="text-slate-400 mt-1">
                      Manage business orders, COD shipments, and merchant onboarding.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10">
                    <div className="font-bold text-emerald-400">Courier App</div>
                    <p className="text-slate-400 mt-1">
                      Execute assigned pickups, hub drop-offs, and POD verification.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10">
                    <div className="font-bold text-amber-400">Dispatch &amp; Branch</div>
                    <p className="text-slate-400 mt-1">
                      Assign couriers, manage inter-branch manifests, and monitor hubs.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Protected by JWT + HttpOnly Session Security
                  </span>
                  <Link
                    href="/login"
                    className="font-bold text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
                  >
                    Access Portal <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features & Service Overview Section */}
      <section id="services" className="py-20 bg-[#081223] border-b border-blue-500/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
              Platform Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
              End-to-End Delivery Management
            </h2>
            <p className="text-sm sm:text-base text-slate-400 mt-3">
              Engineered on a resilient microservices architecture to handle high-volume retail,
              merchant, and inter-branch parcel operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="p-6 rounded-2xl bg-[#0c1930] border border-blue-500/15 hover:border-sky-400/40 transition-all flex flex-col gap-3"
                >
                  <div className="w-11 h-11 rounded-xl bg-blue-600/15 border border-blue-400/25 flex items-center justify-center text-sky-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white">{feat.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feat.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Customer & Merchant Solutions Section */}
      <section id="solutions" className="py-20 bg-[#060d1a] border-b border-blue-500/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* For Individual Customers */}
            <div className="rounded-2xl bg-gradient-to-br from-[#0c1a33] to-[#091326] border border-blue-500/20 p-8 flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/15 text-sky-400 text-xs font-bold">
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>For Personal &amp; Retail Senders</span>
                </div>
                <h3 className="text-2xl font-extrabold text-white">
                  Doorstep Pickup &amp; Live Parcel Tracking
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Schedule a parcel pickup from your home or office in minutes. Get instant
                  weight-based quotes, real-time notifications at every hub checkpoint, and
                  secure PIN-verified delivery.
                </p>
                <ul className="space-y-2.5 text-sm text-slate-300 pt-2">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Instant online rate calculator &amp; booking wizard</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Live milestone timeline &amp; delivery history</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Google OAuth &amp; email/password single sign-on</span>
                  </li>
                </ul>
              </div>

              <div className="pt-2 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
                >
                  <span>Register as Customer</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 hover:bg-white/5 text-slate-200 text-sm font-semibold"
                >
                  <span>Customer Sign In</span>
                </Link>
              </div>
            </div>

            {/* For E-Commerce & Business Merchants */}
            <div className="rounded-2xl bg-gradient-to-br from-[#101c38] to-[#0a1428] border border-indigo-500/25 p-8 flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 text-xs font-bold">
                  <Store className="h-3.5 w-3.5" />
                  <span>For E-Commerce &amp; Enterprise Merchants</span>
                </div>
                <h3 className="text-2xl font-extrabold text-white">
                  Scale Your Fulfillment with SwiftDrop Business
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Built for online stores and commercial shippers. Manage all outbound orders,
                  monitor pending and completed deliveries, and track Cash-on-Delivery (COD)
                  collections from your dedicated Merchant Dashboard.
                </p>
                <ul className="space-y-2.5 text-sm text-slate-300 pt-2">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-sky-400 shrink-0" />
                    <span>Dedicated Merchant Dashboard (`/merchant/dashboard`)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-sky-400 shrink-0" />
                    <span>Verified merchant onboarding &amp; branch assignment</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-sky-400 shrink-0" />
                    <span>Automated return-to-sender (RTS) protection</span>
                  </li>
                </ul>
              </div>

              <div className="pt-2 flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold"
                >
                  <span>Merchant Portal Login</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 hover:bg-white/5 text-slate-200 text-sm font-semibold"
                >
                  <span>Apply for Merchant Account</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Regional Hub Coverage Network */}
      <section id="network" className="py-16 bg-[#081223] border-b border-blue-500/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
                Regional Operations
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                Connected Branch &amp; Sorting Hubs
              </h2>
            </div>
            <Link
              href="/tracking"
              className="text-sm font-semibold text-sky-400 hover:text-sky-300 inline-flex items-center gap-1.5"
            >
              <span>Check live parcel status</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {HUB_LOCATIONS.map((hub) => (
              <div
                key={hub.code}
                className="p-5 rounded-xl bg-[#0c1930] border border-white/10 flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded bg-blue-500/15 text-sky-400 font-mono text-xs font-bold">
                    {hub.code}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    ACTIVE
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{hub.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{hub.coverage}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-[#040914] border-t border-white/10 py-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-white/10">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Box className="h-4 w-4 text-white" />
                </div>
                <span className="text-base font-extrabold text-white">
                  Swift<span className="text-sky-400">Drop</span>
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Next-generation national parcel delivery and hub-and-spoke logistics management
                platform.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white uppercase tracking-wider mb-3">
                Quick Navigation
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/tracking" className="hover:text-sky-400">
                    Track a Parcel
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-sky-400">
                    Unified Portal Sign In
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="hover:text-sky-400">
                    Customer Registration
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white uppercase tracking-wider mb-3">
                Role Workspaces
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/customer/dashboard" className="hover:text-sky-400">
                    Customer Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/merchant/dashboard" className="hover:text-sky-400">
                    Merchant Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/courier/dashboard" className="hover:text-sky-400">
                    Courier Field App
                  </Link>
                </li>
                <li>
                  <Link href="/dispatcher/dashboard" className="hover:text-sky-400">
                    Dispatcher Command Center
                  </Link>
                </li>
                <li>
                  <Link href="/branch/dashboard" className="hover:text-sky-400">
                    Branch Admin Portal
                  </Link>
                </li>
                <li>
                  <Link href="/admin/dashboard" className="hover:text-sky-400">
                    System Admin Portal
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white uppercase tracking-wider mb-3">
                Head Office &amp; Support
              </h4>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                  <span>No. 120, Union Place, Colombo 02, Sri Lanka</span>
                </li>
                <li className="flex items-center gap-2">
                  <PhoneCall className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                  <span>+94 11 234 5678 (24/7 Operations Desk)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                  <span>support@swiftdrop.lk</span>
                </li>
                <li className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                  <span>swiftdrop.lk</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>&copy; {new Date().getFullYear()} SwiftDrop Logistics (Pvt) Ltd. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link href="/tracking" className="hover:text-white">
                Public Tracking
              </Link>
              <Link href="/login" className="hover:text-white">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
