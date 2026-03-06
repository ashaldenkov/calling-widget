import type { TCountryCode } from 'countries-list';

export interface CallWidgetConfig {
  apiBaseUrl: string;
  webBaseUrl: string;
  janusWsUrl: string;
  authToken: string;
}

export interface CallParams {
  customerId: number;
  phoneNumber: string;
  agentId: number;
}

export interface TrunkResponse {
  id: number;
  name: string;
  brandId: string;
  enabled: boolean;
  isDefault: boolean;
  minuteCost: number;
  status: string;
  customerInfo: CustomerData;
}

export interface CallCustomerResponse {
  bridgeId: string;
  targetUri: string;
}

export interface CustomerStatus {
  id: string;
  name: string;
  color: string;
}

export interface CustomerData {
  id: string;
  dialerId: number;
  firstName: string;
  lastName: string;
  country: TCountryCode;
  status: CustomerStatus | null;
  brandName?: string;
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

export type WidgetScreen = 'idle' | 'confirmation' | 'calling' | 'error';

export interface MuteNotificationState {
  visible: boolean;
  countdown: number;
}

export interface WidgetState {
  config: CallWidgetConfig | null;
  screen: WidgetScreen;
  callState: CallState;
  customerId: number | null;
  phoneNumber: string | null;
  agentId: number | null;
  customerData: CustomerData | null;
  isMicMuted: boolean;
  startCallTime: number | null;
  error: string | null; // message on error screen
  notification: string | null; // notification on any screen
}
