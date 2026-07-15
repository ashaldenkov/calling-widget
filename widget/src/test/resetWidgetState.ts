import { DEMO_STATUSES } from '../demo-data/statuses';
import { widgetState } from '../stores/widgetStore';
import { CallState } from '../types/types';

export function resetWidgetState(): void {
  widgetState.initOptions = null;
  widgetState.themeMode = 'light';
  widgetState.themePrimary = null;
  widgetState.screen = 'idle';
  widgetState.callState = CallState.Idle;
  widgetState.phoneNumber = null;
  widgetState.customerData = null;
  widgetState.trunks = [];
  widgetState.statuses = DEMO_STATUSES;
  widgetState.isMicMuted = false;
  widgetState.startCallTime = null;
  widgetState.error = null;
  widgetState.notification = null;
  widgetState.selectedTrunkId = null;
  widgetState.statusConfirmedDuringCall = false;
  widgetState.isCollapsed = true;
  widgetState.compatibilityWarnings = [];
}
