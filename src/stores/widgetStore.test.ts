import { eventBus, WidgetEvent } from '../eventBus';
import { resetWidgetState } from '../test/resetWidgetState';
import { CallState } from '../types/types';
import { RecoveryState } from '../utils/callRecovery';

import {
  resetToIdle,
  setCallParams,
  setCompatibilityWarnings,
  setConfig,
  setCurrentBridgeId,
  setError,
  setIsCollapsed,
  setMicMuted,
  setNotification,
  setRecoveryStatus,
  setScreen,
  setSelectedTrunkId,
  setStartCallTime,
  updateAuthToken,
  widgetState,
} from './widgetStore';

const MOCK_CONFIG = {
  apiBaseUrl: 'https://api.test',
  webBaseUrl: 'https://web.test',
  janusWsUrl: 'wss://janus.test',
  authToken: 'tok-123',
};

const MOCK_PARAMS = {
  apiKey: 'api-key',
  extCustomerId: 42,
  phoneNumber: '+1234567890',
  extAgentId: 7,
};

beforeEach(() => {
  resetWidgetState();
  sessionStorage.clear();
});

describe('setConfig', () => {
  it('writes config to widgetState', () => {
    setConfig(MOCK_CONFIG);
    expect(widgetState.config).toEqual(MOCK_CONFIG);
  });

  it('overwrites a previously set config', () => {
    setConfig(MOCK_CONFIG);
    setConfig({ ...MOCK_CONFIG, authToken: 'new-tok' });
    expect(widgetState.config?.authToken).toBe('new-tok');
  });
});

describe('updateAuthToken', () => {
  it('updates the authToken on an existing config', () => {
    setConfig(MOCK_CONFIG);
    updateAuthToken('fresh-token');
    expect(widgetState.config?.authToken).toBe('fresh-token');
  });

  it('is a no-op when config is null — no crash, state unchanged', () => {
    updateAuthToken('tok');
    expect(widgetState.config).toBeNull();
  });

  it('is a no-op when the new token is identical to the current one', () => {
    setConfig(MOCK_CONFIG);
    const before = widgetState.config;
    updateAuthToken(MOCK_CONFIG.authToken);
    // No new object created — same reference
    expect(widgetState.config).toBe(before);
  });

  it('creates a new config object when the token changes — other fields are preserved', () => {
    setConfig(MOCK_CONFIG);
    updateAuthToken('next-token');
    expect(widgetState.config?.apiBaseUrl).toBe(MOCK_CONFIG.apiBaseUrl);
    expect(widgetState.config?.janusWsUrl).toBe(MOCK_CONFIG.janusWsUrl);
  });
});

describe('setCallParams', () => {
  it('writes all call params into state', () => {
    setCallParams(MOCK_PARAMS);
    expect(widgetState.extCustomerId).toBe(42);
    expect(widgetState.phoneNumber).toBe('+1234567890');
    expect(widgetState.extAgentId).toBe(7);
    expect(widgetState.apiKey).toBe('api-key');
  });

  it('coerces missing phoneNumber to null', () => {
    setCallParams({ apiKey: 'k', extCustomerId: 1, extAgentId: 2 });
    expect(widgetState.phoneNumber).toBeNull();
  });

  it('stores extCustomerId and extAgentId as received, even for edge values', () => {
    setCallParams({ apiKey: 'k', extCustomerId: 0, extAgentId: 0 });
    expect(widgetState.extCustomerId).toBe(0);
    expect(widgetState.extAgentId).toBe(0);
  });
});

describe('setScreen', () => {
  it('updates the screen field', () => {
    setScreen('error');
    expect(widgetState.screen).toBe('error');
  });

  it('emits WidgetOpened exactly once when transitioning from idle to a non-idle screen', () => {
    const spy = vi.spyOn(eventBus, 'emit');
    setScreen('sipTrunk');
    expect(spy).toHaveBeenCalledWith(WidgetEvent.WidgetOpened);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does not emit WidgetOpened on subsequent non-idle → non-idle transitions', () => {
    setScreen('sipTrunk'); // triggers WidgetOpened
    const spy = vi.spyOn(eventBus, 'emit');
    setScreen('calling'); // no WidgetOpened here
    expect(spy).not.toHaveBeenCalledWith(WidgetEvent.WidgetOpened);
  });

  it('does not emit WidgetOpened when staying on idle', () => {
    const spy = vi.spyOn(eventBus, 'emit');
    setScreen('idle');
    expect(spy).not.toHaveBeenCalledWith(WidgetEvent.WidgetOpened);
  });

  it('can cycle through all screen values', () => {
    const screens: Array<Parameters<typeof setScreen>[0]> = [
      'sipTrunk',
      'calling',
      'changeStatus',
      'compatibilityWarning',
      'error',
      'idle',
    ];
    for (const screen of screens) {
      setScreen(screen);
      expect(widgetState.screen).toBe(screen);
    }
  });
});

describe('setMicMuted', () => {
  it('sets isMicMuted to true and emits MicToggled with muted: true', () => {
    const spy = vi.spyOn(eventBus, 'emit');
    setMicMuted(true);
    expect(widgetState.isMicMuted).toBe(true);
    expect(spy).toHaveBeenCalledWith(WidgetEvent.MicToggled, { muted: true });
  });

  it('sets isMicMuted to false and emits MicToggled with muted: false', () => {
    widgetState.isMicMuted = true; // start from true
    const spy = vi.spyOn(eventBus, 'emit');
    setMicMuted(false);
    expect(widgetState.isMicMuted).toBe(false);
    expect(spy).toHaveBeenCalledWith(WidgetEvent.MicToggled, { muted: false });
  });

  it('is a no-op when called with the same value — prevents duplicate MicToggled events', () => {
    // Initial state is isMicMuted = false
    const spy = vi.spyOn(eventBus, 'emit');
    setMicMuted(false);
    expect(spy).not.toHaveBeenCalled();
    expect(widgetState.isMicMuted).toBe(false);
  });
});

