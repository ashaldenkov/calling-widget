import { useCallback } from 'preact/hooks';

import {
  ERR_CUSTOMER_DATA,
  ERR_GENERIC,
  ERR_MIC_DISCONNECTED,
  ERR_NO_AUDIO,
} from '../errors';
import { eventBus, WidgetEvent } from '../eventBus';
import {
  resetToIdle,
  setCallState,
  setIsEnding,
  setNotification,
  setScreen,
  setStartCallTime,
  widgetState,
} from '../stores/widgetStore';
import { CallState } from '../types/types';
import { handleWidgetError } from '../utils';

import { type MockCallEvent, useMockCall } from './useMockCall';

export const useStartCall = (): ((trunkId: string) => Promise<void>) => {
  const handleEvent = useCallback((event: MockCallEvent) => {
    const emitStateChange = (state: CallState) =>
      eventBus.emit(WidgetEvent.CallStateChange, {
        state,
        customerId: widgetState.customerData?.id ?? undefined,
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
        setIsEnding(false);
        setCallState(CallState.Failed);
        const msg = event.message || ERR_GENERIC;
        setNotification(msg);
        emitStateChange(CallState.Failed);
        eventBus.emit(WidgetEvent.Error, { message: msg });
        break;
      }
      case CallState.Ended: {
        setIsEnding(false);
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

  const handleSilence = useCallback(() => {
    setNotification(ERR_NO_AUDIO);
    eventBus.emit(WidgetEvent.Error, { message: ERR_NO_AUDIO });
  }, []);

  const handleSound = useCallback(() => {
    if (widgetState.notification === ERR_NO_AUDIO) setNotification(null);
  }, []);

  const { makeCall } = useMockCall({
    onEvent: handleEvent,
    onMicDisconnected: handleMicDisconnected,
    onSilence: handleSilence,
    onSound: handleSound,
  });

  const startCall = useCallback(
    async (_trunkId: string) => {
      if (!widgetState.customerData) {
        handleWidgetError(ERR_CUSTOMER_DATA);
        return;
      }

      setScreen('calling');
      setCallState(CallState.Calling);
      eventBus.emit(WidgetEvent.CallStateChange, {
        state: CallState.Calling,
        customerId: widgetState.customerData.id,
      });

      await makeCall();
    },
    [makeCall],
  );

  return startCall;
};
