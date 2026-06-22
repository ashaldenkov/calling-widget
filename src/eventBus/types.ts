import type { CallParams, CallState, CallWidgetConfig } from '../types/types';

export enum WidgetEvent {
  Init = 'init',
  Call = 'call',
  Dismiss = 'dismiss',
  Initialized = 'initialized',
  CallStateChange = 'call_state_change',
  MicToggled = 'mic_toggled',
  WidgetOpened = 'widget_opened',
  WidgetDismissed = 'widget_dismissed',
  Error = 'error',
  TrunkSelected = 'trunk_selected',
  StatusConfirmed = 'status_confirmed',
  StatusChangeSkipped = 'status_change_skipped',
}

export interface WidgetEventPayloads {
  [WidgetEvent.Init]: CallWidgetConfig;
  [WidgetEvent.Call]: CallParams;
  [WidgetEvent.Dismiss]: void;
  [WidgetEvent.Initialized]: void;
  [WidgetEvent.CallStateChange]: { state: CallState; clientId?: number };
  [WidgetEvent.MicToggled]: { muted: boolean };
  [WidgetEvent.WidgetOpened]: void;
  [WidgetEvent.WidgetDismissed]: void;
  [WidgetEvent.Error]: { message: string };
  [WidgetEvent.TrunkSelected]: { trunkId: string; trunkName: string };
  [WidgetEvent.StatusConfirmed]: {
    clientId: number;
    statusId: string;
    dialerId: number;
  };
  [WidgetEvent.StatusChangeSkipped]: { clientId: number };
}

export type EventHandler<E extends WidgetEvent> =
  WidgetEventPayloads[E] extends void
    ? () => void
    : (payload: WidgetEventPayloads[E]) => void;