describe('resetToIdle', () => {
  it('resets all mutable state back to initial values', () => {
    setScreen('sipTrunk');
    setCallParams(MOCK_PARAMS);
    setError('something went wrong');
    setNotification('reconnecting...');
    widgetState.callState = CallState.Connected;
    widgetState.statusConfirmedDuringCall = true;

    resetToIdle();

    expect(widgetState.screen).toBe('idle');
    expect(widgetState.callState).toBe(CallState.Idle);
    expect(widgetState.extCustomerId).toBeNull();
    expect(widgetState.phoneNumber).toBeNull();
    expect(widgetState.error).toBeNull();
    expect(widgetState.notification).toBeNull();
    expect(widgetState.statusConfirmedDuringCall).toBe(false);
  });

  it('preserves config across a reset — widget can be re-used without re-init', () => {
    setConfig(MOCK_CONFIG);
    setScreen('sipTrunk');
    resetToIdle();
    expect(widgetState.config).toEqual(MOCK_CONFIG);
  });

  it('emits WidgetDismissed when the widget was open', () => {
    setScreen('calling');
    const spy = vi.spyOn(eventBus, 'emit');
    resetToIdle();
    expect(spy).toHaveBeenCalledWith(WidgetEvent.WidgetDismissed);
  });

  it('does not emit WidgetDismissed when widget was already idle', () => {
    // screen starts at 'idle' after beforeEach reset
    const spy = vi.spyOn(eventBus, 'emit');
    resetToIdle();
    expect(spy).not.toHaveBeenCalledWith(WidgetEvent.WidgetDismissed);
  });

  it('emits WidgetDismissed exactly once, not multiple times', () => {
    setScreen('error');
    const spy = vi.spyOn(eventBus, 'emit');
    resetToIdle();
    const dismissedCalls = spy.mock.calls.filter(
      ([event]) => event === WidgetEvent.WidgetDismissed,
    );
    expect(dismissedCalls).toHaveLength(1);
  });
});

describe('other simple setters', () => {
  it('setError writes to widgetState.error', () => {
    setError('boom');
    expect(widgetState.error).toBe('boom');
    setError(null);
    expect(widgetState.error).toBeNull();
  });

  it('setNotification writes to widgetState.notification', () => {
    setNotification('reconnecting...');
    expect(widgetState.notification).toBe('reconnecting...');
    setNotification(null);
    expect(widgetState.notification).toBeNull();
  });

  it('setSelectedTrunkId writes to widgetState.selectedTrunkId', () => {
    setSelectedTrunkId('trunk-abc');
    expect(widgetState.selectedTrunkId).toBe('trunk-abc');
    setSelectedTrunkId(null);
    expect(widgetState.selectedTrunkId).toBeNull();
  });

  it('setIsCollapsed writes to widgetState.isCollapsed', () => {
    setIsCollapsed(false);
    expect(widgetState.isCollapsed).toBe(false);
  });

  it('setStartCallTime writes to widgetState.startCallTime', () => {
    const ts = Date.now();
    setStartCallTime(ts);
    expect(widgetState.startCallTime).toBe(ts);
  });

  it('setCurrentBridgeId writes to widgetState.currentBridgeId', () => {
    setCurrentBridgeId('bridge-xyz');
    expect(widgetState.currentBridgeId).toBe('bridge-xyz');
  });

  it('setCompatibilityWarnings replaces the warnings array', () => {
    setCompatibilityWarnings([{ type: 'mobileDevice' }]);
    expect(widgetState.compatibilityWarnings).toEqual([
      { type: 'mobileDevice' },
    ]);
  });

  it('setRecoveryStatus updates recoveryStatus, no-op on same value', () => {
    setRecoveryStatus(RecoveryState.Unstable);
    expect(widgetState.recoveryStatus).toBe(RecoveryState.Unstable);
    // Calling again with same value should not change anything
    setRecoveryStatus(RecoveryState.Unstable);
    expect(widgetState.recoveryStatus).toBe(RecoveryState.Unstable);
  });
});

describe('sessionStorage persistence', () => {
  it('writes a snapshot to sessionStorage whenever state changes', () => {
    setScreen('sipTrunk');
    const raw = sessionStorage.getItem('CallWidgetStore');
    expect(raw).not.toBeNull();
    const { state } = JSON.parse(raw!) as { state: { screen: string } };
    expect(state.screen).toBe('sipTrunk');
  });

  it('snapshot includes a persistedAt timestamp close to now', () => {
    const before = Date.now();
    setScreen('calling');
    const { persistedAt } = JSON.parse(
      sessionStorage.getItem('CallWidgetStore')!,
    ) as {
      persistedAt: number;
    };
    expect(persistedAt).toBeGreaterThanOrEqual(before);
    expect(persistedAt).toBeLessThanOrEqual(Date.now());
  });

  it('snapshot reflects the latest state after multiple changes', () => {
    setScreen('calling');
    setCallParams(MOCK_PARAMS);
    const { state } = JSON.parse(
      sessionStorage.getItem('CallWidgetStore')!,
    ) as {
      state: { screen: string; apiKey: string | null };
    };
    expect(state.screen).toBe('calling');
    expect(state.apiKey).toBe('api-key');
  });
});
