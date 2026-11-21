import type { Metadata } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'SwiftDrop — Authentication',
};

/**
 * Auth layout intentionally omits the Sidebar.
 * Login, Register, and Forgot Password pages render responsive full-viewport split-screen experiences.
 * Includes Google Identity Services (GIS) script for OAuth sign-in.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
      />
      {children}
    </>
  );
}
