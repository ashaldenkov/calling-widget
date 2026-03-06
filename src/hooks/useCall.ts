import { useMutation } from '@tanstack/react-query';
import { useCallback, useState, type RefObject } from 'react';

import { api } from '../api/api';
import { eventBus, WidgetEvent } from '../eventBus';
import { useWidgetStore } from '../stores/widgetStore';
import {
  CallState,
  type TrunkResponse,
  type CallCustomerResponse,
} from '../types/types';
import { getErrorMessage, handleWidgetError } from '../utils';

import { type JanusCallEvent, useJanusCall } from './useJanusCall';

export const useCall = (
  audioElementRef: RefObject<HTMLAudioElement | null>,
) => {
  const config = useWidgetStore((s) => s.config);

  const handleEvent = useCallback((event: JanusCallEvent) => {
    const store = useWidgetStore.getState();
    const emitStateChange = (state: CallState) =>
      eventBus.emit(WidgetEvent.CallStateChange, {
        state,
        customerId: store.customerId ?? undefined,
      });

    switch (event.state) {
      case CallState.Calling:
        eventBus.emit(WidgetEvent.CallInitiated);
        break;
      case CallState.Ringing:
        store.setCallState(CallState.Ringing);
        emitStateChange(CallState.Ringing);
        break;
      case CallState.Connected:
        store.setCallState(CallState.Connected);
        store.setStartCallTime(Date.now());
        emitStateChange(CallState.Connected);
        break;
      case CallState.Failed: {
        store.setCallState(CallState.Failed);
        const msg = event.message || 'Call failed. Please try again.';
        store.setNotification(msg);
        emitStateChange(CallState.Failed);
        eventBus.emit(WidgetEvent.Error, { message: msg });
        break;
      }
      case CallState.Ended:
        store.setCallState(CallState.Ended);
        store.setStartCallTime(null);
        emitStateChange(CallState.Ended);
        break;
    }
  }, []);

  const { makeCall, hangUp, setMute } = useJanusCall({
    onEvent: handleEvent,
    audioElementRef,
    janusWsUrl: config?.janusWsUrl ?? '',
  });

  const trunkMutation = useMutation<
    TrunkResponse,
    Error,
    { extAgentId: number; extCustomerId?: number; phoneNumber?: string }
  >({ mutationKey: ['widget', 'best-trunk-for-call'] });

  const checkMicPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch (err) {
      handleWidgetError('Microphone permission was denied', err);
      return false;
    }
  }, []);

  const fetchTrunkAndCall = useCallback(
    async (params: {
      customerId: number | null;
      phoneNumber: string | null;
      agentId: number;
    }) => {
      try {
        const trunk = await trunkMutation.mutateAsync({
          extAgentId: params.agentId,
          extCustomerId: params.customerId ?? undefined,
          phoneNumber: params.phoneNumber ?? undefined,
        });

        if (!trunk?.id) {
          handleWidgetError('No SIP Trunk available');
          return;
        }

        const customerInfo = trunk.customerInfo;
        useWidgetStore.getState().setCustomerData(customerInfo ?? null);

        const response = await api<CallCustomerResponse>(
          `/customers/${customerInfo.dialerId}/call`,
          { method: 'POST', data: { trunkId: trunk.id } },
        );

        const store = useWidgetStore.getState();
        store.setScreen('calling');
        store.setCallState(CallState.Calling);
        eventBus.emit(WidgetEvent.CallStateChange, {
          state: CallState.Calling,
          customerId: params.customerId ?? undefined,
        });

        await makeCall(response);
      } catch (err) {
        const store = useWidgetStore.getState();
        store.setCallState(CallState.Failed);
        handleWidgetError(getErrorMessage(err, 'Something went wrong.'), err);
      }
    },
    [makeCall, trunkMutation],
  );

  const [isLoading, setIsLoading] = useState(false);

  const startCall = useCallback(async () => {
    const { customerId, phoneNumber, agentId } = useWidgetStore.getState();

    if (agentId === null) {
      handleWidgetError('Agent ID is required');
      return;
    }

    const micAllowed = await checkMicPermission();
    if (!micAllowed) return;

    setIsLoading(true);
    try {
      await fetchTrunkAndCall({ customerId, phoneNumber, agentId });
    } finally {
      setIsLoading(false);
    }
  }, [checkMicPermission, fetchTrunkAndCall]);

  return { hangUp, setMute, startCall, isLoading };
};
