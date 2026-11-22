'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Box,
  Truck,
  Clock,
  Building2,
  Search,
  ShieldCheck,
  Store,
  MapPin,
  ArrowRight,
  CheckCircle2,
  PhoneCall,
  Mail,
  Globe,
  Menu,
  X,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/api/use-auth';
import { useAuthStore } from '@/store/auth.store';
import { resolveDashboardRoute } from '@/lib/auth/role-resolver';

export default function SwiftDropLandingPage() {
  const router = useRouter();
  const { data: currentUser, isLoading } = useCurrentUser();
  const storedUser = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  const activeUser = currentUser || storedUser;

  const [trackingNumber, setTrackingNumber] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auto-redirect authenticated users to their authoritative dashboard
  useEffect(() => {
    if (isInitialized && !isLoading && activeUser) {
      const targetDashboard = resolveDashboardRoute(activeUser, activeRole);
      router.replace(targetDashboard);
    }
  }, [isInitialized, isLoading, activeUser, activeRole, router]);

  const handleTrackingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = trackingNumber.trim();
    if (query) {
      router.push(`/tracking?trackingNumber=${encodeURIComponent(query)}`);
    } else {
      router.push('/tracking');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#07101e', color: '#f8fafc', fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif" }}>
      {/* ─── Top Navigation Bar ────────────────────────────────────────────── */}
      <header style={headerStyle}>
        <div style={headerContainerStyle}>
          {/* Logo & Brand */}
          <Link href="/" style={logoLinkStyle}>
            <div style={logoBoxStyle}>
              <Box size={22} color="#ffffff" strokeWidth={2.4} />
            </div>
            <span style={logoTextStyle}>SwiftDrop</span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav style={desktopNavStyle}>
            <a href="#services" style={navLinkStyle}>Services</a>
            <a href="#how-it-works" style={navLinkStyle}>How It Works</a>
            <a href="#branches" style={navLinkStyle}>Branches</a>
            <a href="#merchants" style={navLinkStyle}>Merchants</a>
            <a href="#support" style={navLinkStyle}>Support</a>
          </nav>

          {/* Action Buttons */}
          <div style={authButtonsContainerStyle}>
            <Link href="/register" style={registerBtnStyle}>
              Register
            </Link>
            <Link href="/login" style={loginBtnStyle}>
              Log In
            </Link>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={mobileMenuToggleStyle}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div style={mobileDropdownStyle}>
            <a href="#services" onClick={() => setMobileMenuOpen(false)} style={mobileNavLinkStyle}>Services</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} style={mobileNavLinkStyle}>How It Works</a>
            <a href="#branches" onClick={() => setMobileMenuOpen(false)} style={mobileNavLinkStyle}>Branches</a>
            <a href="#merchants" onClick={() => setMobileMenuOpen(false)} style={mobileNavLinkStyle}>Merchants</a>
            <a href="#support" onClick={() => setMobileMenuOpen(false)} style={mobileNavLinkStyle}>Support</a>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <Link href="/register" style={{ ...registerBtnStyle, flex: 1, textAlign: 'center' }}>
                Register
              </Link>
              <Link href="/login" style={{ ...loginBtnStyle, flex: 1, textAlign: 'center' }}>
                Log In
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ─── Hero Section with Doorstep Delivery Background ───────────────── */}
      <section style={heroSectionStyle}>
        <div style={heroOverlayStyle} />

        <div style={heroContentContainerStyle}>
          {/* Centered Headline */}
          <h1 style={heroHeadlineStyle}>
            Reliable Delivery<br />Across Sri Lanka
          </h1>

          {/* 3 Action Shortcut Cards */}
          <div style={cardsRowStyle}>
            {/* Card 1: Our Services */}
            <a href="#services" style={cardDarkStyle}>
              <div style={cardIconWrapperStyle}>
                <Truck size={30} color="#ffffff" strokeWidth={2} />
              </div>
              <span style={cardTextWhiteStyle}>Our<br />Services</span>
            </a>

            {/* Card 2: Schedule Pickup */}
            <Link href="/book" style={cardBlueStyle}>
              <div style={cardIconWrapperStyle}>
                <Clock size={30} color="#ffffff" strokeWidth={2} />
              </div>
              <span style={cardTextWhiteStyle}>Schedule<br />Pickup</span>
            </Link>

            {/* Card 3: Branch Network */}
            <a href="#branches" style={cardWhiteStyle}>
              <div style={cardIconWrapperStyle}>
                <Building2 size={30} color="#1d68ed" strokeWidth={2} />
              </div>
              <span style={cardTextDarkStyle}>Branch<br />Network</span>
            </a>
          </div>

          {/* Quick Tracking Search Bar */}
          <form onSubmit={handleTrackingSubmit} style={trackingFormStyle}>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter Tracking ID (e.g., SD-884920)"
              style={trackingInputStyle}
            />
            <button type="submit" style={trackingSubmitBtnStyle}>
              TRACK PARCEL
            </button>
          </form>
        </div>
      </section>

      {/* ─── Services Overview Section ────────────────────────────────────── */}
      <section id="services" style={sectionContainerStyle}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span style={sectionBadgeStyle}>OUR SERVICES</span>
          <h2 style={sectionTitleStyle}>Comprehensive Logistics Across the Island</h2>
          <p style={sectionSubtitleStyle}>From express same-day city delivery to nationwide freight and enterprise merchant distribution.</p>
        </div>

        <div style={servicesGridStyle}>
          <div style={serviceCardStyle}>
            <div style={serviceIconCircleStyle('#2563eb')}>
              <Truck size={24} color="#ffffff" />
            </div>
            <h3 style={serviceCardTitleStyle}>Express &amp; Same-Day</h3>
            <p style={serviceCardDescStyle}>Fast, high-priority intra-city delivery with real-time GPS tracking and live recipient ETA alerts.</p>
          </div>

          <div style={serviceCardStyle}>
            <div style={serviceIconCircleStyle('#0284c7')}>
              <Building2 size={24} color="#ffffff" />
            </div>
            <h3 style={serviceCardTitleStyle}>Inter-Branch Linehaul</h3>
            <p style={serviceCardDescStyle}>Scheduled nightly manifest transport connecting all 25 districts through centralized sorting hubs.</p>
          </div>

          <div style={serviceCardStyle}>
            <div style={serviceIconCircleStyle('#10b981')}>
              <ShieldCheck size={24} color="#ffffff" />
            </div>
            <h3 style={serviceCardTitleStyle}>Verified POD Delivery</h3>
            <p style={serviceCardDescStyle}>Digital proof-of-delivery with secure recipient PIN verification and immediate electronic receipts.</p>
          </div>

          <div style={serviceCardStyle}>
            <div style={serviceIconCircleStyle('#8b5cf6')}>
              <Store size={24} color="#ffffff" />
            </div>
            <h3 style={serviceCardTitleStyle}>Merchant COD Remittance</h3>
            <p style={serviceCardDescStyle}>Automated Cash-on-Delivery collection, fast bank account remittance, and real-time ledger auditing.</p>
          </div>
        </div>
      </section>

      {/* ─── Branches & Coverage Section ─────────────────────────────────── */}
      <section id="branches" style={{ ...sectionContainerStyle, backgroundColor: '#091426' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={sectionBadgeStyle}>BRANCH COVERAGE</span>
          <h2 style={sectionTitleStyle}>Nationwide Sorting Hubs &amp; Drop-off Centers</h2>
          <p style={sectionSubtitleStyle}>Strategically located branches ensuring seamless delivery from Point Pedro to Dondra Head.</p>
        </div>

        <div style={branchesGridStyle}>
          {[
            { name: 'Colombo Central Hub', address: '124 D.R. Wijewardena Mawatha, Colombo 10', code: 'CMB-01' },
            { name: 'Kandy Regional Hub', address: '45 William Gopallawa Mawatha, Kandy', code: 'KDY-01' },
            { name: 'Galle Southern Hub', address: '88 Matara Road, Galle', code: 'GAL-01' },
            { name: 'Negombo Logistics Hub', address: '12 Colombo Road, Negombo', code: 'NEG-01' },
          ].map((branch) => (
            <div key={branch.code} style={branchCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#ffffff' }}>{branch.name}</div>
                <span style={branchCodeBadgeStyle}>{branch.code}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.75rem', color: '#94a3b8', fontSize: '0.825rem' }}>
                <MapPin size={15} color="#38bdf8" />
                <span>{branch.address}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Merchants & Business Onboarding Section ─────────────────────── */}
      <section id="merchants" style={{ ...sectionContainerStyle, backgroundColor: '#07101e', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={sectionBadgeStyle}>FOR BUSINESSES &amp; MERCHANTS</span>
          <h2 style={sectionTitleStyle}>Power Your E-Commerce Delivery with SwiftDrop</h2>
          <p style={sectionSubtitleStyle}>
            From single-parcel dispatches to high-volume daily pickups, SwiftDrop provides end-to-end logistics with real-time tracking, COD collection, and dedicated merchant support.
          </p>
        </div>

        {/* 3 Step Merchant Workflow */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div style={serviceCardStyle}>
            <div style={serviceIconCircleStyle('#2563eb')}>
              <Store size={24} color="#ffffff" />
            </div>
            <h3 style={serviceCardTitleStyle}>1. Register &amp; Get Approved</h3>
            <p style={serviceCardDescStyle}>
              Submit your business registration details and pickup locations. Our Head Office administration reviews and approves applications within 1–3 business days.
            </p>
          </div>

          <div style={serviceCardStyle}>
            <div style={serviceIconCircleStyle('#059669')}>
              <Truck size={24} color="#ffffff" />
            </div>
            <h3 style={serviceCardTitleStyle}>2. Dispatch &amp; Schedule Pickups</h3>
            <p style={serviceCardDescStyle}>
              Create delivery orders directly in your Merchant Portal or connect via API. Dedicated couriers collect parcels directly from your warehouse or store.
            </p>
          </div>

          <div style={serviceCardStyle}>
            <div style={serviceIconCircleStyle('#d97706')}>
              <ShieldCheck size={24} color="#ffffff" />
            </div>
            <h3 style={serviceCardTitleStyle}>3. Live Tracking &amp; COD Payouts</h3>
            <p style={serviceCardDescStyle}>
              Monitor hub scans and recipient delivery status in real-time. Automated COD collection and prompt bank account remittance keep your cash flow healthy.
            </p>
          </div>
        </div>

        {/* Merchant CTAs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
          <Link
            href="/merchant-register"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.85rem 1.75rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#ffffff',
              backgroundColor: '#1d68ed',
              borderRadius: '10px',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(29, 104, 237, 0.45)',
            }}
          >
            <span>Register Your Business</span>
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.85rem 1.75rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: '#e2e8f0',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1.5px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              textDecoration: 'none',
            }}
          >
            <span>Merchant Login</span>
          </Link>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────────────── */}
      <footer id="support" style={footerStyle}>
        <div style={footerContainerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={logoBoxStyle}>
              <Box size={20} color="#ffffff" />
            </div>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>SwiftDrop</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>
            &copy; {new Date().getFullYear()} SwiftDrop Logistics (Pvt) Ltd. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
            <Link href="/tracking" style={footerLinkStyle}>Track Parcel</Link>
            <Link href="/login" style={footerLinkStyle}>Staff Portal</Link>
            <Link href="/merchant-register" style={footerLinkStyle}>Merchant Onboarding</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Inline Style Standards for Landing Page (Image 1 Exact Replication) ───────

const headerStyle: React.CSSProperties = {
  backgroundColor: '#07101e',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  position: 'sticky',
  top: 0,
  zIndex: 50,
  padding: '0.75rem 1.5rem',
};

const headerContainerStyle: React.CSSProperties = {
  maxWidth: '1280px',
  margin: '0 auto',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const logoLinkStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.65rem',
  textDecoration: 'none',
};

const logoBoxStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  backgroundColor: '#1d68ed',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const logoTextStyle: React.CSSProperties = {
  fontSize: '1.35rem',
  fontWeight: 800,
  color: '#ffffff',
  letterSpacing: '-0.02em',
};

const desktopNavStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '2rem',
};

const navLinkStyle: React.CSSProperties = {
  color: '#e2e8f0',
  textDecoration: 'none',
  fontSize: '0.875rem',
  fontWeight: 500,
  transition: 'color 0.15s ease',
};

const authButtonsContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.85rem',
};

const registerBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1.25rem',
  fontSize: '0.875rem',
  fontWeight: 600,
  color: '#ffffff',
  backgroundColor: 'transparent',
  border: '1.5px solid rgba(255, 255, 255, 0.75)',
  borderRadius: '8px',
  textDecoration: 'none',
  transition: 'all 0.15s ease',
};

const loginBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1.25rem',
  fontSize: '0.875rem',
  fontWeight: 600,
  color: '#ffffff',
  backgroundColor: '#1d68ed',
  border: 'none',
  borderRadius: '8px',
  textDecoration: 'none',
  boxShadow: '0 2px 8px rgba(29, 104, 237, 0.4)',
  transition: 'all 0.15s ease',
};

const mobileMenuToggleStyle: React.CSSProperties = {
  display: 'none',
  background: 'none',
  border: 'none',
  color: '#ffffff',
  cursor: 'pointer',
};

const mobileDropdownStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  padding: '1rem 0',
  borderTop: '1px solid rgba(255,255,255,0.08)',
};

const mobileNavLinkStyle: React.CSSProperties = {
  color: '#cbd5e1',
  textDecoration: 'none',
  fontSize: '0.95rem',
  fontWeight: 500,
};

const heroSectionStyle: React.CSSProperties = {
  position: 'relative',
  minHeight: '85vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundImage: "url('/landing-hero.jpg')",
  backgroundSize: 'cover',
  backgroundPosition: 'center center',
  backgroundRepeat: 'no-repeat',
  padding: '4rem 1.5rem',
  overflow: 'hidden',
};

const heroOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'radial-gradient(circle at center, rgba(7, 16, 30, 0.45) 0%, rgba(7, 16, 30, 0.75) 100%)',
};

const heroContentContainerStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 10,
  maxWidth: '720px',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
};

const heroHeadlineStyle: React.CSSProperties = {
  fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
  fontWeight: 800,
  color: '#ffffff',
  lineHeight: 1.15,
  letterSpacing: '-0.025em',
  margin: '0 0 2rem 0',
  textShadow: '0 4px 16px rgba(0, 0, 0, 0.6)',
};

const cardsRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: '1.25rem',
  flexWrap: 'wrap',
  marginBottom: '2rem',
  width: '100%',
};

const cardDarkStyle: React.CSSProperties = {
  width: '135px',
  height: '125px',
  backgroundColor: 'rgba(15, 28, 52, 0.95)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '16px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textDecoration: 'none',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
};

const cardBlueStyle: React.CSSProperties = {
  width: '135px',
  height: '125px',
  backgroundColor: '#1d68ed',
  borderRadius: '16px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textDecoration: 'none',
  boxShadow: '0 8px 24px rgba(29, 104, 237, 0.45)',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
};

const cardWhiteStyle: React.CSSProperties = {
  width: '135px',
  height: '125px',
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textDecoration: 'none',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
};

const cardIconWrapperStyle: React.CSSProperties = {
  marginBottom: '0.65rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const cardTextWhiteStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 700,
  color: '#ffffff',
  textAlign: 'center',
  lineHeight: 1.25,
};

const cardTextDarkStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 700,
  color: '#0f172a',
  textAlign: 'center',
  lineHeight: 1.25,
};

