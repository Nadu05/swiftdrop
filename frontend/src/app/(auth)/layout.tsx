import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SwiftDrop — Authentication',
};

/**
 * Auth layout intentionally omits the Sidebar.
 * Login, Register, and Forgot Password pages render responsive full-viewport split-screen experiences.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
