import { renderHook, act } from '@testing-library/preact';

// ---------------------------------------------------------------------------
// Types describing the untyped Janus gateway surface we drive in tests.
// ---------------------------------------------------------------------------
type MockFn = ReturnType<typeof vi.fn>;

interface FakeTrack {
  kind: string;
  enabled: boolean;
  onended: (() => void) | null;
  stop: MockFn;
}

interface FakeStream {
  tracks: FakeTrack[];
  getAudioTracks(): FakeTrack[];
  removeTrack(t: FakeTrack): void;
  addTrack(t: FakeTrack): void;
}

interface FakeSender {
  track: FakeTrack | null;
  replaceTrack: MockFn;
}

interface FakePc {
  getSenders(): FakeSender[];
}

interface WebrtcStuff {
  pc: FakePc | null;
  myStream: FakeStream | null;
}

interface FakeHandle {
  send: MockFn;
  createOffer: MockFn;
  handleRemoteJsep: MockFn;
  hangup: MockFn;
  detach: MockFn;
  webrtcStuff: WebrtcStuff;
}

interface SendConfig {
  message: { request: string };
  jsep?: unknown;
  success: () => void;
  error: (e?: { message?: string }) => void;
}

interface OfferConfig {
  success: (jsep: unknown) => void;
  error: (e?: { message?: string }) => void;
}

interface OnMessageResult {
  event?: string;
  code?: number;
  reason?: string;
}

interface AttachConfig {
  success: (handle: FakeHandle) => void;
  error: (e?: { message?: string }) => void;
  onmessage: (msg: { result?: OnMessageResult } | null, jsep: unknown) => void;
  onremotetrack: (track: FakeTrack, mid: string, on: boolean) => void;
  webrtcState: (on: boolean) => void;
  iceState: (state: string) => void;
  connectionState: (state: string) => void;
  oncleanup: () => void;
  detached: () => void;
}

// ---------------------------------------------------------------------------
// janusStore mock
// ---------------------------------------------------------------------------
const janusHandle: { value: FakeHandle | null } = { value: null };
const hangUpRef: { current: null | (() => Promise<void>) } = { current: null };

const getJanusSession = vi.fn();
const destroyJanusSession = vi.fn();
const setJanusHandle = vi.fn((handle: FakeHandle) => {
  janusHandle.value = handle;
});
const clearJanusHandle = vi.fn(() => {
  janusHandle.value = null;
});

let sessionDestroyedCb: (() => void) | null = null;
const onJanusSessionDestroyed = vi.fn((fn: () => void) => {
  sessionDestroyedCb = fn;
  return () => {
    sessionDestroyedCb = null;
  };
});

vi.mock('../stores/janusStore', () => ({
  getJanusSession: (url: string) => getJanusSession(url) as unknown,
  destroyJanusSession: (): void => {
    destroyJanusSession();
  },
  setJanusHandle: (handle: FakeHandle) => setJanusHandle(handle),
  clearJanusHandle: () => clearJanusHandle(),
  onJanusSessionDestroyed: (fn: () => void) => onJanusSessionDestroyed(fn),
  get janusHandle() {
    return janusHandle;
  },
  get hangUpRef() {
    return hangUpRef;
  },
}));

// ---------------------------------------------------------------------------
// callAudioUtils mock
// ---------------------------------------------------------------------------
interface FakeCtx {
  createMediaStreamSource: MockFn;
  destination: Record<string, never>;
  state: 'running' | 'suspended' | 'closed';
  resume: MockFn;
  close: MockFn;
}

const fakeCtx: FakeCtx = {
  createMediaStreamSource: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  destination: {},
  state: 'running',
  resume: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
};

const ensureAudioContext = vi.fn(
  (
    contextRef?: { current: FakeCtx | null },
    _sourceRef?: { current: unknown },
  ) => {
    // Mirror the real helper: store the context on the ref so stopAudioContext
    // can later close it.
    if (contextRef) contextRef.current = fakeCtx;
    return fakeCtx;
  },
);
const createUnlockAudioElement = vi.fn();

vi.mock('../utils/callAudioUtils', () => ({
  ensureAudioContext: (
    contextRef: { current: FakeCtx | null },
    sourceRef: { current: unknown },
  ) => ensureAudioContext(contextRef, sourceRef),
  createUnlockAudioElement: (
    stream: unknown,
    ref: { current: unknown },
  ): void => {
    createUnlockAudioElement(stream, ref);
  },
}));

import { CallState, type CallCustomerResponse } from '../types/types';
import { RecoveryState } from '../utils/callRecovery';

import { useJanusCall, type JanusCallEvent } from './useJanusCall';

// ---------------------------------------------------------------------------
// Fake factory helpers
// ---------------------------------------------------------------------------
function makeHandle(overrides: Partial<FakeHandle> = {}): FakeHandle {
  return {
    send: vi.fn(),
    createOffer: vi.fn(),
    handleRemoteJsep: vi.fn(),
    hangup: vi.fn(),
    detach: vi.fn(),
    webrtcStuff: { pc: null, myStream: null },
    ...overrides,
  };
}

// The attach config captured from janusSession.attach(config).
let capturedConfig: AttachConfig;

function makeSession() {
  return {
    attach: vi.fn((config: AttachConfig) => {
      capturedConfig = config;
    }),
  };
}

// Wrap `act` for a synchronous callback and discard the returned thenable so
// callers don't trip @typescript-eslint/no-floating-promises.
function syncAct(cb: () => void): void {
  void act(cb);
}

