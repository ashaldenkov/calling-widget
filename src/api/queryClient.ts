import { QueryClient } from '@tanstack/react-query';

import { defaultQueryFn } from './defaultQueryFn';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      retry: 2,
      retryDelay: 2000,
      staleTime: 1000 * 60 * 5,
    },
    mutations: {
      retry: 2,
      retryDelay: 2000,
    },
  },
});
