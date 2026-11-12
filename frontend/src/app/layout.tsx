import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'SwiftDrop — Microservices Delivery Management Platform',
  description: 'Enterprise delivery management microservices platform for centralized operations, dispatching, and tracking.',
};

/**
 * Root layout — wraps ALL routes.
 * The Sidebar is NOT included here so that auth pages (login, register) 
 * render without it. The Sidebar is rendered by the (app) group layout instead.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
