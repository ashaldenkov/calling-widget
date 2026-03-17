import type { TCountryCode } from 'countries-list';

export interface CallWidgetConfig {
  apiBaseUrl: string;
  webBaseUrl: string;
  janusWsUrl: string;
  authToken: string;
}

export interface CallParams {
  clientId: number;
  phoneNumber: string;
  agentId: number;
}

export interface TrunkResponse {
  customerInfo: CustomerData;
  trunks: TrunkListItem[];
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
  data: StatusOption[];
  pageInfo: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface UpdateStatusData {
  statusId: string;
  comment?: string;
}

export interface UpdateStatusResponse {
  status: CustomerStatus;
  message: string;
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
  | 'error';

export interface MuteNotificationState {
  visible: boolean;
  countdown: number;
}

export interface WidgetState {
  config: CallWidgetConfig | null;
  screen: WidgetScreen;
  callState: CallState;
  clientId: number | null;
  phoneNumber: string | null;
  agentId: number | null;
  customerData: CustomerData | null;
  isMicMuted: boolean;
  startCallTime: number | null;
  error: string | null; // message on error screen
  notification: string | null; // notification on any screen
  selectedTrunkId: string | null;
  statusConfirmedDuringCall: boolean;
  isCollapsed: boolean;
}
