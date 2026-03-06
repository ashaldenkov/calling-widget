import { useWidgetStore } from '../stores/widgetStore';

interface RequestConfig {
  method?: string;
  data?: unknown;
  params?: Record<string, unknown>;
}

export async function api<T>(
  path: string,
  { method = 'GET', data, params }: RequestConfig = {},
): Promise<T> {
  const config = useWidgetStore.getState().config;
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
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.authToken}`,
    },
    ...(data && method !== 'GET' ? { body: JSON.stringify(data) } : {}),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    let message: string;
    try {
      const parsed = JSON.parse(text) as { error?: string; message?: string };
      message =
        parsed.error ?? parsed.message ?? `Request failed (${response.status})`;
    } catch {
      message = text || `Request failed (${response.status})`;
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
