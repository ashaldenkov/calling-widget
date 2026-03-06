import type { QueryFunctionContext } from '@tanstack/react-query';

import { api } from './api';

export const defaultQueryFn = async <T>({
  queryKey,
}: QueryFunctionContext): Promise<T> => {
  const url = queryKey[0] as string;
  const params = queryKey[1] as Record<string, unknown> | undefined;

  return api<T>(url, { params });
};
