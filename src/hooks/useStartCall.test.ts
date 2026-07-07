import { renderHook, act } from '@testing-library/preact';

vi.mock('./useJanusCall', () => ({
  useJanusCall: vi
    .fn()
    .mockReturnValue({ makeCall: vi.fn().mockResolvedValue(undefined) }),
}));
vi.mock('../api/api', () => ({
  api: vi.fn().mockResolvedValue({
    bridgeId: 'bridge-1',
    targetUri: 'sip:test@test.com',
  }),
}));
vi.mock('../utils/tabPresence', () => ({
  claimCall: vi.fn().mockResolvedValue(true),
  releaseCall: vi.fn(),
}));
vi.mock('../utils', () => ({
  handleWidgetError: vi.fn(),
}));

import { api } from '../api/api';
import {
  ERR_CALL_IN_OTHER_TAB,
  ERR_CUSTOMER_DATA,
  ERR_GENERIC,
  ERR_MIC_DISCONNECTED,
  NOTIF_RECONNECTING,
} from '../errors';
import { eventBus, WidgetEvent } from '../eventBus';
import { widgetState } from '../stores/widgetStore';
import { resetWidgetState } from '../test/resetWidgetState';
import { CallState } from '../types/types';
import { handleWidgetError } from '../utils';
import { RecoveryState } from '../utils/callRecovery';
import { claimCall, releaseCall } from '../utils/tabPresence';

import { useJanusCall, type JanusCallEvent } from './useJanusCall';
import { useStartCall } from './useStartCall';

// Capture the callbacks passed to useJanusCall after rendering the hook
function getJanusCallbacks() {
  const calls = vi.mocked(useJanusCall).mock.calls;
  const lastCall = calls.at(-1)![0];
  return {
    onEvent: lastCall.onEvent as (e: JanusCallEvent) => void,
    onMicDisconnected: lastCall.onMicDisconnected as () => void,
    onMicRestored: lastCall.onMicRestored as () => void,
    onRecoveryState: lastCall.onRecoveryState as (s: RecoveryState) => void,
  };
}

beforeEach(() => {
  resetWidgetState();
  widgetState.extCustomerId = 42;
  widgetState.customerData = { dialerId: '1' } as never;
  vi.clearAllMocks();
  vi.mocked(api).mockResolvedValue({
    bridgeId: 'bridge-1',
    targetUri: 'sip:t@t.com',
  });
  vi.mocked(claimCall).mockResolvedValue(true);
  vi.mocked(useJanusCall).mockReturnValue({
    makeCall: vi.fn().mockResolvedValue(undefined),
    hangUp: vi.fn().mockResolvedValue(undefined),
  });
});

