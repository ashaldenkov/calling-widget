import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { queryClient } from './api/queryClient';
import { App } from './App';
import { eventBus, WidgetEvent } from './eventBus';
import { destroyJanusSession } from './stores/janusStore';
import { useWidgetStore } from './stores/widgetStore';
import {
  ActiveCallStates,
  type CallParams,
  type CallWidgetConfig,
} from './types/types';

declare const __WIDGET_VERSION__: string;

const CONTAINER_ID = 'call-widget-root';
const LOG_PREFIX = '[CallWidget]';

console.info(`${LOG_PREFIX} v${__WIDGET_VERSION__}`);

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function ensureMount(): void {
  if (root) return;

  container = document.getElementById(CONTAINER_ID) as HTMLDivElement | null;
  if (!container) {
    container = document.createElement('div');
    container.id = CONTAINER_ID;
    container.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;z-index:1300;pointer-events:none;';
    document.body.appendChild(container);
  }

  const shadow =
    container.shadowRoot ?? container.attachShadow({ mode: 'open' });
  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);

  root = createRoot(mountPoint);
  root.render(createElement(App, { shadowRoot: shadow }));
}

function handleInit(config: CallWidgetConfig) {
  const state = useWidgetStore.getState();
  if (ActiveCallStates.has(state.callState)) {
    console.warn(`${LOG_PREFIX} Cannot re-initialize during active call.`);
    return;
  }
  ensureMount();
  useWidgetStore.getState().setConfig(config);

  eventBus.emit(WidgetEvent.Initialized);
}

function handleCall(params: CallParams) {
  const state = useWidgetStore.getState();

  if (!root || !state.config) {
    console.error(`${LOG_PREFIX} Widget not initialized. Emit "init" first.`);
    eventBus.emit(WidgetEvent.Error, { message: 'Widget not initialized' });
    return;
  }

  if (state.screen !== 'idle') {
    console.warn(
      `${LOG_PREFIX} Widget is busy (screen: ${state.screen}), ignoring call.`,
    );
    return;
  }

  state.setCallParams(params);
  state.setScreen('sipTrunk');
}

function handleUpdateToken({ token }: { token: string }) {
  const state = useWidgetStore.getState();
  if (!state.config) {
    console.warn(`${LOG_PREFIX} Cannot update token: widget not initialized.`);
    return;
  }
  state.updateAuthToken(token);
}

function handleDismiss() {
  destroyJanusSession();
  queryClient.clear();
  useWidgetStore.getState().resetToIdle();
}

eventBus.on(WidgetEvent.Init, handleInit);
eventBus.on(WidgetEvent.Call, handleCall);
eventBus.on(WidgetEvent.Dismiss, handleDismiss);
eventBus.on(WidgetEvent.UpdateToken, handleUpdateToken);

declare global {
  interface Window {
    CallWidget: typeof eventBus;
  }
}

window.CallWidget = eventBus;

export { eventBus, WidgetEvent };
export type { WidgetEventPayloads, EventHandler } from './eventBus';
