import { create } from 'zustand';

import {
  CallState,
  type CallParams,
  type CallWidgetConfig,
  type CustomerData,
  type WidgetScreen,
  type WidgetState,
} from '../types/types';

interface WidgetActions {
  setConfig: (config: CallWidgetConfig) => void;
  setCallParams: (params: CallParams) => void;
  setScreen: (screen: WidgetScreen) => void;
  setCallState: (state: CallState) => void;
  setStartCallTime: (time: number | null) => void;
  setError: (error: string | null) => void;
  setNotification: (notification: string | null) => void;
  setMicMuted: (muted: boolean) => void;
  setCustomerData: (data: CustomerData | null) => void;
  endCall: () => void;
  resetToIdle: () => void;
}

export type WidgetStore = WidgetState & WidgetActions;

const initialState: WidgetState = {
  config: null,
  screen: 'idle',
  callState: CallState.Idle,
  customerId: null,
  phoneNumber: null,
  agentId: null,
  customerData: null,
  isMicMuted: false,
  startCallTime: null,
  error: null,
  notification: null,
};

export const useWidgetStore = create<WidgetStore>((set) => ({
  ...initialState,

  setConfig: (config) => set({ config }),

  setCallParams: (params: CallParams) => {
    set({
      customerId: params.customerId,
      phoneNumber: params.phoneNumber,
      agentId: params.agentId,
    });
  },

  setScreen: (screen) => set({ screen }),

  setCallState: (callState) => set({ callState }),

  setStartCallTime: (startCallTime) => set({ startCallTime }),

  setError: (error) => set({ error }),

  setNotification: (notification) => set({ notification }),

  setMicMuted: (muted) => set({ isMicMuted: muted }),

  setCustomerData: (customerData) => set({ customerData }),

  endCall: () => set({ callState: CallState.Ended, startCallTime: null }),

  resetToIdle: () => set((s) => ({ ...initialState, config: s.config })),
}));
