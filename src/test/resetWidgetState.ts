import { widgetState } from '../stores/widgetStore';
import { CallState } from '../types/types';
import { RecoveryState } from '../utils/callRecovery';

export function resetWidgetState(): void {
  widgetState.config = null;
  widgetState.screen = 'idle';
  widgetState.callState = CallState.Idle;
  widgetState.extCustomerId = null;
  widgetState.phoneNumber = null;
  widgetState.extAgentId = null;
  widgetState.apiKey = null;
  widgetState.customerData = null;
  widgetState.isMicMuted = false;
  widgetState.startCallTime = null;
  widgetState.error = null;
  widgetState.notification = null;
  widgetState.selectedTrunkId = null;
  widgetState.statusConfirmedDuringCall = false;
  widgetState.isCollapsed = true;
  widgetState.compatibilityWarnings = [];
  widgetState.currentBridgeId = null;
  widgetState.recoveryStatus = RecoveryState.Healthy;
}
