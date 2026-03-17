import { Collapse, Paper } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

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
import { useWidgetStore } from '../stores/widgetStore';
import { colors, elevatedPaperShadow } from '../theme';
import {
  ActiveCallStates,
  CallState,
  type UpdateStatusResponse,
} from '../types/types';
import { useMuteNotification } from '../utils';

export const ExternalCallWidget = () => {
  const screen = useWidgetStore((s) => s.screen);
  const callState = useWidgetStore((s) => s.callState);
  const customerData = useWidgetStore((s) => s.customerData);
  const isMicMuted = useWidgetStore((s) => s.isMicMuted);
  const error = useWidgetStore((s) => s.error);
  const clientId = useWidgetStore((s) => s.clientId);
  const isCollapsed = useWidgetStore((s) => s.isCollapsed);
  const compatibilityWarnings = useWidgetStore((s) => s.compatibilityWarnings);

  const { hangUp, setMute, startCall } = useCall();
  const muteNotification = useMuteNotification();

  // Fire widget_opened if already visible at mount time. On reload mid-call, setScreen fires it
  useEffect(() => {
    if (useWidgetStore.getState().screen !== 'idle') {
      eventBus.emit(WidgetEvent.WidgetOpened);
    }
  }, []);

  // Skip emitting on initial mount
  const isMicInitialRef = useRef(true);
  useEffect(() => {
    setMute(isMicMuted);
    if (isMicInitialRef.current) {
      isMicInitialRef.current = false;
      return;
    }
    eventBus.emit(WidgetEvent.MicToggled, { muted: isMicMuted });
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
      const store = useWidgetStore.getState();
      if (store.customerData) {
        store.setCustomerData({ ...store.customerData, status: result.status });
      }
      eventBus.emit(WidgetEvent.StatusConfirmed, {
        clientId: clientId!,
        statusId,
        dialerId: store.customerData!.dialerId,
      });
      if (ActiveCallStates.has(store.callState)) {
        store.setStatusConfirmedDuringCall(true);
        store.setScreen('calling');
      } else {
        store.resetToIdle();
      }
    },
    onError: (error) => {
      eventBus.emit(WidgetEvent.Error, { message: error.message });
    },
  });

  const handleDismiss = useCallback(() => {
    void hangUp();
    useWidgetStore.getState().resetToIdle();
    useWidgetStore.getState().setIsCollapsed(true);
  }, [hangUp]);

  const handleEndCall = useCallback(() => {
    const store = useWidgetStore.getState();
    if (store.callState === CallState.Failed) {
      store.resetToIdle();
      return;
    }
    store.setIsCollapsed(true);
    void hangUp();
  }, [hangUp]);

  const handleOpenStatusChange = useCallback(() => {
    useWidgetStore.getState().setScreen('changeStatus');
  }, []);

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
    const store = useWidgetStore.getState();
    if (ActiveCallStates.has(store.callState)) {
      store.setScreen('calling');
    } else {
      eventBus.emit(WidgetEvent.StatusChangeSkipped, { clientId: clientId! });
      store.resetToIdle();
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
            useWidgetStore.getState().setScreen('sipTrunk');
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
              muteNotification={muteNotification}
              onCollapse={() => useWidgetStore.getState().setIsCollapsed(true)}
              onEndCall={handleEndCall}
              onChangeStatus={handleOpenStatusChange}
            />
          </Collapse>
          <Collapse in={isCollapsed} timeout={300} unmountOnExit>
            <CollapsedCallBar
              customer={customerData}
              onExpand={() => useWidgetStore.getState().setIsCollapsed(false)}
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
