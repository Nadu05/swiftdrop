import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'SwiftDrop — Microservices Delivery Management Platform',
  description: 'Enterprise delivery management microservices platform for centralized operations, dispatching, and tracking.',
};

/**
 * Root layout — wraps ALL routes with React Query Providers.
 * The Sidebar is rendered by the (platform) group layout instead.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
