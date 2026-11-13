'use client';

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeQueryClient } from '@/lib/query-client';

/**
 * TanStack Query provider for the courier portal.
 * One QueryClient per browser session (created in state, never shared across
 * server requests). Scoped to the courier layout so other areas are unaffected
 * until the team adds an app-wide providers.tsx.
 */
export default function CourierProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
