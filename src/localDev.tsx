/* eslint-disable import/order */
import 'preact/debug';
import { render } from 'preact';
/* eslint-enable import/order */

import { App } from './App';
import { eventBus, WidgetEvent } from './eventBus';
import { registerWidgetHandlers } from './init';
import './styles/widget.css';
import type { CallParams } from './types/types';

const CONTAINER_ID = 'call-widget-root';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

declare global {
  interface Window {
    CallWidget: typeof eventBus;
  }
}

window.CallWidget = eventBus;

registerWidgetHandlers(() => {
  const root = document.createElement('div');
  root.id = CONTAINER_ID;
  root.className = 'cw-host';
  document.body.appendChild(root);
  render(<App />, root);
});

async function devLogin(): Promise<string> {
  const response = await fetch(`${apiBaseUrl}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: import.meta.env.VITE_DEV_AUTH_EMAIL,
      password: import.meta.env.VITE_DEV_AUTH_PASSWORD,
    }),
  });
  if (!response.ok) {
    throw new Error(
      `Dev login failed: ${response.status} ${response.statusText}`,
    );
  }
  const data = (await response.json()) as { token?: string };
  if (!data.token) throw new Error('Dev login: no token in response');
  return data.token;
}

void devLogin().then(
  (authToken) => {
    eventBus.emit(WidgetEvent.Init, {
      apiBaseUrl,
      webBaseUrl: import.meta.env.VITE_WEB_BASE_URL,
      janusWsUrl: import.meta.env.VITE_JANUS_WS_URL,
      authToken,
    });
  },
  (error: unknown) => {
    console.error('[localDev]', error);
  },
);

const form = document.getElementById('call-form') as HTMLFormElement | null;
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const fields = form.elements as HTMLFormControlsCollection & {
    apiKey: HTMLInputElement;
    extAgentId: HTMLInputElement;
    extCustomerId: HTMLInputElement;
    phoneNumber: HTMLInputElement;
  };
  const apiKey = fields.apiKey.value.trim();
  const extAgentId = fields.extAgentId.value.trim();
  const extCustomerId = fields.extCustomerId.value.trim();
  const phoneNumber = fields.phoneNumber.value.trim();

  const payload = {
    ...(apiKey ? { apiKey } : {}),
    ...(extAgentId ? { extAgentId: Number(extAgentId) } : {}),
    ...(extCustomerId ? { extCustomerId: Number(extCustomerId) } : {}),
    ...(phoneNumber ? { phoneNumber } : {}),
  } as CallParams;
  eventBus.emit(WidgetEvent.Call, payload);
});

document.getElementById('btn-dismiss')?.addEventListener('click', () => {
  eventBus.emit(WidgetEvent.Dismiss);
});
