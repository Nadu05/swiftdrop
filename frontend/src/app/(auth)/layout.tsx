import type { Metadata } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'SwiftDrop — Authentication',
};

/**
 * Auth layout intentionally omits the Sidebar.
 * Login and Register pages get a clean, centred layout.
 * Includes Google Identity Services (GIS) script for OAuth sign-in.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
      />
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem',
          background:
            'radial-gradient(circle at 15% 15%, rgba(37, 99, 235, 0.08) 0%, transparent 40%),' +
            'radial-gradient(circle at 85% 85%, rgba(99, 102, 241, 0.08) 0%, transparent 40%),' +
            'linear-gradient(to bottom, #070a14, #0a0e1a)',
        }}
      >
        {children}
      </div>
    </>
  );
}

