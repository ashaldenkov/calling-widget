if (import.meta.env.DEV) {
  void import('preact/debug');
}

import { queryClient } from './api/queryClient';
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
import { ActiveCallStates } from './types/types';
import { detectBrowserWarnings } from './utils/browserDetection';

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
  });

  eventBus.on(WidgetEvent.Dismiss, () => {
    destroyJanusSession();
    queryClient.clear();
    resetToIdle();
  });

  eventBus.on(WidgetEvent.UpdateToken, ({ token }) => {
    if (!widgetState.config) {
      console.warn(
        `${LOG_PREFIX} Cannot update token: widget not initialized.`,
      );
      return;
    }
    updateAuthToken(token);
  });
}