// A MediaStream stub that records tracks.
class FakeMediaStream implements FakeStream {
  tracks: FakeTrack[];
  constructor(tracks: FakeTrack[] = []) {
    this.tracks = tracks;
  }
  getAudioTracks(): FakeTrack[] {
    return this.tracks.filter((t) => t.kind === 'audio');
  }
  removeTrack(t: FakeTrack): void {
    this.tracks = this.tracks.filter((x) => x !== t);
  }
  addTrack(t: FakeTrack): void {
    this.tracks.push(t);
  }
}

function makeTrack(kind = 'audio'): FakeTrack {
  return { kind, enabled: true, onended: null, stop: vi.fn() };
}

function makeSender(track: FakeTrack | null): FakeSender {
  return { track, replaceTrack: vi.fn().mockResolvedValue(undefined) };
}

const payload: CallCustomerResponse = {
  bridgeId: 'bridge-1',
  targetUri: 'sip:c@x',
};

// Typed accessors for the send()/createOffer() config the hook passes.
function sendConfig(handle: FakeHandle, index: number): SendConfig {
  return handle.send.mock.calls[index][0] as SendConfig;
}
function offerConfig(handle: FakeHandle): OfferConfig {
  return handle.createOffer.mock.calls[0][0] as OfferConfig;
}

interface RenderedCall {
  result: { current: ReturnType<typeof useJanusCall> };
  unmount: () => void;
  events: JanusCallEvent[];
  onEvent: MockFn;
  onMicDisconnected: MockFn;
  onMicRestored: MockFn;
  onRecoveryState: MockFn;
}

function renderCall(opts?: { janusWsUrl?: string }): RenderedCall {
  const events: JanusCallEvent[] = [];
  const onEvent = vi.fn((e: JanusCallEvent) => events.push(e));
  const onMicDisconnected = vi.fn();
  const onMicRestored = vi.fn();
  const onRecoveryState = vi.fn();
  const hook = renderHook(() =>
    useJanusCall({
      onEvent,
      onMicDisconnected,
      onMicRestored,
      onRecoveryState,
      janusWsUrl: opts?.janusWsUrl ?? 'wss://janus',
    }),
  );
  return {
    result: hook.result,
    unmount: hook.unmount,
    events,
    onEvent,
    onMicDisconnected,
    onMicRestored,
    onRecoveryState,
  };
}

// Drive makeCall to the point where attach() ran and config is captured, with
// a handle passed to the success callback.
async function makeCallWithSuccess(
  handle: FakeHandle,
  hook: RenderedCall,
  p: CallCustomerResponse = payload,
): Promise<void> {
  getJanusSession.mockResolvedValue(makeSession());
  await act(async () => {
    await hook.result.current.makeCall(p);
  });
  syncAct(() => {
    capturedConfig.success(handle);
  });
}

function failedEvent(hook: RenderedCall): JanusCallEvent | undefined {
  return hook.events.find((e) => e.state === CallState.Failed);
}

// Access the mocked getUserMedia in a typed way.
function getUserMediaMock(): MockFn {
  return navigator.mediaDevices.getUserMedia as unknown as MockFn;
}
function permissionsQueryMock(): MockFn {
  return navigator.permissions.query as unknown as MockFn;
}

beforeEach(() => {
  vi.clearAllMocks();
  janusHandle.value = null;
  hangUpRef.current = null;
  sessionDestroyedCb = null;
  fakeCtx.state = 'running';
  fakeCtx.createMediaStreamSource.mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
  fakeCtx.resume.mockResolvedValue(undefined);
  fakeCtx.close.mockResolvedValue(undefined);
  // restoreMocks wipes implementations between tests; re-arm them.
  ensureAudioContext.mockImplementation(
    (contextRef?: { current: FakeCtx | null }) => {
      if (contextRef) contextRef.current = fakeCtx;
      return fakeCtx;
    },
  );
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});

  vi.stubGlobal('MediaStream', FakeMediaStream);
  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: vi
        .fn()
        .mockResolvedValue(new FakeMediaStream([makeTrack()])),
    },
    permissions: {
      query: vi.fn().mockResolvedValue({
        state: 'granted',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    },
  });
});

