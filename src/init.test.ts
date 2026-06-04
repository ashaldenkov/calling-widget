vi.mock('./stores/janusStore', () => ({
  destroyJanusSession: vi.fn(),
  hangUpRef: { current: null },
}));
vi.mock('./api/queryClient', () => ({
  queryClient: { clear: vi.fn() },
}));
vi.mock('./utils/tabPresence', () => ({
  isCallOwnedByOtherTab: vi.fn().mockResolvedValue(false),
  releaseCall: vi.fn(),
  claimCall: vi.fn().mockResolvedValue(true),
}));
vi.mock('./utils/browserDetection', () => ({
  detectBrowserWarnings: vi.fn().mockReturnValue([]),
}));

import { queryClient } from './api/queryClient';
import { ERR_CALL_IN_OTHER_TAB } from './errors';
import { eventBus, WidgetEvent } from './eventBus';
import { registerWidgetHandlers } from './init';
import { destroyJanusSession } from './stores/janusStore';
import { widgetState } from './stores/widgetStore';
import { resetWidgetState } from './test/resetWidgetState';
import { CallState } from './types/types';
import { detectBrowserWarnings } from './utils/browserDetection';
import { isCallOwnedByOtherTab, releaseCall } from './utils/tabPresence';

const MOCK_CONFIG = {
  apiBaseUrl: 'https://api.test',
  webBaseUrl: 'https://web.test',
  janusWsUrl: 'wss://janus.test',
  authToken: 'tok-123',
};

const MOCK_PARAMS = {
  apiKey: 'key-abc',
  extCustomerId: 42,
  phoneNumber: '+1234',
  extAgentId: 7,
};

// Handlers register once at module load
// All tests share the same handler closures and the `mounted` flag inside themx
const ensureMount = vi.fn();
registerWidgetHandlers(ensureMount);

// Flush the async Call-event handler IIFE
const flushAsync = () => Promise.resolve();

beforeEach(() => {
  resetWidgetState();
  sessionStorage.clear();
  localStorage.clear();
  vi.mocked(detectBrowserWarnings).mockReturnValue([]);
  vi.mocked(isCallOwnedByOtherTab).mockResolvedValue(false);
  vi.mocked(destroyJanusSession).mockReset();
  vi.mocked(queryClient.clear).mockReset();
  vi.mocked(releaseCall).mockReset();
  ensureMount.mockReset();
  // Bring widget into initialized state for each test
  eventBus.emit(WidgetEvent.Init, MOCK_CONFIG);
});

describe('Init event', () => {
  it('sets config in widgetState', () => {
    expect(widgetState.config).toEqual(MOCK_CONFIG);
  });

  it('emits Initialized after Init', () => {
    resetWidgetState();
    const spy = vi.spyOn(eventBus, 'emit');
    eventBus.emit(WidgetEvent.Init, MOCK_CONFIG);
    expect(spy).toHaveBeenCalledWith(WidgetEvent.Initialized);
  });

  it('ignores Init while a call is active — protects in-progress calls', () => {
    widgetState.callState = CallState.Connected;
    const spy = vi.spyOn(eventBus, 'emit');
    eventBus.emit(WidgetEvent.Init, MOCK_CONFIG);
    expect(spy).not.toHaveBeenCalledWith(WidgetEvent.Initialized);
  });
});

