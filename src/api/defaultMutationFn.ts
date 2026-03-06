import type { MutationFunctionContext } from '@tanstack/react-query';

import { api } from './api';

export type MutationMeta = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  invalidate?: string[];
  params?: Record<string, unknown>;
};

export const defaultMutationFn = async <TData, TVariables>(
  variables: TVariables,
  context: MutationFunctionContext,
): Promise<TData> => {
  const { meta, mutationKey } = context as {
    meta: MutationMeta | undefined;
    mutationKey?: unknown[];
  };

  const method = meta?.method?.toLowerCase() ?? 'post';

  if (!mutationKey || mutationKey.length === 0) {
    throw new Error('Mutation key is required');
  }

  const urlParts = mutationKey
    .filter((part) => part !== null && part !== undefined)
    .filter((part) => typeof part === 'string' || typeof part === 'number')
    .map((part) => String(part));

  const url = '/' + urlParts.join('/');

  return api<TData>(url, {
    method,
    ...(method === 'get'
      ? {
          params: {
            ...(variables as Record<string, unknown>),
            ...meta?.params,
          },
        }
      : {
          data: variables,
          ...(meta?.params && { params: meta.params }),
        }),
  });
};
