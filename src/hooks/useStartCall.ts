import { useCallback, useEffect, useRef } from 'preact/hooks';

import { api } from '../api/api';
import {
  ERR_CALL_IN_OTHER_TAB,
  ERR_CUSTOMER_DATA,
  ERR_GENERIC,
  ERR_MIC_DISCONNECTED,
  NOTIF_RECONNECTING,
  getFailureMessage,
} from '../errors';
import { eventBus, WidgetEvent } from '../eventBus';
import {
  resetToIdle,
  setCallState,
  setCurrentBridgeId,
  setError,
  setNotification,
  setRecoveryStatus,
  setScreen,
  setStartCallTime,
  widgetState,
} from '../stores/widgetStore';
import {
  CallState,
  type CallCustomerRequest,
  type CallCustomerResponse,
} from '../types/types';
import { handleWidgetError } from '../utils';
import { RecoveryState } from '../utils/callRecovery';
import { claimCall, releaseCall } from '../utils/tabPresence';

import { type JanusCallEvent, useJanusCall } from './useJanusCall';

export const useStartCall = (): ((trunkId: string) => Promise<void>) => {
  const { config, screen, callState, customerData, selectedTrunkId, apiKey } =
    widgetState;

  const handleEvent = useCallback((event: JanusCallEvent) => {
    const emitStateChange = (state: CallState) =>
      eventBus.emit(WidgetEvent.CallStateChange, {
        state,
        clientId: widgetState.extCustomerId ?? undefined,
      });

    // Janus may deliver hangup/CallFailed late on an already-detached handle.
    // The old closure carries a stale bridgeId; acting on it would kill the
    // next in-flight call.
    const isStale = (e: JanusCallEvent): boolean => {
      const { callState: cs, currentBridgeId } = widgetState;
      if (
        cs === CallState.Idle ||
        cs === CallState.Ended ||
        cs === CallState.Failed
      ) {
        return true;
      }
      return Boolean(
        e.bridgeId && currentBridgeId && e.bridgeId !== currentBridgeId,
      );
    };

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
        if (isStale(event)) break;
        releaseCall();
        setCallState(CallState.Failed);
        setCurrentBridgeId(null);
        const msg = event.reason
          ? getFailureMessage(event.reason)
          : event.message || ERR_GENERIC;
        setNotification(msg);
        emitStateChange(CallState.Failed);
        eventBus.emit(WidgetEvent.Error, { message: msg });
        // Stay on the calling screen showing Failed + notification
        break;
      }
      case CallState.Ended: {
        if (isStale(event)) break;
        releaseCall();
        setCallState(CallState.Ended);
        setCurrentBridgeId(null);
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

  const handleMicRestored = useCallback(() => {
    setNotification(null);
  }, []);

  const handleRecoveryState = useCallback((state: RecoveryState) => {
    setRecoveryStatus(state);
    if (state === RecoveryState.Unstable) {
      setNotification(NOTIF_RECONNECTING);
    } else if (
      state === RecoveryState.Healthy &&
      widgetState.notification === NOTIF_RECONNECTING
    ) {
      setNotification(null);
    }
  }, []);

  const { makeCall } = useJanusCall({
    onEvent: handleEvent,
    onMicDisconnected: handleMicDisconnected,
    onMicRestored: handleMicRestored,
    onRecoveryState: handleRecoveryState,
    janusWsUrl: config?.janusWsUrl ?? '',
  });

  const startCall = useCallback(
    async (trunkId: string) => {
      const { customerData, phoneNumber } = widgetState;

      if (!customerData) {
        handleWidgetError(ERR_CUSTOMER_DATA);
        return;
      }

      if (!(await claimCall())) {
        setError(ERR_CALL_IN_OTHER_TAB);
        setScreen('error');
        return;
      }

      let response: CallCustomerResponse;
      try {
        const data: CallCustomerRequest = { trunkId: Number(trunkId) };
        if (phoneNumber) {
          data.phoneNumber = phoneNumber;
        }
        response = await api<CallCustomerResponse>(
          `/customers/${customerData.dialerId}/call`,
          { method: 'POST', data },
        );
      } catch (err) {
        releaseCall();
        // Guards the widget from stuck of the auto-restart after reload
        handleWidgetError(ERR_GENERIC, err);
        return;
      }

      setCurrentBridgeId(response.bridgeId);
      setScreen('calling');
      setCallState(CallState.Calling);
      eventBus.emit(WidgetEvent.CallStateChange, {
        state: CallState.Calling,
        clientId: widgetState.extCustomerId ?? undefined,
      });

      await makeCall(response);
    },
    [makeCall],
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
      apiKey !== null && // credentials needed for per-call re-auth after reload
      !autoRestartedRef.current
    ) {
      autoRestartedRef.current = true;
      void startCall(selectedTrunkId);
    }
  }, [
    screen,
    callState,
    customerData,
    selectedTrunkId,
    config,
    apiKey,
    startCall,
  ]);

  return startCall;
};