describe('Call event', () => {
  it('navigates to sipTrunk when there are no compatibility warnings', async () => {
    vi.mocked(detectBrowserWarnings).mockReturnValue([]);
    eventBus.emit(WidgetEvent.Call, MOCK_PARAMS);
    await flushAsync();
    expect(widgetState.screen).toBe('sipTrunk');
  });

  it('navigates to compatibilityWarning and stores warnings when browser is unsupported', async () => {
    const warnings = [
      { type: 'unsupportedBrowser' as const, browser: 'Firefox' },
    ];
    vi.mocked(detectBrowserWarnings).mockReturnValue(warnings);
    eventBus.emit(WidgetEvent.Call, MOCK_PARAMS);
    await flushAsync();
    expect(widgetState.screen).toBe('compatibilityWarning');
    expect(widgetState.compatibilityWarnings).toEqual(warnings);
  });

  it('skips compatibilityWarning and goes straight to sipTrunk when cw-compat-warned flag is set', async () => {
    const warnings = [{ type: 'mobileDevice' as const }];
    vi.mocked(detectBrowserWarnings).mockReturnValue(warnings);
    // User previously acknowledged the warning
    localStorage.setItem('cw-compat-warned', '1');
    eventBus.emit(WidgetEvent.Call, MOCK_PARAMS);
    await flushAsync();
    expect(widgetState.screen).toBe('sipTrunk');
  });

  it('clears cw-compat-warned flag has no effect on detection — only bypasses the gate', async () => {
    const warnings = [{ type: 'mobileDevice' as const }];
    vi.mocked(detectBrowserWarnings).mockReturnValue(warnings);
    // No flag set
    eventBus.emit(WidgetEvent.Call, MOCK_PARAMS);
    await flushAsync();
    expect(widgetState.screen).toBe('compatibilityWarning');
  });

  it('emits Error and does not navigate when widget is not initialized (no config)', async () => {
    widgetState.config = null;
    const spy = vi.spyOn(eventBus, 'emit');
    eventBus.emit(WidgetEvent.Call, MOCK_PARAMS);
    await flushAsync();
    expect(spy).toHaveBeenCalledWith(WidgetEvent.Error, {
      message: 'Widget not initialized',
    });
    expect(widgetState.screen).toBe('idle');
  });

  it('silently ignores Call when an active call is already in progress', async () => {
    widgetState.callState = CallState.Connected;
    eventBus.emit(WidgetEvent.Call, MOCK_PARAMS);
    await flushAsync();
    expect(widgetState.screen).toBe('idle'); // unchanged
  });

  it('sets error screen with ERR_CALL_IN_OTHER_TAB when another tab owns the call', async () => {
    vi.mocked(isCallOwnedByOtherTab).mockResolvedValue(true);
    eventBus.emit(WidgetEvent.Call, MOCK_PARAMS);
    await flushAsync();
    expect(widgetState.screen).toBe('error');
    expect(widgetState.error).toBe(ERR_CALL_IN_OTHER_TAB);
  });

  it('clears error screen and starts fresh when a new call arrives — error disappears, sipTrunk shown', async () => {
    widgetState.screen = 'error';
    eventBus.emit(WidgetEvent.Call, MOCK_PARAMS);
    await flushAsync();
    expect(destroyJanusSession).toHaveBeenCalled();
    expect(queryClient.clear).toHaveBeenCalled();
    // Error screen is gone; ready for trunk selection
    expect(widgetState.screen).toBe('sipTrunk');
  });

  it('does not reset state if widget was already idle (avoids unnecessary Janus teardown)', async () => {
    // screen is 'idle' from beforeEach
    eventBus.emit(WidgetEvent.Call, MOCK_PARAMS);
    await flushAsync();
    expect(destroyJanusSession).not.toHaveBeenCalled();
  });

  it('interrupts sipTrunk screen for a new customer — loads fresh call params and shows sipTrunk again', async () => {
    // Agent is on the trunk selection screen for customer A (no Janus session yet).
    // destroyJanusSession is still called as a defensive no-op cleanup.
    widgetState.screen = 'sipTrunk';
    widgetState.extCustomerId = 99;
    widgetState.apiKey = 'old-key';

    const newParams = {
      apiKey: 'new-key',
      extCustomerId: 7,
      phoneNumber: '+9876543210',
      extAgentId: 3,
    };

    eventBus.emit(WidgetEvent.Call, newParams);
    await flushAsync();

    // Defensive teardown runs (no-op if no session, but always called)
    expect(destroyJanusSession).toHaveBeenCalled();
    expect(queryClient.clear).toHaveBeenCalled();

    expect(widgetState.extCustomerId).toBe(7);
    expect(widgetState.apiKey).toBe('new-key');
    expect(widgetState.phoneNumber).toBe('+9876543210');

    // Back on trunk selection, ready for the new call
    expect(widgetState.screen).toBe('sipTrunk');
  });

  it('stores call params in widgetState', async () => {
    eventBus.emit(WidgetEvent.Call, MOCK_PARAMS);
    await flushAsync();
    expect(widgetState.extCustomerId).toBe(MOCK_PARAMS.extCustomerId);
    expect(widgetState.apiKey).toBe(MOCK_PARAMS.apiKey);
  });
});

describe('Dismiss event', () => {
  it('destroys Janus session', () => {
    eventBus.emit(WidgetEvent.Dismiss);
    expect(destroyJanusSession).toHaveBeenCalled();
  });

  it('clears the query cache', () => {
    eventBus.emit(WidgetEvent.Dismiss);
    expect(queryClient.clear).toHaveBeenCalled();
  });

  it('releases the call lock', () => {
    eventBus.emit(WidgetEvent.Dismiss);
    expect(releaseCall).toHaveBeenCalled();
  });

  it('resets widget state to idle', () => {
    widgetState.screen = 'calling';
    eventBus.emit(WidgetEvent.Dismiss);
    expect(widgetState.screen).toBe('idle');
  });
});

describe('UpdateToken event', () => {
  it('updates the authToken when widget is initialized', () => {
    eventBus.emit(WidgetEvent.UpdateToken, { token: 'new-token' });
    expect(widgetState.config?.authToken).toBe('new-token');
  });

  it('is a no-op when config is null — no crash', () => {
    widgetState.config = null;
    expect(() =>
      eventBus.emit(WidgetEvent.UpdateToken, { token: 'tok' }),
    ).not.toThrow();
    expect(widgetState.config).toBeNull();
  });
});
