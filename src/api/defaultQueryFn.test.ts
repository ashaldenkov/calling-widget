import type { QueryFunctionContext } from '@tanstack/preact-query';

vi.mock('./api', () => ({
  api: vi.fn(),
}));

import { api } from './api';
import { defaultQueryFn } from './defaultQueryFn';

const makeCtx = (queryKey: unknown[]): QueryFunctionContext =>
  ({ queryKey }) as unknown as QueryFunctionContext;

beforeEach(() => {
  vi.clearAllMocks();
});

it('forwards the url from queryKey[0] with the params from queryKey[1]', async () => {
  vi.mocked(api).mockResolvedValue({ ok: true });

  const result = await defaultQueryFn<{ ok: boolean }>(
    makeCtx(['/statuses', { clientId: 'c-1' }]),
  );

  expect(api).toHaveBeenCalledWith('/statuses', {
    params: { clientId: 'c-1' },
  });
  expect(result).toEqual({ ok: true });
});

it('passes undefined params when queryKey has only a url', async () => {
  vi.mocked(api).mockResolvedValue([]);

  await defaultQueryFn(makeCtx(['/trunks']));

  expect(api).toHaveBeenCalledWith('/trunks', { params: undefined });
});
