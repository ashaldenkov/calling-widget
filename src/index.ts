import { h, render } from 'preact';

import { queryClient } from './api/queryClient';
import { App } from './App';
import { eventBus, WidgetEvent } from './eventBus';
import { destroyJanusSession } from './stores/janusStore';
import {
  resetToIdle,
  setCallParams,
  setCompatibilityWarnings,
  setConfig,
  setScreen,
  updateAuthToken,
  widgetState,
} from './stores/widgetStore';
import {
  ActiveCallStates,
  type CallParams,
  type CallWidgetConfig,
} from './types/types';
import { detectBrowserWarnings } from './utils/browserDetection';

declare const __WIDGET_VERSION__: string;

const CONTAINER_ID = 'call-widget-root';
const LOG_PREFIX = '[CallWidget]';

console.info(`${LOG_PREFIX} v${__WIDGET_VERSION__}`);

let mounted = false;
let container: HTMLDivElement | null = null;

function ensureMount(): void {
  if (mounted) return;

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

  if (!document.querySelector('link[data-cw-font]')) {
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.setAttribute('data-cw-font', '');
    fontLink.href =
      'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap';
    document.head.appendChild(fontLink);
  }

  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);

  render(h(App, { shadowRoot: shadow }), mountPoint);
  mounted = true;
}

function handleInit(config: CallWidgetConfig) {
  if (ActiveCallStates.has(widgetState.callState)) {
    console.warn(`${LOG_PREFIX} Cannot re-initialize during active call.`);
    return;
  }
  ensureMount();
  setConfig(config);

  eventBus.emit(WidgetEvent.Initialized);
}

function handleCall(params: CallParams) {
  if (!mounted || !widgetState.config) {
    console.error(`${LOG_PREFIX} Widget not initialized. Emit "init" first.`);
    eventBus.emit(WidgetEvent.Error, { message: 'Widget not initialized' });
    return;
  }

  if (
    ActiveCallStates.has(widgetState.callState) ||
    widgetState.screen === 'changeStatus'
  ) {
    console.warn(
      `${LOG_PREFIX} Widget is busy (screen: ${widgetState.screen}), ignoring call.`,
    );
    return;
  }

  if (widgetState.screen !== 'idle') {
    destroyJanusSession();
    queryClient.clear();
    resetToIdle();
  }

  setCallParams(params);

  const warnings = detectBrowserWarnings();
  if (warnings.length === 0 || sessionStorage.getItem('cw-compat-warned')) {
    setScreen('sipTrunk');
  } else {
    setCompatibilityWarnings(warnings);
    setScreen('compatibilityWarning');
  }
}

function handleUpdateToken({ token }: { token: string }) {
  if (!widgetState.config) {
    console.warn(`${LOG_PREFIX} Cannot update token: widget not initialized.`);
    return;
  }
  updateAuthToken(token);
}

function handleDismiss() {
  destroyJanusSession();
  queryClient.clear();
  resetToIdle();
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