describe('startCall', () => {
  it('calls handleWidgetError with ERR_CUSTOMER_DATA and returns early when customerData is null', async () => {
    widgetState.customerData = null;
    const { result } = renderHook(() => useStartCall());
    await act(async () => {
      await result.current('trunk-1');
    });
    expect(handleWidgetError).toHaveBeenCalledWith(ERR_CUSTOMER_DATA);
    expect(widgetState.screen).toBe('idle'); // no navigation
  });

  it('sets error screen with ERR_CALL_IN_OTHER_TAB when claimCall returns false', async () => {
    vi.mocked(claimCall).mockResolvedValue(false);
    const { result } = renderHook(() => useStartCall());
    await act(async () => {
      await result.current('trunk-1');
    });
    expect(widgetState.screen).toBe('error');
    expect(widgetState.error).toBe(ERR_CALL_IN_OTHER_TAB);
  });

  it('releases the call lock and calls handleWidgetError when the API throws', async () => {
    vi.mocked(api).mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useStartCall());
    await act(async () => {
      await result.current('trunk-1');
    });
    expect(releaseCall).toHaveBeenCalled();
    expect(handleWidgetError).toHaveBeenCalledWith(
      ERR_GENERIC,
      expect.any(Error),
    );
  });

  it('sets bridgeId, screen="calling", callState=Calling and emits CallStateChange on success', async () => {
    vi.mocked(api).mockResolvedValue({
      bridgeId: 'b-99',
      targetUri: 'sip:x@x.com',
    });
    const spy = vi.spyOn(eventBus, 'emit');
    const { result } = renderHook(() => useStartCall());
    await act(async () => {
      await result.current('trunk-1');
    });
    expect(widgetState.currentBridgeId).toBe('b-99');
    expect(widgetState.screen).toBe('calling');
    expect(widgetState.callState).toBe(CallState.Calling);
    expect(spy).toHaveBeenCalledWith(WidgetEvent.CallStateChange, {
      state: CallState.Calling,
      clientId: 42,
    });
  });

  it('posts to the call route with only trunkId when no phoneNumber is set', async () => {
    widgetState.phoneNumber = null;
    const { result } = renderHook(() => useStartCall());
    await act(async () => {
      await result.current('1');
    });
    expect(api).toHaveBeenCalledWith('/customers/1/call', {
      method: 'POST',
      data: { trunkId: 1 },
    });
  });

  it('includes phoneNumber in the call request body when set', async () => {
    widgetState.phoneNumber = '+15551234567';
    const { result } = renderHook(() => useStartCall());
    await act(async () => {
      await result.current('1');
    });
    expect(api).toHaveBeenCalledWith('/customers/1/call', {
      method: 'POST',
      data: { trunkId: 1, phoneNumber: '+15551234567' },
    });
  });

  it('emits CallStateChange with clientId=undefined when extCustomerId is null', async () => {
    widgetState.extCustomerId = null;
    vi.mocked(api).mockResolvedValue({
      bridgeId: 'b-1',
      targetUri: 'sip:x@x.com',
    });
    const spy = vi.spyOn(eventBus, 'emit');
    const { result } = renderHook(() => useStartCall());
    await act(async () => {
      await result.current('trunk-1');
    });
    expect(spy).toHaveBeenCalledWith(WidgetEvent.CallStateChange, {
      state: CallState.Calling,
      clientId: undefined,
    });
  });

  it('calls makeCall with the API response after setting state', async () => {
    const makeCall = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useJanusCall).mockReturnValue({
      makeCall,
      hangUp: vi.fn().mockResolvedValue(undefined),
    });
    const { result } = renderHook(() => useStartCall());
    await act(async () => {
      await result.current('trunk-1');
    });
    expect(makeCall).toHaveBeenCalledWith({
      bridgeId: 'bridge-1',
      targetUri: 'sip:t@t.com',
    });
  });
});

