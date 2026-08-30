/* eslint-disable import/order */
import { effect } from '@preact/signals';
import 'preact/debug';
import { render } from 'preact';
/* eslint-enable import/order */

import { App } from './App';
import { eventBus, WidgetEvent } from './eventBus';
import { registerWidgetHandlers } from './init';
import { widgetState } from './stores/widgetStore';
import './styles/widget.css';
import type { CallParams, TrunkListItem } from './types/types';

const CONTAINER_ID = 'call-widget-root';

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
  // Light/dark palette follows the store (themes.css keys off data-cw-theme).
  effect(() => {
    root.setAttribute('data-cw-theme', widgetState.themeMode);
    const primary = widgetState.themePrimary;
    if (primary) {
      root.style.setProperty('--cw-primary', primary);
      root.style.setProperty('--cw-primary-hover', primary);
    } else {
      root.style.removeProperty('--cw-primary');
      root.style.removeProperty('--cw-primary-hover');
    }
  });
  render(<App />, root);
});

const trunks: TrunkListItem[] = [
  {
    id: '1000',
    brandId: 'b1',
    name: 'US East — New York',
    isDefault: true,
    status: 'active',
    enabled: true,
    minuteCost: 0.008,
  },
  {
    id: '1001',
    brandId: 'b1',
    name: 'US West — Los Angeles',
    isDefault: false,
    status: 'active',
    enabled: true,
    minuteCost: 0.012,
  },
  {
    id: '2000',
    brandId: 'b1',
    name: 'Global — Anycast Primary',
    isDefault: false,
    status: 'active',
    enabled: true,
    minuteCost: 0.03,
  },
];

const sampleCall: CallParams = {
  customer: {
    id: 'cust-1',
    firstName: 'Emily',
    lastName: 'Carter',
    country: 'US',
    status: null,
    brandName: 'Northwind Trading',
    phoneNumber: '+1 415 555 0142',
  },
  trunks,
};

eventBus.emit(WidgetEvent.Init, { theme: { mode: 'light' } });

document
  .getElementById('btn-call')
  ?.addEventListener('click', () =>
    eventBus.emit(WidgetEvent.Call, sampleCall),
  );

document.getElementById('btn-theme')?.addEventListener('click', () =>
  eventBus.emit(WidgetEvent.Customize, {
    mode: widgetState.themeMode === 'light' ? 'dark' : 'light',
  }),
);

document
  .getElementById('btn-dismiss')
  ?.addEventListener('click', () => eventBus.emit(WidgetEvent.Dismiss));
