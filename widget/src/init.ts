if (import.meta.env.DEV) {
  void import('preact/debug');
}

import { eventBus, WidgetEvent } from './eventBus';
import { hangUpRef } from './stores/callControl';
import {
  applyTheme,
  resetToIdle,
  setCallParams,
  setCompatibilityWarnings,
  setInitOptions,
  setScreen,
  widgetState,
} from './stores/widgetStore';
import { ActiveCallStates } from './types/types';
import { detectBrowserWarnings } from './utils/browserDetection';

const LOG_PREFIX = '[CallWidget]';

export function registerWidgetHandlers(ensureMount: () => void): void {
  let mounted = false;
  const mount = () => {
    if (!mounted) {
      ensureMount();
      mounted = true;
    }
  };

  eventBus.on(WidgetEvent.Init, (options) => {
    if (ActiveCallStates.has(widgetState.callState)) {
      console.warn(`${LOG_PREFIX} Cannot re-initialize during active call.`);
      return;
    }
    mount();
    setInitOptions(options ?? {});
    eventBus.emit(WidgetEvent.Initialized);
  });

  eventBus.on(WidgetEvent.Customize, (theme) => {
    applyTheme(theme);
  });

  eventBus.on(WidgetEvent.Call, (params) => {
    // Backendless demo: the host provides customer + trunk data in the payload,
    // so a call can start without a prior `init`.
    mount();

    if (
      ActiveCallStates.has(widgetState.callState) ||
      widgetState.screen === 'changeStatus'
    ) {
      console.warn(
        `${LOG_PREFIX} Widget is busy (state: ${widgetState.callState}), ignoring call.`,
      );
      return;
    }

    if (widgetState.screen !== 'idle') {
      resetToIdle();
    }

    setCallParams(params);

    const warnings = detectBrowserWarnings();
    if (warnings.length === 0 || localStorage.getItem('cw-compat-warned')) {
      setScreen('sipTrunk');
    } else {
      setCompatibilityWarnings(warnings);
      setScreen('compatibilityWarning');
    }
  });

  eventBus.on(WidgetEvent.Dismiss, () => {
    void hangUpRef.current?.();
    resetToIdle();
  });
}
