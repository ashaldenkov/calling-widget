if (import.meta.env.DEV) {
  void import('preact/debug');
}

import { queryClient } from './api/queryClient';
import { ERR_CALL_IN_OTHER_TAB, ERR_GENERIC } from './errors';
import { eventBus, WidgetEvent } from './eventBus';
import { authenticate, authState, clearAuth } from './stores/authStore';
import { destroyJanusSession, hangUpRef } from './stores/janusStore';
import {
  resetToIdle,
  setCallParams,
  setCompatibilityWarnings,
  setConfig,
  setError,
  setScreen,
  widgetState,
} from './stores/widgetStore';
import { ActiveCallStates } from './types/types';
import { handleWidgetError } from './utils';
import { detectBrowserWarnings } from './utils/browserDetection';
import { isCallOwnedByOtherTab, releaseCall } from './utils/tabPresence';

const LOG_PREFIX = '[CallWidget]';

export function registerWidgetHandlers(ensureMount: () => void): void {
  let mounted = false;

  eventBus.on(WidgetEvent.Init, (config) => {
    if (ActiveCallStates.has(widgetState.callState)) {
      console.warn(`${LOG_PREFIX} Cannot re-initialize during active call.`);
      return;
    }
    if (!mounted) {
      ensureMount();
      mounted = true;
    }
    setConfig(config);
    eventBus.emit(WidgetEvent.Initialized);
  });

  eventBus.on(WidgetEvent.Call, (params) => {
    void (async () => {
      if (!mounted || !widgetState.config) {
        console.error(
          `${LOG_PREFIX} Widget not initialized. Emit "init" first.`,
        );
        eventBus.emit(WidgetEvent.Error, { message: 'Widget not initialized' });
        return;
      }
      if (ActiveCallStates.has(widgetState.callState)) {
        console.warn(
          `${LOG_PREFIX} Widget is busy (state: ${widgetState.callState}), ignoring call.`,
        );
        return;
      }
      if (await isCallOwnedByOtherTab()) {
        setError(ERR_CALL_IN_OTHER_TAB);
        setScreen('error');
        return;
      }
      if (widgetState.screen !== 'idle') {
        destroyJanusSession();
        queryClient.clear();
        resetToIdle();
      }
      setCallParams(params);
      // Per-call authentication: fetch a token for this call before any API
      // request. On failure show the error screen (emits `error`).
      clearAuth();
      const token = await authenticate();
      if (!token) {
        handleWidgetError(authState.error ?? ERR_GENERIC);
        return;
      }
      const warnings = detectBrowserWarnings();
      if (warnings.length === 0 || localStorage.getItem('cw-compat-warned')) {
        setScreen('sipTrunk');
      } else {
        setCompatibilityWarnings(warnings);
        setScreen('compatibilityWarning');
      }
    })();
  });

  eventBus.on(WidgetEvent.Dismiss, () => {
    void hangUpRef.current?.();
    destroyJanusSession();
    queryClient.clear();
    releaseCall();
    resetToIdle();
    clearAuth();
  });
}
