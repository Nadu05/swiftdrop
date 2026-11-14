import { QueryClient } from '@tanstack/react-query';

/**
 * Creates a QueryClient with SwiftDrop defaults (agents/agent.frontend.md §5):
 * - reads retry once, but never on 401/403/404/409/422 (retrying will not help)
 * - writes (assign, accept, deliver...) are never retried automatically
 */
const NO_RETRY_STATUSES = new Set([400, 401, 403, 404, 409, 422]);

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          const status = (error as { status?: number })?.status;
          if (status && NO_RETRY_STATUSES.has(status)) return false;
          return failureCount < 1;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
