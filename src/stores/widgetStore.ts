import { effect } from '@preact/signals';
import { deepSignal } from 'deepsignal';

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

const STORAGE_KEY = 'CallWidgetStore';

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

function loadPersisted(): Partial<PersistedWidgetState> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as
      | Partial<PersistedWidgetState>
      | { state?: Partial<PersistedWidgetState> };
    if (parsed && typeof parsed === 'object' && 'state' in parsed) {
      return parsed.state ?? {};
    }
    return parsed as Partial<PersistedWidgetState>;
  } catch {
    return {};
  }
}

function mergePersisted(
  stored: Partial<PersistedWidgetState>,
): Partial<WidgetState> {
  if (stored.callState && ActiveCallStates.has(stored.callState)) {
    return {
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
    return { ...stored, screen: 'idle' };
  }

  return stored;
}

const hydrated = mergePersisted(loadPersisted());

export const widgetState = deepSignal<WidgetState>({
  ...initialState,
  ...hydrated,
});

// Persistence
effect(() => {
  const snapshot: PersistedWidgetState = {
    screen: widgetState.screen,
    callState: widgetState.callState,
    clientId: widgetState.clientId,
    phoneNumber: widgetState.phoneNumber,
    agentId: widgetState.agentId,
    customerData: widgetState.customerData,
    startCallTime: widgetState.startCallTime,
    selectedTrunkId: widgetState.selectedTrunkId,
    isMicMuted: widgetState.isMicMuted,
    statusConfirmedDuringCall: widgetState.statusConfirmedDuringCall,
    isCollapsed: widgetState.isCollapsed,
  };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore
  }
});

// Actions

export const setConfig = (config: CallWidgetConfig): void => {
  widgetState.config = config;
};

export const updateAuthToken = (token: string): void => {
  const current = widgetState.config;
  if (!current || current.authToken === token) return;
  widgetState.config = { ...current, authToken: token };
};

export const setCallParams = (params: CallParams): void => {
  widgetState.clientId = params.clientId;
  widgetState.phoneNumber = params.phoneNumber;
  widgetState.agentId = params.agentId;
};

export const setScreen = (screen: WidgetScreen): void => {
  const prev = widgetState.screen;
  widgetState.screen = screen;
  if (prev === 'idle' && screen !== 'idle') {
    eventBus.emit(WidgetEvent.WidgetOpened);
  }
};

export const setCallState = (callState: CallState): void => {
  widgetState.callState = callState;
};

export const setStartCallTime = (time: number | null): void => {
  widgetState.startCallTime = time;
};

export const setError = (error: string | null): void => {
  widgetState.error = error;
};

export const setNotification = (notification: string | null): void => {
  widgetState.notification = notification;
};

export const setMicMuted = (muted: boolean): void => {
  if (widgetState.isMicMuted === muted) return;
  widgetState.isMicMuted = muted;
  eventBus.emit(WidgetEvent.MicToggled, { muted });
};

export const setCustomerData = (data: CustomerData | null): void => {
  widgetState.customerData = data;
};

export const setSelectedTrunkId = (id: string | null): void => {
  widgetState.selectedTrunkId = id;
};

export const setStatusConfirmedDuringCall = (confirmed: boolean): void => {
  widgetState.statusConfirmedDuringCall = confirmed;
};

export const setIsCollapsed = (v: boolean): void => {
  widgetState.isCollapsed = v;
};

export const setCompatibilityWarnings = (warnings: BrowserWarning[]): void => {
  widgetState.compatibilityWarnings = warnings;
};

export const resetToIdle = (): void => {
  const wasOpen = widgetState.screen !== 'idle';
  const keepConfig = widgetState.config;
  Object.assign(widgetState, initialState, { config: keepConfig });
  if (wasOpen) {
    eventBus.emit(WidgetEvent.WidgetDismissed);
  }
};