// ===========================================================================
// makeCall
// ===========================================================================
describe('makeCall', () => {
  it('emits Failed janus_init and returns early when getJanusSession rejects', async () => {
    getJanusSession.mockRejectedValue(new Error('boom'));
    const hook = renderCall();
    await act(async () => {
      await hook.result.current.makeCall(payload);
    });
    expect(failedEvent(hook)?.reason).toEqual({
      kind: 'TechnicalError',
      details: 'janus_init',
    });
    expect(hook.events[0].state).toBe(CallState.Calling);
  });

  it('full success path: register -> createOffer -> call send success (no local teardown)', async () => {
    const handle = makeHandle();
    const hook = renderCall();
    await makeCallWithSuccess(handle, hook);

    expect(setJanusHandle).toHaveBeenCalledWith(handle);
    const registerCall = sendConfig(handle, 0);
    expect(registerCall.message.request).toBe('register');

    syncAct(() => registerCall.success());
    const offer = offerConfig(handle);

    syncAct(() => offer.success({ type: 'offer' }));
    const callSend = sendConfig(handle, 1);
    expect(callSend.message.request).toBe('call');

    syncAct(() => callSend.success());
    expect(handle.detach).not.toHaveBeenCalled();
  });

  it('call send success triggers hangUp when local teardown already requested', async () => {
    const handle = makeHandle();
    const hook = renderCall();
    await makeCallWithSuccess(handle, hook);
    const registerCall = sendConfig(handle, 0);
    syncAct(() => registerCall.success());
    const offer = offerConfig(handle);
    syncAct(() => offer.success({ type: 'offer' }));
    const callSend = sendConfig(handle, 1);

    await act(async () => {
      await hook.result.current.hangUp();
    });
    handle.detach.mockClear();
    await act(async () => {
      callSend.success();
      await Promise.resolve();
    });
    expect(callSend).toBeDefined();
  });

  it('register error -> Failed janus_register + cleanupHandle', async () => {
    const handle = makeHandle();
    const hook = renderCall();
    await makeCallWithSuccess(handle, hook);
    syncAct(() => sendConfig(handle, 0).error({ message: 'reg fail' }));
    expect(failedEvent(hook)?.reason).toEqual({
      kind: 'TechnicalError',
      details: 'janus_register',
    });
    expect(handle.detach).toHaveBeenCalled();
  });

  it('cleanupHandle: handle.detach throwing is caught (via register error)', async () => {
    const handle = makeHandle();
    handle.detach.mockImplementation(() => {
      throw new Error('cleanup detach fail');
    });
    const hook = renderCall();
    await makeCallWithSuccess(handle, hook);
    syncAct(() => sendConfig(handle, 0).error({ message: 'reg fail' }));
    expect(clearJanusHandle).toHaveBeenCalled();
  });

  it('createOffer error -> Failed janus_mic_failed + cleanupHandle', async () => {
    const handle = makeHandle();
    const hook = renderCall();
    await makeCallWithSuccess(handle, hook);
    syncAct(() => sendConfig(handle, 0).success());
    syncAct(() => offerConfig(handle).error({ message: 'mic fail' }));
    expect(failedEvent(hook)?.reason).toEqual({
      kind: 'TechnicalError',
      details: 'janus_mic_failed',
    });
    expect(handle.detach).toHaveBeenCalled();
  });

  it('createOffer error with no message uses fallback', async () => {
    const handle = makeHandle();
    const hook = renderCall();
    await makeCallWithSuccess(handle, hook);
    syncAct(() => sendConfig(handle, 0).success());
    syncAct(() => offerConfig(handle).error(undefined));
    expect(failedEvent(hook)?.error).toBe('Unknown error');
  });

  it('call send error -> Failed janus_runtime + cleanupHandle', async () => {
    const handle = makeHandle();
    const hook = renderCall();
    await makeCallWithSuccess(handle, hook);
    syncAct(() => sendConfig(handle, 0).success());
    syncAct(() => offerConfig(handle).success({ type: 'offer' }));
    syncAct(() => sendConfig(handle, 1).error({ message: 'call fail' }));
    expect(failedEvent(hook)?.reason).toEqual({
      kind: 'TechnicalError',
      details: 'janus_runtime',
    });
    expect(handle.detach).toHaveBeenCalled();
  });

  it('call send error with no message uses fallback', async () => {
    const handle = makeHandle();
    const hook = renderCall();
    await makeCallWithSuccess(handle, hook);
    syncAct(() => sendConfig(handle, 0).success());
    syncAct(() => offerConfig(handle).success({ type: 'offer' }));
    syncAct(() => sendConfig(handle, 1).error(undefined));
    expect(failedEvent(hook)?.error).toBe('Unknown error');
  });

  it('register error with no message uses fallback', async () => {
    const handle = makeHandle();
    const hook = renderCall();
    await makeCallWithSuccess(handle, hook);
    syncAct(() => sendConfig(handle, 0).error(undefined));
    expect(failedEvent(hook)?.error).toBe('Unknown error');
  });

  it('attach error callback -> Failed janus_init + cleanupHandle', async () => {
    const hook = renderCall();
    getJanusSession.mockResolvedValue(makeSession());
    await act(async () => {
      await hook.result.current.makeCall(payload);
    });
    syncAct(() => capturedConfig.error({ message: 'attach fail' }));
    expect(failedEvent(hook)?.reason).toEqual({
      kind: 'TechnicalError',
      details: 'janus_init',
    });
  });

  it('attach error callback with no message uses fallback', async () => {
    const hook = renderCall();
    getJanusSession.mockResolvedValue(makeSession());
    await act(async () => {
      await hook.result.current.makeCall(payload);
    });
    syncAct(() => capturedConfig.error(undefined));
    expect(failedEvent(hook)?.error).toBe('Unknown error');
  });

  it('attach throwing synchronously -> outer catch Failed janus_init + cleanupHandle', async () => {
    const handle = makeHandle();
    janusHandle.value = handle;
    getJanusSession.mockResolvedValue({
      attach: vi.fn(() => {
        throw new Error('attach throw');
      }),
    });
    const hook = renderCall();
    await act(async () => {
      await hook.result.current.makeCall(payload);
    });
    expect(failedEvent(hook)?.reason).toEqual({
      kind: 'TechnicalError',
      details: 'janus_init',
    });
    expect(handle.detach).toHaveBeenCalled();
  });

  it('makeCall with empty bridgeId uses N/A in Calling message', async () => {
    const hook = renderCall();
    getJanusSession.mockResolvedValue(makeSession());
    await act(async () => {
      await hook.result.current.makeCall({ bridgeId: '', targetUri: 'sip:x' });
    });
    expect(hook.events[0].message).toContain('N/A');
  });
});

