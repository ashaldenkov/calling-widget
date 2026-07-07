import { ERR_GENERIC } from '../errors';
import { resetWidgetState } from '../test/resetWidgetState';

import { authenticate, authState, clearAuth, getToken } from './authStore';
import { setCallParams, setConfig, widgetState } from './widgetStore';

const MOCK_CONFIG = {
  apiBaseUrl: 'https://api.test',
  webBaseUrl: 'https://web.test',
  janusWsUrl: 'wss://janus.test',
};

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
  setConfig(MOCK_CONFIG);
  // Credentials live on widgetState (set from the `call` payload).
  setCallParams({ apiKey: 'key-abc', extCustomerId: 1, extAgentId: 7 });
  vi.restoreAllMocks();
});

describe('authenticate', () => {
  it('POSTs to /integration/auth with X-Api-Key header and agent_id body', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okResponse({ token: 'tok-1', expires_at: 'later' }));

    const token = await authenticate();

    expect(token).toBe('tok-1');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.test/integration/auth');
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>)['X-Api-Key']).toBe(
      'key-abc',
    );
    expect(init?.body).toBe(JSON.stringify({ agent_id: 7 }));
    expect(getToken()).toBe('tok-1');
  });

  it('returns null and clears the token on a failed response', async () => {
    authState.token = 'stale';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(errResponse(401));

    const token = await authenticate();

    expect(token).toBeNull();
    expect(getToken()).toBeNull();
  });

  it('captures the backend error message in authState.error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      errResponse(403, 'Invalid API key'),
    );

    await authenticate();

    expect(authState.error).toBe('Invalid API key');
  });

  it('prefers parsed.error, then parsed.message when the error body is JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      errResponse(400, JSON.stringify({ message: 'json message wins' })),
    );

    const token = await authenticate();

    expect(token).toBeNull();
    expect(authState.error).toBe('json message wins');
  });

  it('is single-flight — concurrent callers share one request', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okResponse({ token: 'tok-1' }));

    const [a, b] = await Promise.all([authenticate(), authenticate()]);

    expect(a).toBe('tok-1');
    expect(b).toBe('tok-1');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('returns null without a request when there are no credentials', async () => {
    widgetState.apiKey = null;
    widgetState.extAgentId = null;
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const token = await authenticate();

    expect(token).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fails with "Widget not initialized" when config is missing', async () => {
    widgetState.config = null; // credentials present, but no config
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const token = await authenticate();

    expect(token).toBeNull();
    expect(authState.error).toBe('Widget not initialized');
    expect(fetchSpy).not.toHaveBeenCalled(); // throws before fetch
  });

  it('fails when the response is OK but carries no token', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse({}));

    const token = await authenticate();

    expect(token).toBeNull();
    expect(authState.error).toBe('Integration auth: no token in response');
  });

  it('handles an error response whose body cannot be read', async () => {
    // response.text() rejecting exercises the `.catch(() => '')` fallback.
    const brokenBody = {
      ok: false,
      status: 500,
      text: () => Promise.reject(new Error('stream error')),
    } as unknown as Response;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(brokenBody);

    const token = await authenticate();

    expect(token).toBeNull();
    expect(authState.error).toBeTruthy(); // mapHttpError(500, undefined)
  });

  it('falls back to ERR_GENERIC when the rejection is not an Error', async () => {
    // fetch rejecting with a non-Error string hits the `: ERR_GENERIC` branch.
    vi.spyOn(globalThis, 'fetch').mockRejectedValue('socket hang up');

    const token = await authenticate();

    expect(token).toBeNull();
    expect(authState.error).toBe(ERR_GENERIC);
  });
});

describe('clearAuth', () => {
  it('drops the token', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      okResponse({ token: 'tok-1' }),
    );
    await authenticate();

    clearAuth();

    expect(authState.token).toBeNull();
    expect(getToken()).toBeNull();
  });
});
