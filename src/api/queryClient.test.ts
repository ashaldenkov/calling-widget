import { QueryClient } from '@tanstack/preact-query';

import { defaultQueryFn } from './defaultQueryFn';
import { queryClient } from './queryClient';

it('is a QueryClient configured with the default query fn and retry options', () => {
  expect(queryClient).toBeInstanceOf(QueryClient);

  const defaults = queryClient.getDefaultOptions();
  expect(defaults.queries?.queryFn).toBe(defaultQueryFn);
  expect(defaults.queries?.retry).toBe(2);
  expect(defaults.queries?.retryDelay).toBe(2000);
  expect(defaults.queries?.staleTime).toBe(1000 * 60 * 5);
  expect(defaults.mutations?.retry).toBe(2);
  expect(defaults.mutations?.retryDelay).toBe(2000);
});
