import { QueryClient } from '@tanstack/preact-query';

// Backendless demo: queries provide their own local queryFn (see
// ChangeStatusScreen). No default fetch-based queryFn.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
});