const trackingFormStyle: React.CSSProperties = {
  maxWidth: '560px',
  width: '100%',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35)',
  display: 'flex',
  padding: '5px 6px 5px 16px',
  boxSizing: 'border-box',
  alignItems: 'center',
};

const trackingInputStyle: React.CSSProperties = {
  flex: 1,
  border: 'none',
  outline: 'none',
  fontSize: '0.9rem',
  color: '#0f172a',
  padding: '0.5rem 0',
  backgroundColor: 'transparent',
};

const trackingSubmitBtnStyle: React.CSSProperties = {
  backgroundColor: '#1d68ed',
  color: '#ffffff',
  fontWeight: 700,
  fontSize: '0.8rem',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  border: 'none',
  borderRadius: '8px',
  padding: '0.75rem 1.4rem',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
};

const sectionContainerStyle: React.CSSProperties = {
  maxWidth: '1280px',
  margin: '0 auto',
  padding: '5rem 1.5rem',
  width: '100%',
  boxSizing: 'border-box',
};

const sectionBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  fontSize: '0.75rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: '#38bdf8',
  backgroundColor: 'rgba(56, 189, 248, 0.1)',
  border: '1px solid rgba(56, 189, 248, 0.2)',
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  marginBottom: '0.75rem',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '2.2rem',
  fontWeight: 800,
  color: '#ffffff',
  margin: '0 0 0.75rem 0',
  letterSpacing: '-0.02em',
};

