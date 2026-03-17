import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { eventBus, WidgetEvent } from '../eventBus';
import {
  ActiveCallStates,
  CallState,
  type CallParams,
  type CallWidgetConfig,
  type CustomerData,
  type WidgetScreen,
  type WidgetState,
} from '../types/types';
import type { BrowserWarning } from '../utils/browserDetection';

interface WidgetActions {
  setConfig: (config: CallWidgetConfig) => void;
  updateAuthToken: (token: string) => void;
  setCallParams: (params: CallParams) => void;
  setScreen: (screen: WidgetScreen) => void;
  setCallState: (state: CallState) => void;
  setStartCallTime: (time: number | null) => void;
  setError: (error: string | null) => void;
  setNotification: (notification: string | null) => void;
  setMicMuted: (muted: boolean) => void;
  setCustomerData: (data: CustomerData | null) => void;
  setSelectedTrunkId: (id: string | null) => void;
  setStatusConfirmedDuringCall: (confirmed: boolean) => void;
  setIsCollapsed: (v: boolean) => void;
  setCompatibilityWarnings: (warnings: BrowserWarning[]) => void;
  endCall: () => void;
  resetToIdle: () => void;
}

export type WidgetStore = WidgetState & WidgetActions;

type PersistedWidgetState = Pick<
  WidgetState,
  | 'screen'
  | 'callState'
  | 'clientId'
  | 'phoneNumber'
  | 'agentId'
  | 'customerData'
  | 'startCallTime'
  | 'selectedTrunkId'
  | 'isMicMuted'
  | 'statusConfirmedDuringCall'
  | 'isCollapsed'
>;

const initialState: WidgetState = {
  config: null,
  screen: 'idle',
  callState: CallState.Idle,
  clientId: null,
  phoneNumber: null,
  agentId: null,
  customerData: null,
  isMicMuted: false,
  startCallTime: null,
  error: null,
  notification: null,
  selectedTrunkId: null,
  statusConfirmedDuringCall: false,
  isCollapsed: true,
  compatibilityWarnings: [],
};

export const useWidgetStore = create<WidgetStore>()(
  persist(
    (set) => ({
      ...initialState,

      setConfig: (config) => set({ config }),

      updateAuthToken: (token) =>
        set((s) => {
          if (!s.config || s.config.authToken === token) return {};
          return { config: { ...s.config, authToken: token } };
        }),

      setCallParams: (params: CallParams) => {
        set({
          clientId: params.clientId,
          phoneNumber: params.phoneNumber,
          agentId: params.agentId,
        });
      },

      setScreen: (screen) =>
        set((s) => {
          if (s.screen === 'idle' && screen !== 'idle') {
            eventBus.emit(WidgetEvent.WidgetOpened);
          }
          return { screen };
        }),

      setCallState: (callState) => set({ callState }),

      setStartCallTime: (startCallTime) => set({ startCallTime }),

      setError: (error) => set({ error }),

      setNotification: (notification) => set({ notification }),

      setMicMuted: (muted) => set({ isMicMuted: muted }),

      setCustomerData: (customerData) => set({ customerData }),

      setSelectedTrunkId: (selectedTrunkId) => set({ selectedTrunkId }),

      setStatusConfirmedDuringCall: (statusConfirmedDuringCall) =>
        set({ statusConfirmedDuringCall }),

      setIsCollapsed: (isCollapsed) => set({ isCollapsed }),

      setCompatibilityWarnings: (compatibilityWarnings) =>
        set({ compatibilityWarnings }),

      endCall: () => set({ callState: CallState.Ended, startCallTime: null }),

      resetToIdle: () =>
        set((s) => {
          if (s.screen !== 'idle') {
            eventBus.emit(WidgetEvent.WidgetDismissed);
          }
          return { ...initialState, config: s.config };
        }),
    }),
    {
      name: 'CallWidgetStore',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state): PersistedWidgetState => ({
        screen: state.screen,
        callState: state.callState,
        clientId: state.clientId,
        phoneNumber: state.phoneNumber,
        agentId: state.agentId,
        customerData: state.customerData,
        startCallTime: state.startCallTime,
        selectedTrunkId: state.selectedTrunkId,
        isMicMuted: state.isMicMuted,
        statusConfirmedDuringCall: state.statusConfirmedDuringCall,
        isCollapsed: state.isCollapsed,
      }),
      merge: (persisted, current) => {
        const stored = persisted as Partial<PersistedWidgetState>;

        if (stored.callState && ActiveCallStates.has(stored.callState)) {
          return {
            ...current,
            ...stored,
            callState: CallState.Idle, // triggers auto-restart useEffect in useCall
            screen: 'calling',
            startCallTime: null,
          };
        }

        // Transient screens that have no meaning after a reload
        if (
          stored.screen === 'error' ||
          stored.screen === 'sipTrunk' ||
          stored.screen === 'compatibilityWarning'
        ) {
          return { ...current, ...stored, screen: 'idle' };
        }

        return { ...current, ...stored };
      },
    },
  ),
);
