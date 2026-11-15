'use client';

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeQueryClient } from '@/lib/query-client';

/**
 * TanStack Query Provider for Organization Admin (agents/agent.frontend.md §5).
 * Creates one QueryClient per browser session stored in React state, preventing
 * state leaks across SSR requests.
 */
export default function OrganizationProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(makeQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

