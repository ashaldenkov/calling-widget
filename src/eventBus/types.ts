import type { CallParams, CallState, CallWidgetConfig } from '../types/types';

export enum WidgetEvent {
  Init = 'init',
  Call = 'call',
  Destroy = 'destroy',
  Initialized = 'initialized',
  CallInitiated = 'call_initiated',
  CallStateChange = 'call_state_change',
  MicToggled = 'mic_toggled',
  WidgetDismissed = 'widget_dismissed',
  Error = 'error',
}

export interface WidgetEventPayloads {
  [WidgetEvent.Init]: CallWidgetConfig;
  [WidgetEvent.Call]: CallParams;
  [WidgetEvent.Destroy]: void;
  [WidgetEvent.Initialized]: void;
  [WidgetEvent.CallInitiated]: void;
  [WidgetEvent.CallStateChange]: { state: CallState; clientId?: number };
  [WidgetEvent.MicToggled]: { muted: boolean };
  [WidgetEvent.WidgetDismissed]: void;
  [WidgetEvent.Error]: { message: string };
}

export type EventHandler<E extends WidgetEvent> =
  WidgetEventPayloads[E] extends void
    ? () => void
    : (payload: WidgetEventPayloads[E]) => void;