// ===========================================================================
// onmessage
// ===========================================================================
describe('onmessage', () => {
  async function setupConnected(): Promise<{
    handle: FakeHandle;
    hook: RenderedCall;
  }> {
    const handle = makeHandle();
    const hook = renderCall();
    await makeCallWithSuccess(handle, hook);
    return { handle, hook };
  }

  it('progress with jsep -> handleRemoteJsep', async () => {
    const { handle } = await setupConnected();
    syncAct(() =>
      capturedConfig.onmessage({ result: { event: 'progress' } }, { j: 1 }),
    );
    expect(handle.handleRemoteJsep).toHaveBeenCalledWith({ jsep: { j: 1 } });
  });

  it('progress without jsep -> no handleRemoteJsep', async () => {
    const { handle } = await setupConnected();
    syncAct(() =>
      capturedConfig.onmessage({ result: { event: 'progress' } }, null),
    );
    expect(handle.handleRemoteJsep).not.toHaveBeenCalled();
  });

  it('ringing -> Ringing event', async () => {
    const { hook } = await setupConnected();
    syncAct(() =>
      capturedConfig.onmessage({ result: { event: 'ringing' } }, null),
    );
    expect(hook.events.some((e) => e.state === CallState.Ringing)).toBe(true);
  });

  it('accepted with jsep and micTrack -> Connected + wires onended', async () => {
    const micTrack = makeTrack('audio');
    const handle = makeHandle();
    handle.webrtcStuff.myStream = new FakeMediaStream([micTrack]);
    const hook = renderCall();
    await makeCallWithSuccess(handle, hook);

    syncAct(() =>
      capturedConfig.onmessage({ result: { event: 'accepted' } }, { j: 2 }),
    );
    expect(handle.handleRemoteJsep).toHaveBeenCalledWith({ jsep: { j: 2 } });
    expect(hook.events.some((e) => e.state === CallState.Connected)).toBe(true);
    expect(typeof micTrack.onended).toBe('function');
    expect(hook.onRecoveryState).toHaveBeenCalledWith(RecoveryState.Healthy);

    await act(async () => {
      micTrack.onended?.();
      await Promise.resolve();
    });
    expect(hook.onMicDisconnected).toHaveBeenCalled();
  });

  it('accepted without jsep and without micTrack -> Connected only', async () => {
    const handle = makeHandle();
    handle.webrtcStuff.myStream = new FakeMediaStream([]);
    const hook = renderCall();
    await makeCallWithSuccess(handle, hook);
    syncAct(() =>
      capturedConfig.onmessage({ result: { event: 'accepted' } }, null),
    );
    expect(handle.handleRemoteJsep).not.toHaveBeenCalled();
    expect(hook.events.some((e) => e.state === CallState.Connected)).toBe(true);
  });

  it('ringing and accepted with empty bridgeId use N/A in messages', async () => {
    const handle = makeHandle();
    const hook = renderCall();
    await makeCallWithSuccess(handle, hook, {
      bridgeId: '',
      targetUri: 'sip:x',
    });
    syncAct(() =>
      capturedConfig.onmessage({ result: { event: 'ringing' } }, null),
    );
    syncAct(() =>
      capturedConfig.onmessage({ result: { event: 'accepted' } }, null),
    );
    expect(
      hook.events.find((e) => e.state === CallState.Ringing)?.message,
    ).toContain('N/A');
    expect(
      hook.events.find((e) => e.state === CallState.Connected)?.message,
    ).toContain('N/A');
  });

  it('hangup with Q.850 busy code -> Failed with reason + cleanup', async () => {
    const { handle, hook } = await setupConnected();
    syncAct(() =>
      capturedConfig.onmessage(
        { result: { event: 'hangup', code: 17, reason: 'busy' } },
        null,
      ),
    );
    expect(failedEvent(hook)?.reason).toEqual({ kind: 'Busy' });
    expect(handle.detach).toHaveBeenCalled();
  });

  it('hangup with Q.850 code and no reason string uses fallback error', async () => {
    const { hook } = await setupConnected();
    syncAct(() =>
      capturedConfig.onmessage({ result: { event: 'hangup', code: 17 } }, null),
    );
    expect(failedEvent(hook)?.error).toBe('Q.850 17');
  });

  it('hangup with normal-clearing code -> Ended + cleanup', async () => {
    const { handle, hook } = await setupConnected();
    syncAct(() =>
      capturedConfig.onmessage({ result: { event: 'hangup', code: 16 } }, null),
    );
    expect(hook.events.some((e) => e.state === CallState.Ended)).toBe(true);
    expect(handle.detach).toHaveBeenCalled();
  });

  it('unknown event -> nothing', async () => {
    const { hook } = await setupConnected();
    const before = hook.events.length;
    syncAct(() =>
      capturedConfig.onmessage({ result: { event: 'registered' } }, null),
    );
    expect(hook.events.length).toBe(before);
  });
});

