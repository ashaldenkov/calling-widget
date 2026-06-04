import { CallState } from '../types/types';

// Tests for widgetStore's module-level initialization: loadPersisted + mergePersisted.
// This file is separated to avoid polluting the shared module cache.

const STORAGE_KEY = 'CallWidgetStore';

function writeToSession(
  state: Record<string, unknown>,
  persistedAt = Date.now(),
) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ persistedAt, state }));
}

beforeEach(() => {
  vi.resetModules();
  sessionStorage.clear();
});

describe('transient screens — reset to idle on reload', () => {
  it.each(['error', 'sipTrunk', 'compatibilityWarning'])(
    '"%s" screen is transient and becomes idle after a page reload',
    async (screen) => {
      writeToSession({ screen, callState: CallState.Idle });
      const { widgetState } = await import('./widgetStore');
      expect(widgetState.screen).toBe('idle');
    },
  );

  it('non-transient "changeStatus" screen is preserved as-is', async () => {
    writeToSession({ screen: 'changeStatus', callState: CallState.Idle });
    const { widgetState } = await import('./widgetStore');
    expect(widgetState.screen).toBe('changeStatus');
  });
});

describe('active call hydration', () => {
  it('active call WITH apiKey → screen stays "calling", callState reset to Idle to trigger auto-restart', async () => {
    writeToSession({
      screen: 'calling',
      callState: CallState.Connected,
      apiKey: 'key-abc',
    });
    const { widgetState } = await import('./widgetStore');
    expect(widgetState.screen).toBe('calling');
    // callState must be Idle so the useEffect in useStartCall fires again
    expect(widgetState.callState).toBe(CallState.Idle);
  });

  it('active call WITHOUT apiKey (legacy entry) → both screen and callState are dropped to idle', async () => {
    writeToSession({
      screen: 'calling',
      callState: CallState.Ringing,
      apiKey: null,
    });
    const { widgetState } = await import('./widgetStore');
    expect(widgetState.screen).toBe('idle');
    expect(widgetState.callState).toBe(CallState.Idle);
  });

  it.each([
    CallState.Calling,
    CallState.Ringing,
    CallState.Connected,
    CallState.OnHold,
  ])(
    'active callState "%s" with apiKey always resets callState to idle for auto-restart',
    async (callState) => {
      writeToSession({ screen: 'calling', callState, apiKey: 'k' });
      const { widgetState } = await import('./widgetStore');
      expect(widgetState.callState).toBe(CallState.Idle);
      expect(widgetState.screen).toBe('calling');
    },
  );
});

describe('stale and corrupt sessionStorage', () => {
  it('ignores data older than 10 minutes — widget starts fresh', async () => {
    const STALE_TTL_MS = 10 * 60 * 1000;
    writeToSession(
      { screen: 'calling', callState: CallState.Connected, apiKey: 'k' },
      Date.now() - STALE_TTL_MS - 1,
    );
    const { widgetState } = await import('./widgetStore');
    expect(widgetState.screen).toBe('idle');
    expect(widgetState.callState).toBe(CallState.Idle);
  });

  it('accepts data just within the 10-minute TTL window', async () => {
    const STALE_TTL_MS = 10 * 60 * 1000;
    writeToSession(
      { screen: 'changeStatus', callState: CallState.Idle },
      Date.now() - STALE_TTL_MS + 500,
    );
    const { widgetState } = await import('./widgetStore');
    expect(widgetState.screen).toBe('changeStatus');
  });

  it('ignores completely corrupt sessionStorage JSON — starts in initial state', async () => {
    sessionStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');
    const { widgetState } = await import('./widgetStore');
    expect(widgetState.screen).toBe('idle');
    expect(widgetState.callState).toBe(CallState.Idle);
  });

  it('ignores envelope with missing "state" field', async () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ persistedAt: Date.now() }),
    );
    const { widgetState } = await import('./widgetStore');
    expect(widgetState.screen).toBe('idle');
  });

  it('ignores envelope with non-numeric persistedAt', async () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        persistedAt: 'yesterday',
        state: {
          screen: 'calling',
          callState: CallState.Connected,
          apiKey: 'k',
        },
      }),
    );
    const { widgetState } = await import('./widgetStore');
    expect(widgetState.screen).toBe('idle');
  });

  it('empty sessionStorage → widget starts in idle state', async () => {
    // sessionStorage is already cleared in beforeEach
    const { widgetState } = await import('./widgetStore');
    expect(widgetState.screen).toBe('idle');
    expect(widgetState.config).toBeNull();
  });
});
