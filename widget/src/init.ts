if (import.meta.env.DEV) {
  void import('preact/debug');
}

import { eventBus, WidgetEvent } from './eventBus';
import { hangUpRef } from './stores/callControl';
import {
  applyTheme,
  resetToIdle,
  setCallParams,
  setInitOptions,
  setScreen,
  widgetState,
} from './stores/widgetStore';
import { ActiveCallStates } from './types/types';

const LOG_PREFIX = '[CallWidget]';
const DEMO_NOTICE_ACK = 'cw-demo-notice-ack';

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

    // First run in this browser shows the demo notice; afterwards go straight
    // to trunk selection.
    if (localStorage.getItem(DEMO_NOTICE_ACK)) {
      setScreen('sipTrunk');
    } else {
      setScreen('demoNotice');
    }
  });

  eventBus.on(WidgetEvent.Dismiss, () => {
    void hangUpRef.current?.();
    resetToIdle();
  });
}