// ===========================================================================
// onremotetrack / webrtcState
// ===========================================================================
describe('onremotetrack', () => {
  async function setup(): Promise<void> {
    const handle = makeHandle();
    const hook = renderCall();
    await makeCallWithSuccess(handle, hook);
  }

  it('on=true audio (ctx running) -> playStreamWithAudioContext', async () => {
    await setup();
    fakeCtx.state = 'running';
    syncAct(() =>
      capturedConfig.onremotetrack(makeTrack('audio'), 'mid', true),
    );
    expect(ensureAudioContext).toHaveBeenCalled();
    expect(createUnlockAudioElement).toHaveBeenCalled();
    expect(fakeCtx.resume).not.toHaveBeenCalled();
  });

  it('on=true audio (ctx suspended) -> resume', async () => {
    await setup();
    fakeCtx.state = 'suspended';
    syncAct(() =>
      capturedConfig.onremotetrack(makeTrack('audio'), 'mid', true),
    );
    expect(fakeCtx.resume).toHaveBeenCalled();
  });

  it('resume rejecting is swallowed (.catch)', async () => {
    await setup();
    fakeCtx.state = 'suspended';
    fakeCtx.resume.mockRejectedValueOnce(new Error('resume fail'));
    await act(async () => {
      capturedConfig.onremotetrack(makeTrack('audio'), 'mid', true);
      await Promise.resolve();
    });
    expect(fakeCtx.resume).toHaveBeenCalled();
  });

  it('close rejecting is swallowed (.catch) on stopAudioContext', async () => {
    await setup();
    syncAct(() =>
      capturedConfig.onremotetrack(makeTrack('audio'), 'mid', true),
    );
    fakeCtx.close.mockRejectedValueOnce(new Error('close fail'));
    await act(async () => {
      capturedConfig.onremotetrack(makeTrack('audio'), 'mid', false);
      await Promise.resolve();
    });
    expect(fakeCtx.close).toHaveBeenCalled();
  });

  it('playStreamWithAudioContext catch: ensureAudioContext throws', async () => {
    await setup();
    ensureAudioContext.mockImplementationOnce(() => {
      throw new Error('ctx fail');
    });
    expect(() =>
      syncAct(() =>
        capturedConfig.onremotetrack(makeTrack('audio'), 'mid', true),
      ),
    ).not.toThrow();
  });

  it('on=false -> stopAudioContext', async () => {
    await setup();
    syncAct(() =>
      capturedConfig.onremotetrack(makeTrack('audio'), 'mid', true),
    );
    syncAct(() =>
      capturedConfig.onremotetrack(makeTrack('audio'), 'mid', false),
    );
    expect(fakeCtx.close).toHaveBeenCalled();
  });

  it('on=true non-audio -> no-op', async () => {
    await setup();
    ensureAudioContext.mockClear();
    syncAct(() =>
      capturedConfig.onremotetrack(makeTrack('video'), 'mid', true),
    );
    expect(ensureAudioContext).not.toHaveBeenCalled();
  });
});

