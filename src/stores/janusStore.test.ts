import { resetWidgetState } from '../test/resetWidgetState';

/**
 * Isolation strategy
 * ------------------
 * `getJanusSession` relies on module-level closures (`initPromise`,
 * `janusLibInitialized`) and a module-level `janusState` deepSignal. To get a
 * clean single-flight state per test we `vi.resetModules()` in `beforeEach`
 * and dynamically `import('./janusStore')` fresh inside each test. `vi.mock`
 * factories are hoisted and stay registered across `resetModules`, so the
 * fake `janus-gateway`/`webrtc-adapter` continue to apply to every re-import.
 *
 * The mock captures every constructor config in `janusConfigs` so a test can
 * later fire the post-init `error`/`destroyed` callbacks. Constructor
 * behaviour (success vs error on construction) is controlled via
 * `janusMockControls`.
 */

// --- janus-gateway mock -----------------------------------------------------

type JanusConfig = {
  server: string;
  success: () => void;
  error: (e: unknown) => void;
  destroyed: () => void;
};

const janusMockState = vi.hoisted(() => {
  return {
    // Every config object passed to `new Janus(config)`, in order.
    configs: [] as JanusConfig[],
    // How many times the constructor was invoked.
    constructCount: 0,
    // How many times Janus.init was invoked.
    initCount: 0,
    // 'success' -> invoke config.success synchronously on construction.
    // 'error'   -> invoke config.error synchronously on construction.
    // 'manual'  -> do nothing; the test drives callbacks by hand.
    behavior: 'success' as 'success' | 'error' | 'manual',
    // Error payload used when behavior === 'error'.
    constructError: { message: 'construct boom' } as unknown,
    // If true, Janus.init never calls its callback (lib never initializes).
    stallInit: false,
    // If true, Janus.init throws synchronously so ensureJanusLib rejects.
    initThrows: false,
  };
});

vi.mock('janus-gateway', () => {
  function Janus(this: unknown, config: JanusConfig) {
    janusMockState.constructCount += 1;
    janusMockState.configs.push(config);
    // The real gateway invokes these asynchronously. The store's `success`
    // handler references the `const session = new Janus(...)` binding, which
    // is still in its TDZ during synchronous construction, so we must defer.
    if (janusMockState.behavior === 'success') {
      queueMicrotask(() => config.success());
    } else if (janusMockState.behavior === 'error') {
      queueMicrotask(() => config.error(janusMockState.constructError));
    }
    // 'manual': test triggers callbacks explicitly.
  }
  (Janus as unknown as { init: (c: { callback: () => void }) => void }).init = (
    c,
  ) => {
    janusMockState.initCount += 1;
    if (janusMockState.initThrows) throw new Error('init boom');
    if (!janusMockState.stallInit) c.callback();
  };
  (
    Janus as unknown as { useDefaultDependencies: () => object }
  ).useDefaultDependencies = () => ({});
  return { default: Janus };
});

vi.mock('webrtc-adapter', () => ({ default: {} }));

// Import types only for annotations; runtime store is imported dynamically.
type StoreModule = typeof import('./janusStore');

async function loadStore(): Promise<StoreModule> {
  return import('./janusStore');
}

const SERVER = 'wss://janus.test';

beforeEach(() => {
  vi.resetModules();
  resetWidgetState();
  janusMockState.configs = [];
  janusMockState.constructCount = 0;
  janusMockState.initCount = 0;
  janusMockState.behavior = 'success';
  janusMockState.constructError = { message: 'construct boom' };
  janusMockState.stallInit = false;
  janusMockState.initThrows = false;
  vi.clearAllMocks();
});

