import autoAnimate from '@formkit/auto-animate';
import { useMutation } from '@tanstack/preact-query';
import { useCallback, useEffect, useRef } from 'preact/hooks';

import { api } from '../api/api';
import { eventBus, WidgetEvent } from '../eventBus';
import { useCall } from '../hooks/useCall';
import {
  ChangeStatusScreen,
  CollapsedCallBar,
  CompatibilityWarningScreen,
  ErrorScreen,
  ExpandedCallBar,
  SipTrunkScreen,
} from '../screens';
import {
  resetToIdle,
  setCustomerData,
  setIsCollapsed,
  setScreen,
  setStatusConfirmedDuringCall,
  widgetState,
} from '../stores/widgetStore';
import {
  ActiveCallStates,
  CallState,
  type UpdateStatusResponse,
} from '../types/types';
import { releaseCall } from '../utils/tabPresence';

export const ExternalCallWidget = () => {
  const {
    screen,
    callState,
    customerData,
    error,
    extCustomerId,
    isCollapsed,
    compatibilityWarnings,
  } = widgetState;

  const { hangUp, startCall } = useCall();
  const callParent = useRef<HTMLDivElement>(null);
  const isCalling = screen === 'calling';

  useEffect(() => {
    if (!isCalling || !callParent.current) return;
    const ctrl = autoAnimate(callParent.current);
    return () => ctrl.destroy?.();
  }, [isCalling]);

  // Fire widget_opened if already visible at mount time. On reload mid-call, setScreen fires it
  useEffect(() => {
    if (widgetState.screen !== 'idle') {
      eventBus.emit(WidgetEvent.WidgetOpened);
    }
  }, []);

  const statusMutation = useMutation<
    UpdateStatusResponse,
    Error,
    { statusId: string; comment?: string }
  >({
    mutationFn: ({ statusId, comment }) =>
      api<UpdateStatusResponse>(`/customers/${customerData!.dialerId}/status`, {
        method: 'PATCH',
        data: { statusId, ...(comment ? { comment } : {}) },
      }),
    onSuccess: (result, { statusId }) => {
      if (widgetState.customerData) {
        setCustomerData({
          ...widgetState.customerData,
          status: result.status,
        });
      }
      eventBus.emit(WidgetEvent.StatusConfirmed, {
        clientId: extCustomerId!,
        statusId,
        dialerId: widgetState.customerData!.dialerId,
      });
      if (ActiveCallStates.has(widgetState.callState)) {
        setStatusConfirmedDuringCall(true);
        setScreen('calling');
      } else {
        resetToIdle();
      }
    },
    onError: (error) => {
      eventBus.emit(WidgetEvent.Error, { message: error.message });
    },
  });

  const handleDismiss = useCallback(() => {
    void hangUp();
    releaseCall();
    resetToIdle();
    setIsCollapsed(true);
  }, [hangUp]);

  const handleEndCall = useCallback(() => {
    const cs = widgetState.callState;

    if (ActiveCallStates.has(cs)) {
      setIsCollapsed(true);
      void hangUp();
      return;
    }

    if (cs === CallState.Failed && widgetState.startCallTime !== null) {
      void hangUp();
      releaseCall();
      if (widgetState.statusConfirmedDuringCall) {
        resetToIdle();
        setIsCollapsed(true);
      } else {
        setScreen('changeStatus');
      }
      return;
    }

    void hangUp();
    releaseCall();
    resetToIdle();
    setIsCollapsed(true);
  }, [hangUp]);

  const handleStatusSave = useCallback(
    async (statusId: string, comment: string) => {
      await statusMutation.mutateAsync({
        statusId,
        comment: comment || undefined,
      });
    },
    [statusMutation],
  );

  const handleStatusCancel = useCallback(() => {
    if (ActiveCallStates.has(widgetState.callState)) {
      setScreen('calling');
    } else {
      eventBus.emit(WidgetEvent.StatusChangeSkipped, {
        clientId: extCustomerId!,
      });
      resetToIdle();
    }
  }, [extCustomerId]);

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
            sessionStorage.setItem('cw-compat-warned', '1');
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