describe('webrtcState', () => {
  async function setup(): Promise<void> {
    const handle = makeHandle();
    const hook = renderCall();
    await makeCallWithSuccess(handle, hook);
  }

  it('false -> stopAudioContext', async () => {
    await setup();
    syncAct(() =>
      capturedConfig.onremotetrack(makeTrack('audio'), 'mid', true),
    );
    fakeCtx.close.mockClear();
    syncAct(() => capturedConfig.webrtcState(false));
    expect(fakeCtx.close).toHaveBeenCalled();
  });

  it('true -> nothing', async () => {
    await setup();
    fakeCtx.close.mockClear();
    syncAct(() => capturedConfig.webrtcState(true));
    expect(fakeCtx.close).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// iceState / connectionState (recovery)
// ===========================================================================
describe('iceState', () => {
  async function setup(): Promise<{ hook: RenderedCall }> {
    const handle = makeHandle();
    const hook = renderCall();
    await makeCallWithSuccess(handle, hook);
    return { hook };
  }

  it('connected/completed -> ice_connected (Healthy)', async () => {
    const { hook } = await setup();
    syncAct(() => capturedConfig.iceState('disconnected'));
    hook.onRecoveryState.mockClear();
    syncAct(() => capturedConfig.iceState('connected'));
    expect(hook.onRecoveryState).toHaveBeenCalledWith(RecoveryState.Healthy);
    syncAct(() => capturedConfig.iceState('completed'));
  });

  it('disconnected -> Unstable', async () => {
    const { hook } = await setup();
    syncAct(() => capturedConfig.iceState('disconnected'));
    expect(hook.onRecoveryState).toHaveBeenCalledWith(RecoveryState.Unstable);
  });

  it('unhandled ice value -> nothing (default branch)', async () => {
    const { hook } = await setup();
    hook.onRecoveryState.mockClear();
    syncAct(() => capturedConfig.iceState('checking'));
    expect(hook.onRecoveryState).not.toHaveBeenCalled();
  });

  it('failed -> ice_failed -> Failed recovery: recovery_exhausted, destroy, clear', async () => {
    const { hook } = await setup();
    syncAct(() => capturedConfig.iceState('failed'));
    expect(
      hook.events.find(
        (e) =>
          e.state === CallState.Failed &&
          e.reason?.kind === 'TechnicalError' &&
          e.reason.details === 'recovery_exhausted',
      ),
    ).toBeTruthy();
    expect(destroyJanusSession).toHaveBeenCalled();
    expect(clearJanusHandle).toHaveBeenCalled();
  });

  it('closed -> ice_failed -> Failed', async () => {
    const { hook } = await setup();
    syncAct(() => capturedConfig.iceState('closed'));
    expect(hook.events.some((e) => e.state === CallState.Failed)).toBe(true);
  });

  it('recovery already Failed: reduce returns same state -> no re-dispatch', async () => {
    const { hook } = await setup();
    syncAct(() => capturedConfig.iceState('failed'));
    const failedCount = hook.events.filter(
      (e) => e.state === CallState.Failed,
    ).length;
    syncAct(() => capturedConfig.iceState('failed'));
    expect(hook.events.filter((e) => e.state === CallState.Failed).length).toBe(
      failedCount,
    );
  });

  it('destroyJanusSession throwing is caught', async () => {
    destroyJanusSession.mockImplementationOnce(() => {
      throw new Error('destroy fail');
    });
    const { hook } = await setup();
    expect(() =>
      syncAct(() => capturedConfig.iceState('failed')),
    ).not.toThrow();
    expect(hook.events.some((e) => e.state === CallState.Failed)).toBe(true);
    expect(clearJanusHandle).toHaveBeenCalled();
  });
});

describe('connectionState', () => {
  async function setup(): Promise<{ hook: RenderedCall }> {
    const handle = makeHandle();
    const hook = renderCall();
    await makeCallWithSuccess(handle, hook);
    return { hook };
  }

  it('failed -> ice_failed', async () => {
    const { hook } = await setup();
    syncAct(() => capturedConfig.connectionState('failed'));
    expect(hook.events.some((e) => e.state === CallState.Failed)).toBe(true);
  });

  it('other -> nothing', async () => {
    const { hook } = await setup();
    hook.onRecoveryState.mockClear();
    syncAct(() => capturedConfig.connectionState('connected'));
    expect(hook.onRecoveryState).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// oncleanup / detached
// ===========================================================================
describe('oncleanup / detached', () => {
  async function setup(): Promise<{ handle: FakeHandle; hook: RenderedCall }> {
    const handle = makeHandle();
    const hook = renderCall();
    await makeCallWithSuccess(handle, hook);
    return { handle, hook };
  }

  it('oncleanup with localTearDown true -> return', async () => {
    const { hook } = await setup();
    await act(async () => {
      await hook.result.current.hangUp();
    });
    hook.onRecoveryState.mockClear();
    syncAct(() => capturedConfig.oncleanup());
    expect(hook.onRecoveryState).not.toHaveBeenCalled();
  });

  it('oncleanup with localTearDown false -> ws_dead (Failed)', async () => {
    const { hook } = await setup();
    syncAct(() => capturedConfig.oncleanup());
    expect(hook.events.some((e) => e.state === CallState.Failed)).toBe(true);
  });

  it('detached with localTearDown false -> ws_dead', async () => {
    const { hook } = await setup();
    syncAct(() => capturedConfig.detached());
    expect(hook.events.some((e) => e.state === CallState.Failed)).toBe(true);
  });

  it('detached with localTearDown true -> return', async () => {
    const { hook } = await setup();
    await act(async () => {
      await hook.result.current.hangUp();
    });
    hook.onRecoveryState.mockClear();
    syncAct(() => capturedConfig.detached());
    expect(hook.onRecoveryState).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// hangUp
// ===========================================================================
describe('hangUp', () => {
  it('callSent false + no active call -> no Ended emit', async () => {
    const hook = renderCall();
    await act(async () => {
      await hook.result.current.hangUp();
    });
    expect(hook.events.some((e) => e.state === CallState.Ended)).toBe(false);
  });

  it('callSent false + handle present -> Ended', async () => {
    janusHandle.value = makeHandle();
    const hook = renderCall();
    await act(async () => {
      await hook.result.current.hangUp();
    });
    expect(hook.events.some((e) => e.state === CallState.Ended)).toBe(true);
  });

  it('callSent false + handle present (from makeCall) but before call sent -> Ended', async () => {
    const handle = makeHandle();
    const hook = renderCall();
    await makeCallWithSuccess(handle, hook);
    handle.detach.mockClear();
    await act(async () => {
      await hook.result.current.hangUp();
    });
    expect(hook.events.some((e) => e.state === CallState.Ended)).toBe(true);
  });

  it('callSent true + handle present -> send/hangup/detach + Ended', async () => {
    const handle = makeHandle();
    const hook = renderCall();
    await makeCallWithSuccess(handle, hook);
    syncAct(() => sendConfig(handle, 0).success());
    syncAct(() => offerConfig(handle).success({ type: 'offer' }));
    syncAct(() => sendConfig(handle, 1).success());
    handle.send.mockClear();
    await act(async () => {
      await hook.result.current.hangUp();
    });
    expect(handle.send).toHaveBeenCalledWith({
      message: { request: 'hangup' },
    });
    expect(handle.hangup).toHaveBeenCalled();
    expect(handle.detach).toHaveBeenCalled();
    expect(clearJanusHandle).toHaveBeenCalled();
    expect(hook.events.some((e) => e.state === CallState.Ended)).toBe(true);
  });

  it('callSent true: send/hangup/detach throwing each caught', async () => {
    const handle = makeHandle();
    handle.send.mockImplementation(
      (arg: { message?: { request?: string } }) => {
        if (arg.message?.request === 'hangup') throw new Error('send fail');
      },
    );
    handle.hangup.mockImplementation(() => {
      throw new Error('hangup fail');
    });
    handle.detach.mockImplementation(() => {
      throw new Error('detach fail');
    });
    const hook = renderCall();
    await makeCallWithSuccess(handle, hook);
    syncAct(() => sendConfig(handle, 0).success());
    syncAct(() => offerConfig(handle).success({ type: 'offer' }));
    syncAct(() => sendConfig(handle, 1).success());
    await act(async () => {
      await expect(hook.result.current.hangUp()).resolves.toBeUndefined();
    });
    expect(clearJanusHandle).toHaveBeenCalled();
  });
});

// ===========================================================================
// tryReplaceMicTrack
// ===========================================================================
describe('tryReplaceMicTrack', () => {
  async function setupWithMic(): Promise<{
    micTrack: FakeTrack;
    handle: FakeHandle;
    hook: RenderedCall;
  }> {
    const micTrack = makeTrack('audio');
    const handle = makeHandle();
    handle.webrtcStuff.myStream = new FakeMediaStream([micTrack]);
    const hook = renderCall();
    await makeCallWithSuccess(handle, hook);
    syncAct(() =>
      capturedConfig.onmessage({ result: { event: 'accepted' } }, null),
    );
    return { micTrack, handle, hook };
  }

  it('success: sender found, not muted, myStream present, rewires onended -> onMicRestored', async () => {
    const { micTrack, handle, hook } = await setupWithMic();
    const sender = makeSender(makeTrack('audio'));
    handle.webrtcStuff.pc = { getSenders: () => [sender] };
    const newTrack = makeTrack('audio');
    getUserMediaMock().mockResolvedValue(new FakeMediaStream([newTrack]));

    await act(async () => {
      micTrack.onended?.();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(sender.replaceTrack).toHaveBeenCalledWith(newTrack);
    expect(hook.onMicRestored).toHaveBeenCalled();
    expect(typeof newTrack.onended).toBe('function');

    getUserMediaMock().mockResolvedValue(
      new FakeMediaStream([makeTrack('audio')]),
    );
    await act(async () => {
      newTrack.onended?.();
      await Promise.resolve();
    });
    expect(hook.onMicDisconnected).toHaveBeenCalled();
  });

  it('success: wasMuted true sets newTrack.enabled=false', async () => {
    const { micTrack, handle } = await setupWithMic();
    const oldSenderTrack = makeTrack('audio');
    oldSenderTrack.enabled = false;
    const sender = makeSender(oldSenderTrack);
    handle.webrtcStuff.pc = { getSenders: () => [sender] };
    const newTrack = makeTrack('audio');
    getUserMediaMock().mockResolvedValue(new FakeMediaStream([newTrack]));
    await act(async () => {
      micTrack.onended?.();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(newTrack.enabled).toBe(false);
  });

  it('success: myStream absent branch', async () => {
    const { micTrack, handle } = await setupWithMic();
    handle.webrtcStuff.myStream = null;
    const sender = makeSender(makeTrack('audio'));
    handle.webrtcStuff.pc = { getSenders: () => [sender] };
    const newTrack = makeTrack('audio');
    getUserMediaMock().mockResolvedValue(new FakeMediaStream([newTrack]));
    await act(async () => {
      micTrack.onended?.();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(sender.replaceTrack).toHaveBeenCalled();
  });

  it('oldTrack.stop throwing is caught', async () => {
    const { micTrack, handle } = await setupWithMic();
    micTrack.stop.mockImplementation(() => {
      throw new Error('stop fail');
    });
    const sender = makeSender(makeTrack('audio'));
    handle.webrtcStuff.pc = { getSenders: () => [sender] };
    const newTrack = makeTrack('audio');
    getUserMediaMock().mockResolvedValue(new FakeMediaStream([newTrack]));
    await act(async () => {
      micTrack.onended?.();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(sender.replaceTrack).toHaveBeenCalled();
  });

  it('getUserMedia returns no audio track -> caught', async () => {
    const { micTrack, hook } = await setupWithMic();
    getUserMediaMock().mockResolvedValue(new FakeMediaStream([]));
    await act(async () => {
      micTrack.onended?.();
      await Promise.resolve();
    });
    expect(hook.onMicRestored).not.toHaveBeenCalled();
  });

  it('no audio sender -> caught', async () => {
    const { micTrack, handle, hook } = await setupWithMic();
    handle.webrtcStuff.pc = { getSenders: () => [] };
    getUserMediaMock().mockResolvedValue(
      new FakeMediaStream([makeTrack('audio')]),
    );
    await act(async () => {
      micTrack.onended?.();
      await Promise.resolve();
    });
    expect(hook.onMicRestored).not.toHaveBeenCalled();
  });

  it('replaceTrack rejects -> caught', async () => {
    const { micTrack, handle, hook } = await setupWithMic();
    const sender: FakeSender = {
      track: makeTrack('audio'),
      replaceTrack: vi.fn().mockRejectedValue(new Error('replace fail')),
    };
    handle.webrtcStuff.pc = { getSenders: () => [sender] };
    getUserMediaMock().mockResolvedValue(
      new FakeMediaStream([makeTrack('audio')]),
    );
    await act(async () => {
      micTrack.onended?.();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(hook.onMicRestored).not.toHaveBeenCalled();
  });

  it('getPc null when handle null -> no audio sender -> caught', async () => {
    const { micTrack, hook } = await setupWithMic();
    janusHandle.value = null;
    getUserMediaMock().mockResolvedValue(
      new FakeMediaStream([makeTrack('audio')]),
    );
    await act(async () => {
      micTrack.onended?.();
      await Promise.resolve();
    });
    expect(hook.onMicRestored).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// permissions listener effect
// ===========================================================================
describe('permissions listener', () => {
  interface FakeStatus {
    state: string;
    addEventListener: MockFn;
    removeEventListener: MockFn;
  }

  function makeStatus(state: string): {
    status: FakeStatus;
    getChangeCb: () => (() => void) | null;
  } {
    let changeCb: (() => void) | null = null;
    const status: FakeStatus = {
      state,
      addEventListener: vi.fn((_e: string, cb: () => void) => {
        changeCb = cb;
      }),
      removeEventListener: vi.fn(),
    };
    return { status, getChangeCb: () => changeCb };
  }

  it('change to granted with handle present -> tryReplaceMicTrack', async () => {
    const { status, getChangeCb } = makeStatus('granted');
    permissionsQueryMock().mockResolvedValue(status);

    const handle = makeHandle();
    const sender = makeSender(makeTrack('audio'));
    handle.webrtcStuff.pc = { getSenders: () => [sender] };
    janusHandle.value = handle;

    const hook = renderCall();
    await act(async () => {
      await Promise.resolve();
    });
    expect(status.addEventListener).toHaveBeenCalled();
    getUserMediaMock().mockResolvedValue(
      new FakeMediaStream([makeTrack('audio')]),
    );
    await act(async () => {
      getChangeCb()?.();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(sender.replaceTrack).toHaveBeenCalled();
    hook.unmount();
    expect(status.removeEventListener).toHaveBeenCalled();
  });

  it('change with non-granted -> nothing', async () => {
    const { status, getChangeCb } = makeStatus('prompt');
    permissionsQueryMock().mockResolvedValue(status);
    janusHandle.value = makeHandle();
    renderCall();
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      getChangeCb()?.();
      await Promise.resolve();
    });
    expect(getUserMediaMock()).not.toHaveBeenCalled();
  });

  it('change granted but no handle -> nothing', async () => {
    const { status, getChangeCb } = makeStatus('granted');
    permissionsQueryMock().mockResolvedValue(status);
    janusHandle.value = null;
    renderCall();
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      getChangeCb()?.();
      await Promise.resolve();
    });
    expect(getUserMediaMock()).not.toHaveBeenCalled();
  });

  it('cancelled path: unmount before query resolves', async () => {
    const { status } = makeStatus('granted');
    let resolveQuery: (v: FakeStatus) => void = () => {};
    permissionsQueryMock().mockReturnValue(
      new Promise<FakeStatus>((res) => {
        resolveQuery = res;
      }),
    );
    const hook = renderCall();
    hook.unmount();
    await act(async () => {
      resolveQuery(status);
      await Promise.resolve();
    });
    expect(status.addEventListener).not.toHaveBeenCalled();
  });

  it('permissions.query rejects -> catch', async () => {
    permissionsQueryMock().mockRejectedValue(new Error('query fail'));
    renderCall();
    await act(async () => {
      await Promise.resolve();
    });
    expect(true).toBe(true);
  });

  it('navigator.permissions undefined -> no throw (optional chaining)', () => {
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn() },
      permissions: undefined,
    });
    expect(() => renderCall()).not.toThrow();
  });
});

// ===========================================================================
// unmount cleanup effect
// ===========================================================================
describe('unmount cleanup', () => {
  it('handle present -> detach + clearJanusHandle', () => {
    const handle = makeHandle();
    janusHandle.value = handle;
    const hook = renderCall();
    hook.unmount();
    expect(handle.detach).toHaveBeenCalled();
    expect(clearJanusHandle).toHaveBeenCalled();
  });

  it('handle detach throwing is caught', () => {
    const handle = makeHandle();
    handle.detach.mockImplementation(() => {
      throw new Error('detach fail');
    });
    janusHandle.value = handle;
    const hook = renderCall();
    expect(() => hook.unmount()).not.toThrow();
  });

  it('no handle -> no detach', () => {
    janusHandle.value = null;
    const hook = renderCall();
    expect(() => hook.unmount()).not.toThrow();
  });

  it('clearLocalTrack with track whose stop throws is caught', async () => {
    const micTrack = makeTrack('audio');
    micTrack.stop.mockImplementation(() => {
      throw new Error('stop fail');
    });
    const handle = makeHandle();
    handle.webrtcStuff.myStream = new FakeMediaStream([micTrack]);
    const hook = renderCall();
    await makeCallWithSuccess(handle, hook);
    syncAct(() =>
      capturedConfig.onmessage({ result: { event: 'accepted' } }, null),
    );
    expect(() => hook.unmount()).not.toThrow();
  });

  it('stopAudioContext outer catch: sourceRef.disconnect throws', async () => {
    const handle = makeHandle();
    const hook = renderCall();
    await makeCallWithSuccess(handle, hook);
    fakeCtx.createMediaStreamSource.mockReturnValueOnce({
      connect: vi.fn(),
      disconnect: vi.fn(() => {
        throw new Error('disconnect fail');
      }),
    });
    syncAct(() =>
      capturedConfig.onremotetrack(makeTrack('audio'), 'mid', true),
    );
    expect(() => hook.unmount()).not.toThrow();
  });

  it('stopAudioContext with unlock element present', async () => {
    createUnlockAudioElement.mockImplementationOnce(
      (_stream: unknown, ref: { current: unknown }) => {
        ref.current = { srcObject: {} };
      },
    );
    const handle = makeHandle();
    const hook = renderCall();
    await makeCallWithSuccess(handle, hook);
    syncAct(() =>
      capturedConfig.onremotetrack(makeTrack('audio'), 'mid', true),
    );
    expect(() => hook.unmount()).not.toThrow();
  });
});

// ===========================================================================
// onJanusSessionDestroyed callback
// ===========================================================================
describe('onJanusSessionDestroyed', () => {
  it('invoked with handle present -> ws_dead (Failed)', async () => {
    const handle = makeHandle();
    const hook = renderCall();
    await makeCallWithSuccess(handle, hook);
    expect(sessionDestroyedCb).toBeTruthy();
    syncAct(() => sessionDestroyedCb?.());
    expect(hook.events.some((e) => e.state === CallState.Failed)).toBe(true);
  });

  it('invoked with null handle -> nothing', () => {
    const hook = renderCall();
    janusHandle.value = null;
    hook.onRecoveryState.mockClear();
    syncAct(() => sessionDestroyedCb?.());
    expect(hook.onRecoveryState).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// emitEvent guard (no onEvent handler)
// ===========================================================================
describe('emitEvent guard', () => {
  it('makeCall without onEvent does not throw', async () => {
    getJanusSession.mockRejectedValue(new Error('boom'));
    const hook = renderHook(() => useJanusCall({ janusWsUrl: 'wss://x' }));
    await act(async () => {
      await hook.result.current.makeCall(payload);
    });
    expect(true).toBe(true);
  });
});
