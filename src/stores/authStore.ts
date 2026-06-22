import { deepSignal } from 'deepsignal';

import { ERR_GENERIC, mapHttpError } from '../errors';

import { widgetState } from './widgetStore';

export interface AuthState {
  token: string | null;
  error: string | null; // Message from the last failed authentication for the error screen
}

interface IntegrationAuthResponse {
  token: string;
  expires_at?: string;
}

export const authState = deepSignal<AuthState>({ token: null, error: null });

// Single-flight guard: parallel callers share one in-flight request instead of
// hammering /integration/auth.
let inFlight: Promise<string | null> | null = null;

async function requestToken(
  apiKey: string,
  extAgentId: number,
): Promise<string> {
  const config = widgetState.config;
  if (!config) throw new Error('Widget not initialized');

  const response = await fetch(`${config.apiBaseUrl}/integration/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify({ agent_id: extAgentId }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    let serverMessage: string | undefined;
    try {
      const parsed = JSON.parse(text) as { error?: string; message?: string };
      serverMessage = parsed.error ?? parsed.message;
    } catch {
      serverMessage = text || undefined;
    }
    throw new Error(mapHttpError(response.status, serverMessage));
  }

  const data = (await response.json()) as IntegrationAuthResponse;
  if (!data.token) throw new Error('Integration auth: no token in response');
  // expires_at is accepted but not tracked — auth is per-call; on 401 we just
  // re-authenticate once.
  return data.token;
}

/**
 * Authenticate for the current call using the credentials stored on
 * `widgetState` (set from the `call` payload, persisted across reloads).
 * Single-flight. Returns the token, or null when there are no credentials or
 * the request fails.
 */
export function authenticate(): Promise<string | null> {
  if (inFlight) return inFlight;

  const { apiKey, extAgentId } = widgetState;
  if (!apiKey || extAgentId === null) return Promise.resolve(null);

  inFlight = requestToken(apiKey, extAgentId)
    .then((token) => {
      authState.token = token;
      authState.error = null;
      return token;
    })
    .catch((err: unknown) => {
      authState.token = null;
      authState.error = err instanceof Error ? err.message : ERR_GENERIC;
      console.error('[CallWidget] Authentication failed:', err);
      return null;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export function getToken(): string | null {
  return authState.token;
}

export function clearAuth(): void {
  inFlight = null;
  authState.token = null;
  authState.error = null;
}