describe('getJanusSession', () => {
  it('resolves with the session and moves status to ready on success', async () => {
    const { getJanusSession, janusState } = await loadStore();

    const session = await getJanusSession(SERVER);

    expect(janusState.status).toBe('ready');
    expect(janusState.session).toBe(session);
    expect(janusState.error).toBeNull();
    expect(janusMockState.constructCount).toBe(1);
  });

  it('shares one initPromise across concurrent callers (constructs once)', async () => {
    const { getJanusSession } = await loadStore();
    // Defer resolution so both calls happen before construction completes.
    janusMockState.behavior = 'manual';

    const p1 = getJanusSession(SERVER);
    const p2 = getJanusSession(SERVER);

    // ensureJanusLib + construction are async; flush microtasks so the
    // constructor runs and captures its config.
    await Promise.resolve();
    await Promise.resolve();

    expect(janusMockState.constructCount).toBe(1);

    // Fire success once; both promises should resolve to the same session.
    janusMockState.configs[0].success();
    const [s1, s2] = await Promise.all([p1, p2]);
    expect(s1).toBe(s2);
  });

  it('returns the existing session immediately without constructing again', async () => {
    const { getJanusSession } = await loadStore();

    const first = await getJanusSession(SERVER);
    expect(janusMockState.constructCount).toBe(1);

    const second = await getJanusSession(SERVER);
    expect(second).toBe(first);
    // No new construction.
    expect(janusMockState.constructCount).toBe(1);
  });

  it('rejects and clears initPromise on error before ready (allows retry)', async () => {
    const { getJanusSession, janusState } = await loadStore();
    janusMockState.behavior = 'error';
    janusMockState.constructError = { message: 'early failure' };

    await expect(getJanusSession(SERVER)).rejects.toThrow('early failure');
    expect(janusState.status).toBe('error');
    expect(janusState.session).toBeNull();
    expect(janusState.error).toBe('early failure');

    // initPromise was cleared -> a subsequent call constructs again.
    janusMockState.behavior = 'success';
    const session = await getJanusSession(SERVER);
    expect(session).toBeTruthy();
    expect(janusMockState.constructCount).toBe(2);
    expect(janusState.status).toBe('ready');
  });

  it('rejects and sets error state when ensureJanusLib fails (init throws)', async () => {
    const { getJanusSession, janusState } = await loadStore();
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    janusMockState.initThrows = true;

    await expect(getJanusSession(SERVER)).rejects.toThrow('init boom');
    expect(janusState.status).toBe('error');
    expect(janusState.session).toBeNull();
    expect(janusState.error).toBe('init boom');

    // initPromise was cleared -> a subsequent call retries construction.
    janusMockState.initThrows = false;
    const session = await getJanusSession(SERVER);
    expect(session).toBeTruthy();
    expect(janusState.status).toBe('ready');

    consoleError.mockRestore();
  });

  it('does not reject the original promise on error AFTER ready (session lost)', async () => {
    const { getJanusSession, janusState, onJanusSessionDestroyed } =
      await loadStore();

    const session = await getJanusSession(SERVER);
    expect(janusState.status).toBe('ready');

    const listener = vi.fn();
    onJanusSessionDestroyed(listener);

    // Fire the error callback captured from construction, now that we're ready.
    janusMockState.configs[0].error({ message: 'connection lost' });

    // The original promise already resolved; still resolves to the session.
    await expect(Promise.resolve(session)).resolves.toBe(session);

    expect(janusState.error).toBe('connection lost');
    expect(janusState.status).toBe('idle');
    expect(janusState.session).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('destroyed callback', () => {
  it('nulls the session, goes idle, and fires listeners (handleSessionLost)', async () => {
    const { getJanusSession, janusState, onJanusSessionDestroyed } =
      await loadStore();

    await getJanusSession(SERVER);
    const listener = vi.fn();
    onJanusSessionDestroyed(listener);

    janusMockState.configs[0].destroyed();

    expect(janusState.session).toBeNull();
    expect(janusState.status).toBe('idle');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('logs and keeps notifying remaining listeners when one listener throws', async () => {
    const { getJanusSession, onJanusSessionDestroyed } = await loadStore();
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await getJanusSession(SERVER);
    const throwing = vi.fn(() => {
      throw new Error('listener boom');
    });
    const other = vi.fn();
    onJanusSessionDestroyed(throwing);
    onJanusSessionDestroyed(other);

    expect(() => janusMockState.configs[0].destroyed()).not.toThrow();

    expect(throwing).toHaveBeenCalledTimes(1);
    // The throw is caught and the next listener still runs.
    expect(other).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('session destroyed listener'),
      expect.any(Error),
    );

    consoleError.mockRestore();
  });
});

describe('destroyJanusSession', () => {
  it('destroys the session and resets state to idle', async () => {
    const { getJanusSession, destroyJanusSession, janusState } =
      await loadStore();

    const session = (await getJanusSession(SERVER)) as { destroy: () => void };
    session.destroy = vi.fn();

    destroyJanusSession();

    expect(session.destroy).toHaveBeenCalledTimes(1);
    expect(janusState.status).toBe('idle');
    expect(janusState.session).toBeNull();
    expect(janusState.error).toBeNull();
  });

  it('survives session.destroy() throwing', async () => {
    const { getJanusSession, destroyJanusSession, janusState } =
      await loadStore();

    const session = (await getJanusSession(SERVER)) as { destroy: () => void };
    session.destroy = vi.fn(() => {
      throw new Error('destroy boom');
    });

    expect(() => destroyJanusSession()).not.toThrow();
    expect(janusState.status).toBe('idle');
    expect(janusState.session).toBeNull();
  });
});

describe('onJanusSessionDestroyed', () => {
  it('returns an unsubscribe fn that removes the listener', async () => {
    const { getJanusSession, onJanusSessionDestroyed } = await loadStore();

    await getJanusSession(SERVER);
    const listener = vi.fn();
    const unsubscribe = onJanusSessionDestroyed(listener);

    unsubscribe();

    // Trigger a session-lost event; the removed listener must not fire.
    janusMockState.configs[0].destroyed();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('janusHandle', () => {
  it('setJanusHandle / clearJanusHandle update the signal value', async () => {
    const { janusHandle, setJanusHandle, clearJanusHandle } = await loadStore();

    const handle = { id: 1 };
    setJanusHandle(handle);
    expect(janusHandle.value).toBe(handle);

    clearJanusHandle();
    expect(janusHandle.value).toBeNull();
  });
});

describe('mute effect', () => {
  it('mutes/unmutes when a handle with an active stream is set', async () => {
    const { setJanusHandle } = await loadStore();
    const { widgetState } = await import('./widgetStore');
    const { act } = await import('@testing-library/preact');

    const handle = {
      webrtcStuff: { myStream: {} },
      muteAudio: vi.fn(),
      unmuteAudio: vi.fn(),
    };

    // Setting the handle runs the effect with the current (false) mute state.
    void act(() => {
      setJanusHandle(handle);
    });
    expect(handle.unmuteAudio).toHaveBeenCalled();

    handle.muteAudio.mockClear();
    handle.unmuteAudio.mockClear();

    void act(() => {
      widgetState.isMicMuted = true;
    });
    expect(handle.muteAudio).toHaveBeenCalledTimes(1);
    expect(handle.unmuteAudio).not.toHaveBeenCalled();

    handle.muteAudio.mockClear();

    void act(() => {
      widgetState.isMicMuted = false;
    });
    expect(handle.unmuteAudio).toHaveBeenCalledTimes(1);
    expect(handle.muteAudio).not.toHaveBeenCalled();
  });

  it('swallows and logs errors thrown by muteAudio', async () => {
    const { setJanusHandle } = await loadStore();
    const { widgetState } = await import('./widgetStore');
    const { act } = await import('@testing-library/preact');
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const handle = {
      webrtcStuff: { myStream: {} },
      muteAudio: vi.fn(() => {
        throw new Error('mute boom');
      }),
      unmuteAudio: vi.fn(),
    };

    // Initial set runs the effect with muted=false (calls unmuteAudio, no throw).
    void act(() => {
      setJanusHandle(handle);
    });

    // Flipping to muted triggers muteAudio, which throws — must be caught.
    expect(() =>
      act(() => {
        widgetState.isMicMuted = true;
      }),
    ).not.toThrow();

    expect(handle.muteAudio).toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('Error setting mute'),
      expect.any(Error),
    );

    consoleError.mockRestore();
  });
});
