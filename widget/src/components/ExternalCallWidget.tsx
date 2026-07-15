import autoAnimate from '@formkit/auto-animate';
import { useCallback, useEffect, useRef } from 'preact/hooks';

import { eventBus, WidgetEvent } from '../eventBus';
import { useStartCall } from '../hooks/useStartCall';
import {
  ChangeStatusScreen,
  CollapsedCallBar,
  CompatibilityWarningScreen,
  ErrorScreen,
  ExpandedCallBar,
  SipTrunkScreen,
} from '../screens';
import { hangUpRef } from '../stores/callControl';
import {
  resetToIdle,
  setCustomerData,
  setIsCollapsed,
  setScreen,
  setStatusConfirmedDuringCall,
  widgetState,
} from '../stores/widgetStore';
import { ActiveCallStates, CallState } from '../types/types';

// Simulated backend latency for the local status save.
const STATUS_SAVE_DELAY_MS = 1000;

export const ExternalCallWidget = () => {
  const {
    screen,
    callState,
    customerData,
    error,
    isCollapsed,
    compatibilityWarnings,
  } = widgetState;

  const startCall = useStartCall();
  const callParent = useRef<HTMLDivElement>(null);
  const isCalling = screen === 'calling';

  useEffect(() => {
    if (!isCalling || !callParent.current) return;
    const ctrl = autoAnimate(callParent.current);
    return () => ctrl.destroy?.();
  }, [isCalling]);

  // Fire widget_opened if already visible at mount time.
  useEffect(() => {
    if (widgetState.screen !== 'idle') {
      eventBus.emit(WidgetEvent.WidgetOpened);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    void hangUpRef.current?.();
    resetToIdle();
    setIsCollapsed(true);
  }, []);

  const handleEndCall = useCallback(() => {
    const cs = widgetState.callState;

    if (ActiveCallStates.has(cs)) {
      setIsCollapsed(true);
      void hangUpRef.current?.();
      return;
    }

    if (cs === CallState.Failed && widgetState.startCallTime !== null) {
      void hangUpRef.current?.();
      if (widgetState.statusConfirmedDuringCall) {
        resetToIdle();
        setIsCollapsed(true);
      } else {
        setScreen('changeStatus');
      }
      return;
    }

    void hangUpRef.current?.();
    resetToIdle();
    setIsCollapsed(true);
  }, []);

  // Backendless demo: status changes are applied to the in-memory customer
  // record after a short simulated delay, then reflected to the host via event.
  const handleStatusSave = useCallback(
    async (statusId: string, _comment: string) => {
      await new Promise((resolve) => setTimeout(resolve, STATUS_SAVE_DELAY_MS));

      const current = widgetState.customerData;
      if (!current) return;

      const selected = widgetState.statuses.find((s) => s.id === statusId);
      const status = selected ??
        current.status ?? { id: statusId, name: statusId, color: '#888888' };

      setCustomerData({ ...current, status });
      eventBus.emit(WidgetEvent.StatusConfirmed, {
        customerId: current.id,
        statusId,
        status,
      });

      if (ActiveCallStates.has(widgetState.callState)) {
        setStatusConfirmedDuringCall(true);
        setScreen('calling');
      } else {
        resetToIdle();
      }
    },
    [],
  );

  const handleStatusCancel = useCallback(() => {
    if (ActiveCallStates.has(widgetState.callState)) {
      setScreen('calling');
    } else {
      const customerId = widgetState.customerData?.id;
      if (customerId) {
        eventBus.emit(WidgetEvent.StatusChangeSkipped, { customerId });
      }
      resetToIdle();
    }
  }, []);

  if (screen === 'idle') return null;

  return (
    <div
      class='cw-paper'
      style={{
        outline:
          callState === CallState.Connected && screen === 'calling'
            ? `1px solid var(--cw-success)`
            : 'none',
      }}
    >
      {screen === 'compatibilityWarning' && (
        <CompatibilityWarningScreen
          warnings={compatibilityWarnings}
          onContinue={() => {
            localStorage.setItem('cw-compat-warned', '1');
            setScreen('sipTrunk');
          }}
          onDismiss={handleDismiss}
        />
      )}

      {screen === 'sipTrunk' && (
        <SipTrunkScreen
          onConfirm={(trunkId) => startCall(trunkId)}
          onCancel={handleDismiss}
        />
      )}

      {screen === 'error' && (
        <ErrorScreen onClose={handleDismiss} message={error ?? undefined} />
      )}

      {screen === 'calling' && customerData && (
        <div ref={callParent}>
          {isCollapsed ? (
            <CollapsedCallBar
              key='collapsed'
              customer={customerData}
              onEndCall={handleEndCall}
            />
          ) : (
            <ExpandedCallBar
              key='expanded'
              customer={customerData}
              onEndCall={handleEndCall}
            />
          )}
        </div>
      )}

      {screen === 'changeStatus' && customerData && (
        <ChangeStatusScreen
          onSave={handleStatusSave}
          onCancel={handleStatusCancel}
        />
      )}
    </div>
  );
};
