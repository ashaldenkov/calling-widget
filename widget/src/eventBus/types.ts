import type {
  CallParams,
  CallState,
  CustomerStatus,
  ThemeSettings,
  WidgetInitOptions,
} from '../types/types';

export enum WidgetEvent {
  Init = 'init',
  Call = 'call',
  Dismiss = 'dismiss',
  Customize = 'customize',
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
  [WidgetEvent.Init]: WidgetInitOptions;
  [WidgetEvent.Call]: CallParams;
  [WidgetEvent.Dismiss]: void;
  [WidgetEvent.Customize]: ThemeSettings;
  [WidgetEvent.Initialized]: void;
  [WidgetEvent.CallStateChange]: { state: CallState; customerId?: string };
  [WidgetEvent.MicToggled]: { muted: boolean };
  [WidgetEvent.WidgetOpened]: void;
  [WidgetEvent.WidgetDismissed]: void;
  [WidgetEvent.Error]: { message: string };
  [WidgetEvent.TrunkSelected]: { trunkId: string; trunkName: string };
  [WidgetEvent.StatusConfirmed]: {
    customerId: string;
    statusId: string;
    status: CustomerStatus;
    comment?: string;
  };
  [WidgetEvent.StatusChangeSkipped]: { customerId: string };
}

export type EventHandler<E extends WidgetEvent> =
  WidgetEventPayloads[E] extends void
    ? () => void
    : (payload: WidgetEventPayloads[E]) => void;