describe('auto-restart after reload', () => {
  const armAutoRestart = () => {
    widgetState.config = {
      apiBaseUrl: 'https://api.test',
      webBaseUrl: 'https://web.test',
      janusWsUrl: 'wss://janus.test',
    };
    widgetState.apiKey = 'key-abc';
    widgetState.selectedTrunkId = 'trunk-restore';
    widgetState.customerData = { dialerId: '1' } as never;
    widgetState.screen = 'calling';
    widgetState.callState = CallState.Idle;
  };

  it('resumes the call once when the widget reloads mid-call (screen=calling, callState=Idle)', async () => {
    armAutoRestart();
    await act(async () => {
      renderHook(() => useStartCall());
      // Let the effect fire and the async startCall settle (claimCall -> api).
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // startCall ran with the persisted trunk -> API hit for that call.
    expect(api).toHaveBeenCalledWith(
      '/customers/1/call',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('does not auto-restart a second time on re-render (autoRestartedRef guard)', async () => {
    armAutoRestart();
    const { rerender } = renderHook(() => useStartCall());
    await act(async () => {
      await Promise.resolve();
    });
    const callsAfterFirst = vi.mocked(api).mock.calls.length;

    await act(async () => {
      rerender();
      await Promise.resolve();
    });
    expect(vi.mocked(api).mock.calls.length).toBe(callsAfterFirst);
  });
});

describe('handleEvent', () => {
  it('Ringing → sets callState=Ringing and emits CallStateChange', () => {
    renderHook(() => useStartCall());
    const { onEvent } = getJanusCallbacks();
    const spy = vi.spyOn(eventBus, 'emit');
    onEvent({ state: CallState.Ringing });
    expect(widgetState.callState).toBe(CallState.Ringing);
    expect(spy).toHaveBeenCalledWith(WidgetEvent.CallStateChange, {
      state: CallState.Ringing,
      clientId: 42,
    });
  });

  it('Connected → sets callState=Connected, records startCallTime, emits CallStateChange', () => {
    renderHook(() => useStartCall());
    const { onEvent } = getJanusCallbacks();
    const spy = vi.spyOn(eventBus, 'emit');
    const before = Date.now();
    onEvent({ state: CallState.Connected });
    expect(widgetState.callState).toBe(CallState.Connected);
    expect(widgetState.startCallTime).toBeGreaterThanOrEqual(before);
    expect(widgetState.startCallTime).toBeLessThanOrEqual(Date.now());
    expect(spy).toHaveBeenCalledWith(WidgetEvent.CallStateChange, {
      state: CallState.Connected,
      clientId: 42,
    });
  });

  it('Failed (non-stale) → releases call, sets callState=Failed, sets notification with failure message, emits CallStateChange', () => {
    widgetState.callState = CallState.Connected;
    widgetState.currentBridgeId = 'bridge-1';
    renderHook(() => useStartCall());
    const { onEvent } = getJanusCallbacks();
    const spy = vi.spyOn(eventBus, 'emit');
    onEvent({
      state: CallState.Failed,
      bridgeId: 'bridge-1',
      reason: { kind: 'Busy' },
    });
    expect(releaseCall).toHaveBeenCalled();
    expect(widgetState.callState).toBe(CallState.Failed);
    expect(widgetState.notification).toBe('Line busy.');
    expect(widgetState.currentBridgeId).toBeNull();
    expect(spy).toHaveBeenCalledWith(WidgetEvent.CallStateChange, {
      state: CallState.Failed,
      clientId: 42,
    });
  });

  it('Failed → emits Error event with the failure message', () => {
    widgetState.callState = CallState.Connected;
    widgetState.currentBridgeId = 'bridge-1';
    renderHook(() => useStartCall());
    const { onEvent } = getJanusCallbacks();
    const spy = vi.spyOn(eventBus, 'emit');
    onEvent({
      state: CallState.Failed,
      bridgeId: 'bridge-1',
      message: 'technical failure',
    });
    expect(spy).toHaveBeenCalledWith(WidgetEvent.Error, {
      message: 'technical failure',
    });
  });

  it('Failed with neither reason nor message → falls back to ERR_GENERIC notification', () => {
    widgetState.callState = CallState.Connected;
    widgetState.currentBridgeId = 'bridge-1';
    renderHook(() => useStartCall());
    const { onEvent } = getJanusCallbacks();
    onEvent({ state: CallState.Failed, bridgeId: 'bridge-1' });
    expect(widgetState.notification).toBe(ERR_GENERIC);
  });

  it('emits CallStateChange with clientId=undefined when extCustomerId is null', () => {
    widgetState.extCustomerId = null;
    renderHook(() => useStartCall());
    const { onEvent } = getJanusCallbacks();
    const spy = vi.spyOn(eventBus, 'emit');
    onEvent({ state: CallState.Ringing });
    expect(spy).toHaveBeenCalledWith(WidgetEvent.CallStateChange, {
      state: CallState.Ringing,
      clientId: undefined,
    });
  });

  it('Failed (stale bridgeId) → ignored — does not affect state or emit', () => {
    widgetState.callState = CallState.Connected;
    widgetState.currentBridgeId = 'bridge-current';
    renderHook(() => useStartCall());
    const { onEvent } = getJanusCallbacks();
    const spy = vi.spyOn(eventBus, 'emit');
    onEvent({
      state: CallState.Failed,
      bridgeId: 'bridge-OLD',
      reason: { kind: 'Busy' },
    });
    expect(widgetState.callState).toBe(CallState.Connected); // unchanged
    expect(releaseCall).not.toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });

  it('Ended (non-stale) → releases call, sets callState=Ended, navigates to changeStatus, emits CallStateChange', () => {
    widgetState.callState = CallState.Connected;
    widgetState.currentBridgeId = 'bridge-1';
    widgetState.statusConfirmedDuringCall = false;
    renderHook(() => useStartCall());
    const { onEvent } = getJanusCallbacks();
    const spy = vi.spyOn(eventBus, 'emit');
    onEvent({ state: CallState.Ended, bridgeId: 'bridge-1' });
    expect(releaseCall).toHaveBeenCalled();
    expect(widgetState.callState).toBe(CallState.Ended);
    expect(widgetState.screen).toBe('changeStatus');
    expect(spy).toHaveBeenCalledWith(WidgetEvent.CallStateChange, {
      state: CallState.Ended,
      clientId: 42,
    });
  });

  it('Ended (status already confirmed during call) → resets to idle instead of showing changeStatus, still emits CallStateChange', () => {
    widgetState.callState = CallState.Connected;
    widgetState.currentBridgeId = 'bridge-1';
    widgetState.statusConfirmedDuringCall = true;
    renderHook(() => useStartCall());
    const { onEvent } = getJanusCallbacks();
    const spy = vi.spyOn(eventBus, 'emit');
    onEvent({ state: CallState.Ended, bridgeId: 'bridge-1' });
    expect(widgetState.screen).toBe('idle');
    expect(spy).toHaveBeenCalledWith(WidgetEvent.CallStateChange, {
      state: CallState.Ended,
      clientId: 42,
    });
  });

  it('Ended (stale bridgeId) → ignored — does not emit', () => {
    widgetState.callState = CallState.Connected;
    widgetState.currentBridgeId = 'bridge-current';
    renderHook(() => useStartCall());
    const { onEvent } = getJanusCallbacks();
    const spy = vi.spyOn(eventBus, 'emit');
    onEvent({ state: CallState.Ended, bridgeId: 'bridge-OLD' });
    expect(widgetState.callState).toBe(CallState.Connected);
    expect(spy).not.toHaveBeenCalled();
  });

  it('Failed while callState is already terminal (Idle) → treated as stale and ignored', () => {
    // isStale() returns true purely on the terminal callState, regardless of
    // bridgeId — a late event on an already-idle widget must be a no-op.
    widgetState.callState = CallState.Idle;
    widgetState.currentBridgeId = 'bridge-1';
    renderHook(() => useStartCall());
    const { onEvent } = getJanusCallbacks();
    const spy = vi.spyOn(eventBus, 'emit');
    onEvent({
      state: CallState.Failed,
      bridgeId: 'bridge-1',
      reason: { kind: 'Busy' },
    });
    expect(widgetState.callState).toBe(CallState.Idle); // unchanged
    expect(releaseCall).not.toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('onMicDisconnected', () => {
  it('sets the mic-disconnected notification and emits Error', () => {
    renderHook(() => useStartCall());
    const { onMicDisconnected } = getJanusCallbacks();
    const spy = vi.spyOn(eventBus, 'emit');
    onMicDisconnected();
    expect(widgetState.notification).toBe(ERR_MIC_DISCONNECTED);
    expect(spy).toHaveBeenCalledWith(WidgetEvent.Error, {
      message: ERR_MIC_DISCONNECTED,
    });
  });
});

describe('onMicRestored', () => {
  it('clears the notification when mic is restored', () => {
    widgetState.notification = ERR_MIC_DISCONNECTED;
    renderHook(() => useStartCall());
    const { onMicRestored } = getJanusCallbacks();
    onMicRestored();
    expect(widgetState.notification).toBeNull();
  });
});

describe('onRecoveryState', () => {
  it('Unstable → sets recoveryStatus and shows reconnecting notification', () => {
    renderHook(() => useStartCall());
    const { onRecoveryState } = getJanusCallbacks();
    onRecoveryState(RecoveryState.Unstable);
    expect(widgetState.recoveryStatus).toBe(RecoveryState.Unstable);
    expect(widgetState.notification).toBe(NOTIF_RECONNECTING);
  });

  it('Healthy (after reconnecting) → clears the reconnecting notification', () => {
    widgetState.notification = NOTIF_RECONNECTING;
    renderHook(() => useStartCall());
    const { onRecoveryState } = getJanusCallbacks();
    onRecoveryState(RecoveryState.Healthy);
    expect(widgetState.notification).toBeNull();
  });

  it('Healthy (when notification is something else) → does not clear unrelated notifications', () => {
    widgetState.notification = 'some other notification';
    renderHook(() => useStartCall());
    const { onRecoveryState } = getJanusCallbacks();
    onRecoveryState(RecoveryState.Healthy);
    expect(widgetState.notification).toBe('some other notification');
  });
});
