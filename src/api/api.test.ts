vi.mock('../stores/authStore', () => ({
  getToken: vi.fn(),
  authenticate: vi.fn(),
  clearAuth: vi.fn(),
}));

import { authenticate, getToken } from '../stores/authStore';
import { setConfig } from '../stores/widgetStore';
import { resetWidgetState } from '../test/resetWidgetState';

import { api } from './api';

const okResponse = (body: unknown) =>
  ({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  }) as Response;

const errResponse = (status: number, body = '') =>
  ({
    ok: false,
    status,
    text: () => Promise.resolve(body),
  }) as Response;

beforeEach(() => {
  resetWidgetState();
  setConfig({
    apiBaseUrl: 'https://api.test',
    webBaseUrl: 'https://web.test',
    janusWsUrl: 'wss://janus.test',
  });
  vi.restoreAllMocks();
  vi.mocked(getToken).mockReturnValue('tok-1');
  vi.mocked(authenticate).mockReset();
});

it('attaches the current token as a Bearer header', async () => {
  const fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(okResponse({ ok: true }));

  await api('/statuses');

  const [, init] = fetchSpy.mock.calls[0];
  expect((init?.headers as Record<string, string>).Authorization).toBe(
    'Bearer tok-1',
  );
});

it('on 401, re-authenticates and replays the request once with the new token', async () => {
  vi.mocked(authenticate).mockImplementation(() => {
    vi.mocked(getToken).mockReturnValue('tok-2');
    return Promise.resolve('tok-2');
  });
  const fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(errResponse(401))
    .mockResolvedValueOnce(okResponse({ ok: true }));

  const result = await api<{ ok: boolean }>('/statuses');

  expect(result).toEqual({ ok: true });
  expect(authenticate).toHaveBeenCalledTimes(1);
  expect(fetchSpy).toHaveBeenCalledTimes(2);
  const [, secondInit] = fetchSpy.mock.calls[1];
  expect((secondInit?.headers as Record<string, string>).Authorization).toBe(
    'Bearer tok-2',
  );
});

it('throws (without retrying again) when re-auth fails after a 401', async () => {
  vi.mocked(authenticate).mockResolvedValue(null);
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(errResponse(401));

  await expect(api('/statuses')).rejects.toThrow();
  expect(authenticate).toHaveBeenCalledTimes(1);
});

it('appends primitive params as strings and object params as JSON, skipping null/undefined', async () => {
  const fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(okResponse({ ok: true }));

  await api('/statuses', {
    params: {
      clientId: 'c-1',
      page: 2,
      filter: { active: true },
      skipUndefined: undefined,
      skipNull: null,
    },
  });

  const [calledUrl] = fetchSpy.mock.calls[0];
  const url = new URL(calledUrl as string);
  expect(url.searchParams.get('clientId')).toBe('c-1');
  expect(url.searchParams.get('page')).toBe('2');
  expect(url.searchParams.get('filter')).toBe(JSON.stringify({ active: true }));
  expect(url.searchParams.has('skipUndefined')).toBe(false);
  expect(url.searchParams.has('skipNull')).toBe(false);
});

it('maps a JSON error body via its error field', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    errResponse(400, JSON.stringify({ error: 'Bad client id' })),
  );

  await expect(api('/statuses')).rejects.toThrow('Bad client id');
});

it('falls back to the message field when a JSON error body has no error field', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    errResponse(400, JSON.stringify({ message: 'From message field' })),
  );

  await expect(api('/statuses')).rejects.toThrow('From message field');
});

it('treats an unreadable error body as empty text', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: false,
    status: 500,
    text: () => Promise.reject(new Error('stream error')),
  } as unknown as Response);

  await expect(api('/statuses')).rejects.toThrow();
});

it('throws before fetching when the widget is not initialized', async () => {
  resetWidgetState();
  const fetchSpy = vi.spyOn(globalThis, 'fetch');

  await expect(api('/statuses')).rejects.toThrow('Widget not initialized');
  expect(fetchSpy).not.toHaveBeenCalled();
});

it('sends an empty bearer token, JSON body, and abort signal when configured', async () => {
  vi.mocked(getToken).mockReturnValue(null);
  const controller = new AbortController();
  const fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(okResponse({ ok: true }));

  await api('/statuses', {
    method: 'POST',
    data: { foo: 'bar' },
    signal: controller.signal,
  });

  const [, init] = fetchSpy.mock.calls[0];
  expect((init?.headers as Record<string, string>).Authorization).toBe(
    'Bearer ',
  );
  expect(init?.body).toBe(JSON.stringify({ foo: 'bar' }));
  expect(init?.signal).toBe(controller.signal);
});

it('retries at most once — a second 401 after re-auth surfaces the error', async () => {
  vi.mocked(authenticate).mockResolvedValue('tok-2');
  const fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(errResponse(401));

  await expect(api('/statuses')).rejects.toThrow();
  // initial + one retry only
  expect(fetchSpy).toHaveBeenCalledTimes(2);
  expect(authenticate).toHaveBeenCalledTimes(1);
});
