import { Collapse, Paper } from '@mui/material';
import { useMutation } from '@tanstack/preact-query';
import { useCallback, useEffect } from 'preact/hooks';

import { api } from '../api/api';
import { eventBus, WidgetEvent } from '../eventBus';
import { useCall } from '../hooks/useCall';
import {
  CallInformationScreen,
  ChangeStatusScreen,
  CollapsedCallBar,
  CompatibilityWarningScreen,
  ErrorScreen,
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
import { colors, elevatedPaperShadow } from '../theme';
import {
  ActiveCallStates,
  CallState,
  type UpdateStatusResponse,
} from '../types/types';

export const ExternalCallWidget = () => {
  const {
    screen,
    callState,
    customerData,
    isMicMuted,
    error,
    clientId,
    isCollapsed,
    compatibilityWarnings,
  } = widgetState;

  const { hangUp, setMute, startCall } = useCall();

  // Fire widget_opened if already visible at mount time. On reload mid-call, setScreen fires it
  useEffect(() => {
    if (widgetState.screen !== 'idle') {
      eventBus.emit(WidgetEvent.WidgetOpened);
    }
  }, []);

  // Sync mute state to Janus handle. MicToggled event fires from setMicMuted.
  useEffect(() => {
    setMute(isMicMuted);
  }, [isMicMuted, setMute]);

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
        clientId: clientId!,
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
    resetToIdle();
    setIsCollapsed(true);
  }, [hangUp]);

  const handleEndCall = useCallback(() => {
    if (widgetState.callState === CallState.Failed) {
      resetToIdle();
      return;
    }
    setIsCollapsed(true);
    void hangUp();
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
      eventBus.emit(WidgetEvent.StatusChangeSkipped, { clientId: clientId! });
      resetToIdle();
    }
  }, [clientId]);

  if (screen === 'idle') return null;

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 500,
        overflow: 'hidden',
        pointerEvents: 'auto',
        ...elevatedPaperShadow,
        outline:
          callState === CallState.Connected && screen === 'calling'
            ? `1px solid ${colors.success}`
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
        <>
          <Collapse in={!isCollapsed} timeout={300} unmountOnExit>
            <CallInformationScreen
              customer={customerData}
              onEndCall={handleEndCall}
            />
          </Collapse>
          <Collapse in={isCollapsed} timeout={300} unmountOnExit>
            <CollapsedCallBar
              customer={customerData}
              onEndCall={handleEndCall}
            />
          </Collapse>
        </>
      )}

      {screen === 'changeStatus' && customerData && (
        <ChangeStatusScreen
          onSave={handleStatusSave}
          onCancel={handleStatusCancel}
        />
      )}
    </Paper>
  );
};
