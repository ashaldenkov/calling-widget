import { mapHttpError } from '../errors';
import { eventBus, WidgetEvent } from '../eventBus';
import { widgetState } from '../stores/widgetStore';

interface RequestConfig {
  method?: string;
  data?: unknown;
  params?: Record<string, unknown>;
  signal?: AbortSignal;
}

export async function api<T>(
  path: string,
  { method = 'GET', data, params, signal }: RequestConfig = {},
): Promise<T> {
  const config = widgetState.config;
  if (!config) throw new Error('Widget not initialized');

  const url = new URL(config.apiBaseUrl + path);
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        url.searchParams.append(
          key,
          typeof val === 'object' ? JSON.stringify(val) : String(val as string),
        );
      }
    });
  }

  const response = await fetch(url.toString(), {
    method: method.toUpperCase(),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.authToken}`,
    },
    ...(data && method !== 'GET' ? { body: JSON.stringify(data) } : {}),
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) {
    if (response.status === 401) {
      eventBus.emit(WidgetEvent.Unauthorized);
    }
    const text = await response.text().catch(() => '');
    let message: string;
    try {
      const parsed = JSON.parse(text) as { error?: string; message?: string };
      message = mapHttpError(response.status, parsed.error ?? parsed.message);
    } catch {
      message = mapHttpError(response.status, text || undefined);
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