const sectionSubtitleStyle: React.CSSProperties = {
  fontSize: '1rem',
  color: '#94a3b8',
  maxWidth: '640px',
  margin: '0 auto',
  lineHeight: 1.5,
};

const servicesGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: '1.5rem',
};

const serviceCardStyle: React.CSSProperties = {
  backgroundColor: '#0c1a30',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '16px',
  padding: '2rem 1.5rem',
};

const serviceIconCircleStyle = (color: string): React.CSSProperties => ({
  width: '46px',
  height: '46px',
  borderRadius: '12px',
  backgroundColor: color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '1.25rem',
});

const serviceCardTitleStyle: React.CSSProperties = {
  fontSize: '1.15rem',
  fontWeight: 700,
  color: '#ffffff',
  margin: '0 0 0.5rem 0',
};

const serviceCardDescStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: '#94a3b8',
  lineHeight: 1.5,
  margin: 0,
};

const branchesGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: '1.25rem',
};

const branchCardStyle: React.CSSProperties = {
  backgroundColor: '#07101e',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '12px',
  padding: '1.5rem',
};

const branchCodeBadgeStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 700,
  color: '#38bdf8',
  backgroundColor: 'rgba(56, 189, 248, 0.1)',
  padding: '0.2rem 0.5rem',
  borderRadius: '6px',
};

const footerStyle: React.CSSProperties = {
  backgroundColor: '#050c18',
  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  padding: '2rem 1.5rem',
};

const footerContainerStyle: React.CSSProperties = {
  maxWidth: '1280px',
  margin: '0 auto',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '1rem',
};

const footerLinkStyle: React.CSSProperties = {
  color: '#94a3b8',
  textDecoration: 'none',
};
