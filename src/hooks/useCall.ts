import { useCallback, useEffect, useRef } from 'react';

import { api } from '../api/api';
import {
  ERR_CALL_FAILED,
  ERR_CUSTOMER_DATA,
  ERR_MIC_DISCONNECTED,
  ERR_MIC_PERMISSION,
} from '../errors';
import { eventBus, WidgetEvent } from '../eventBus';
import {
  resetToIdle,
  setCallState,
  setNotification,
  setScreen,
  setStartCallTime,
  widgetState,
} from '../stores/widgetStore';
import { CallState, type CallCustomerResponse } from '../types/types';
import { handleWidgetError } from '../utils';

import { type JanusCallEvent, useJanusCall } from './useJanusCall';

export const useCall = () => {
  const { config, screen, callState, customerData, selectedTrunkId } =
    widgetState;

  const handleEvent = useCallback((event: JanusCallEvent) => {
    const emitStateChange = (state: CallState) =>
      eventBus.emit(WidgetEvent.CallStateChange, {
        state,
        clientId: widgetState.clientId ?? undefined,
      });

    switch (event.state) {
      case CallState.Ringing:
        setCallState(CallState.Ringing);
        emitStateChange(CallState.Ringing);
        break;
      case CallState.Connected:
        setCallState(CallState.Connected);
        setStartCallTime(Date.now());
        emitStateChange(CallState.Connected);
        break;
      case CallState.Failed: {
        setCallState(CallState.Failed);
        const msg = event.message || ERR_CALL_FAILED;
        setNotification(msg);
        emitStateChange(CallState.Failed);
        eventBus.emit(WidgetEvent.Error, { message: msg });
        break;
      }
      case CallState.Ended: {
        setCallState(CallState.Ended);
        setStartCallTime(null);
        emitStateChange(CallState.Ended);
        if (widgetState.statusConfirmedDuringCall) {
          resetToIdle();
        } else {
          setScreen('changeStatus');
        }
        break;
      }
    }
  }, []);

  const handleMicDisconnected = useCallback(() => {
    setNotification(ERR_MIC_DISCONNECTED);
    eventBus.emit(WidgetEvent.Error, { message: ERR_MIC_DISCONNECTED });
  }, []);

  const { makeCall, hangUp, setMute } = useJanusCall({
    onEvent: handleEvent,
    onMicDisconnected: handleMicDisconnected,
    janusWsUrl: config?.janusWsUrl ?? '',
  });

  const checkMicPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch (err) {
      handleWidgetError(ERR_MIC_PERMISSION, err);
      return false;
    }
  }, []);

  const startCallWithTrunk = useCallback(
    async (trunkId: string) => {
      const { customerData } = widgetState;

      if (!customerData) {
        handleWidgetError(ERR_CUSTOMER_DATA);
        return;
      }

      const response = await api<CallCustomerResponse>(
        `/customers/${customerData.dialerId}/call`,
        { method: 'POST', data: { trunkId: Number(trunkId) } },
      );

      setScreen('calling');
      setCallState(CallState.Calling);
      eventBus.emit(WidgetEvent.CallStateChange, {
        state: CallState.Calling,
        clientId: widgetState.clientId ?? undefined,
      });

      await makeCall(response);
    },
    [makeCall],
  );

  const startCall = useCallback(
    async (trunkId: string) => {
      const micAllowed = await checkMicPermission();
      if (!micAllowed) return;
      await startCallWithTrunk(trunkId);
    },
    [checkMicPermission, startCallWithTrunk],
  );

  // Auto-restart after page reload mid-call.
  // merge() leaves callState=Idle + screen='calling' as the signal.
  const autoRestartedRef = useRef(false);
  useEffect(() => {
    if (
      screen === 'calling' &&
      callState === CallState.Idle &&
      customerData !== null &&
      selectedTrunkId !== null &&
      config !== null &&
      !autoRestartedRef.current
    ) {
      autoRestartedRef.current = true;
      void startCall(selectedTrunkId);
    }
  }, [screen, callState, customerData, selectedTrunkId, config, startCall]);

  return { hangUp, setMute, startCall };
};
