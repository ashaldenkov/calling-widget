import { deepSignal } from 'deepsignal';

import { DEMO_STATUSES } from '../demo-data/statuses';
import { eventBus, WidgetEvent } from '../eventBus';
import {
  CallState,
  type CallParams,
  type CustomerData,
  type StatusOption,
  type ThemeSettings,
  type WidgetInitOptions,
  type WidgetScreen,
  type WidgetState,
} from '../types/types';
import type { BrowserWarning } from '../utils/browserDetection';

const initialState: WidgetState = {
  initOptions: null,
  themeMode: 'light',
  themePrimary: null,
  screen: 'idle',
  callState: CallState.Idle,
  phoneNumber: null,
  customerData: null,
  trunks: [],
  statuses: DEMO_STATUSES,
  isMicMuted: false,
  startCallTime: null,
  error: null,
  notification: null,
  selectedTrunkId: null,
  statusConfirmedDuringCall: false,
  isCollapsed: true,
  compatibilityWarnings: [],
};

// Backendless demo: purely in-memory state, no persistence/hydration.
export const widgetState = deepSignal<WidgetState>({ ...initialState });

// Actions

export const setInitOptions = (options: WidgetInitOptions): void => {
  widgetState.initOptions = options;
  if (options.theme) applyTheme(options.theme);
};

export const applyTheme = (theme: ThemeSettings): void => {
  if (theme.mode) widgetState.themeMode = theme.mode;
  if (theme.primaryColor !== undefined) {
    widgetState.themePrimary = theme.primaryColor || null;
  }
};

export const setThemeMode = (mode: 'light' | 'dark'): void => {
  widgetState.themeMode = mode;
};

export const setCallParams = (params: CallParams): void => {
  widgetState.customerData = params.customer;
  widgetState.trunks = params.trunks;
  widgetState.statuses = params.statuses ?? DEMO_STATUSES;
  widgetState.phoneNumber = params.phoneNumber ?? null;
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

export const setStatuses = (statuses: StatusOption[]): void => {
  widgetState.statuses = statuses;
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
  const keepInit = widgetState.initOptions;
  const keepTheme = widgetState.themeMode;
  const keepPrimary = widgetState.themePrimary;
  Object.assign(widgetState, initialState, {
    initOptions: keepInit,
    themeMode: keepTheme,
    themePrimary: keepPrimary,
  });
  if (wasOpen) {
    eventBus.emit(WidgetEvent.WidgetDismissed);
  }
};
