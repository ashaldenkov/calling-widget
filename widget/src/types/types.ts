import type { TCountryCode } from 'countries-list';

import type { BrowserWarning } from '../utils/browserDetection';

/**
 * Theme customization the host can pass. `mode` selects the built-in light/dark
 * palette (see src/styles/themes.css). Extensible later (accent, etc.).
 */
export interface ThemeSettings {
  mode?: 'light' | 'dark';
  /** Accent color; applied to the widget's `--cw-primary` CSS variable. */
  primaryColor?: string;
}

/**
 * One-time options the host may pass via the `init` event. All optional — the
 * widget also works when the host only emits `call`.
 */
export interface WidgetInitOptions {
  theme?: ThemeSettings;
  /** Base URL for the "Go to profile" link; the button is hidden when absent. */
  webBaseUrl?: string;
}

/**
 * Payload for the `call` event. In this backendless demo the host supplies the
 * customer record and the trunk list directly (no API fetch).
 */
export interface CallParams {
  customer: CustomerData;
  trunks: TrunkListItem[];
  /** Optional status list; falls back to the bundled DEMO_STATUSES. */
  statuses?: StatusOption[];
  phoneNumber?: string;
}

export interface TrunkListItem {
  id: string;
  brandId: string;
  name: string;
  isDefault: boolean;
  status: string;
  enabled: boolean;
  minuteCost: number;
}

export interface StatusOption {
  id: string;
  name: string;
  color: string;
}

export interface StatusesResponse {
  items: StatusOption[];
  pageInfo: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface CustomerStatus {
  id: string;
  name: string;
  color: string;
}

export interface CustomerData {
  id: string;
  firstName: string;
  lastName: string;
  country: TCountryCode;
  status: CustomerStatus | null;
  brandName?: string;
  phoneNumber?: string;
}

export enum CallState {
  Idle = 'idle',
  Calling = 'calling',
  Ringing = 'ringing',
  Connected = 'connected',
  OnHold = 'onHold',
  Ended = 'ended',
  Failed = 'failed',
}

export const ActiveCallStates = new Set<CallState>([
  CallState.Calling,
  CallState.Ringing,
  CallState.Connected,
  CallState.OnHold,
]);

export type WidgetScreen =
  | 'idle'
  | 'sipTrunk'
  | 'changeStatus'
  | 'calling'
  | 'error'
  | 'compatibilityWarning';

export interface MuteNotificationState {
  visible: boolean;
  countdown: number;
}

export interface WidgetState {
  initOptions: WidgetInitOptions | null;
  themeMode: 'light' | 'dark';
  themePrimary: string | null;
  screen: WidgetScreen;
  callState: CallState;
  phoneNumber: string | null;
  customerData: CustomerData | null;
  trunks: TrunkListItem[];
  statuses: StatusOption[];
  isMicMuted: boolean;
  startCallTime: number | null;
  error: string | null; // message on error screen
  notification: string | null; // notification on any screen
  selectedTrunkId: string | null;
  statusConfirmedDuringCall: boolean;
  isCollapsed: boolean;
  compatibilityWarnings: BrowserWarning[];
}
