// loader.ts has a module-level `pending` variable.
// vi.resetModules() in beforeEach gives each test a fresh module with pending = null.

const WIDGET_GLOBAL = 'CallWidget';

const mockWidget = {
  emit: vi.fn<(event: string, payload?: unknown) => void>(),
  on: vi.fn(),
  off: vi.fn(),
};

type ScriptMock = {
  src: string;
  async: boolean;
  onload: ((e: Event) => void) | null;
  onerror: ((e: Event) => void) | null;
};

// Captured by the document.createElement spy — reassigning this between calls
// lets the same closure capture the refreshed object on subsequent invocations.
let capturedScript: ScriptMock;

function scriptsCreated(): number {
  return vi
    .mocked(document.createElement)
    .mock.calls.filter(([tag]) => tag === 'script').length;
}

beforeEach(() => {
  vi.resetModules();
  mockWidget.emit.mockClear();
  mockWidget.on.mockClear();
  mockWidget.off.mockClear();
  delete (window as unknown as Record<string, unknown>)[WIDGET_GLOBAL];
  delete (window as unknown as Record<string, unknown>).CallWidgetLoader;

  capturedScript = { src: '', async: false, onload: null, onerror: null };

  const originalCreate = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) =>
    tag === 'script'
      ? (capturedScript as unknown as HTMLElement)
      : originalCreate(tag),
  );
  vi.spyOn(document.head, 'appendChild').mockImplementation((node: Node) => {
    if (node === (capturedScript as unknown as Node)) {
      return node;
    }
    return Node.prototype.appendChild.call(document.head, node);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  delete (window as unknown as Record<string, unknown>)[WIDGET_GLOBAL];
});

describe('validation', () => {
  it('rejects immediately when scriptUrl is an empty string', async () => {
    await import('./loader');
    await expect(
      window.CallWidgetLoader!.load({ scriptUrl: '' }),
    ).rejects.toThrow('scriptUrl is required');
  });

  it('does not inject a script tag for invalid scriptUrl', async () => {
    await import('./loader');
    await window.CallWidgetLoader!.load({ scriptUrl: '' }).catch(() => {});
    expect(scriptsCreated()).toBe(0);
  });
});

describe('widget already loaded (window.CallWidget exists)', () => {
  it('resolves immediately with the existing widget without injecting a script', async () => {
    (window as unknown as Record<string, unknown>)[WIDGET_GLOBAL] = mockWidget;
    await import('./loader');

    const result = await window.CallWidgetLoader!.load({
      scriptUrl: 'https://cdn.example.com/call-widget.js',
    });

    expect(result).toBe(mockWidget);
    expect(scriptsCreated()).toBe(0);
  });

  it('emits "init" with config when widget is already present and config is provided', async () => {
    (window as unknown as Record<string, unknown>)[WIDGET_GLOBAL] = mockWidget;
    await import('./loader');

    const config = {
      apiBaseUrl: 'https://api.example.com',
      webBaseUrl: 'https://app.example.com',
      janusWsUrl: 'wss://webrtc.example.com',
      authToken: 'tok',
    };
    await window.CallWidgetLoader!.load({
      scriptUrl: 'https://cdn.example.com/call-widget.js',
      config,
    });

    expect(mockWidget.emit).toHaveBeenCalledWith('init', config);
  });

  it('does NOT emit "init" when no config is passed — caller controls init timing', async () => {
    (window as unknown as Record<string, unknown>)[WIDGET_GLOBAL] = mockWidget;
    await import('./loader');

    await window.CallWidgetLoader!.load({
      scriptUrl: 'https://cdn.example.com/call-widget.js',
    });

    expect(mockWidget.emit).not.toHaveBeenCalled();
  });
});

describe('first load — script injection', () => {
  it('injects a <script> tag with the correct src and async=true', async () => {
    await import('./loader');

    void window.CallWidgetLoader!.load({
      scriptUrl: 'https://cdn.example.com/call-widget.js',
    });

    expect(document.createElement).toHaveBeenCalledWith('script');
    expect(capturedScript.src).toBe('https://cdn.example.com/call-widget.js');
    expect(capturedScript.async).toBe(true);
    expect(scriptsCreated()).toBe(1);
  });

  it('resolves with the widget after onload fires and window.CallWidget is set', async () => {
    await import('./loader');

    const promise = window.CallWidgetLoader!.load({
      scriptUrl: 'https://cdn.example.com/call-widget.js',
    });
    (window as unknown as Record<string, unknown>)[WIDGET_GLOBAL] = mockWidget;
    capturedScript.onload?.(new Event('load'));

    await expect(promise).resolves.toBe(mockWidget);
  });

  it('emits "init" with config after the script successfully loads', async () => {
    await import('./loader');

    const config = {
      apiBaseUrl: 'https://api.example.com',
      webBaseUrl: 'https://app.example.com',
      janusWsUrl: 'wss://webrtc.example.com',
      authToken: 'tok',
    };
    const promise = window.CallWidgetLoader!.load({
      scriptUrl: 'https://cdn.example.com/call-widget.js',
      config,
    });
    (window as unknown as Record<string, unknown>)[WIDGET_GLOBAL] = mockWidget;
    capturedScript.onload?.(new Event('load'));

    await promise;
    expect(mockWidget.emit).toHaveBeenCalledWith('init', config);
  });

  it('rejects when onload fires but window.CallWidget is not set — widget bundle failed to attach', async () => {
    await import('./loader');

    const promise = window.CallWidgetLoader!.load({
      scriptUrl: 'https://cdn.example.com/call-widget.js',
    });
    // Do NOT set window.CallWidget before triggering onload
    capturedScript.onload?.(new Event('load'));

    await expect(promise).rejects.toThrow(
      'widget did not attach to window.CallWidget',
    );
  });

  it('rejects when the script fails to load (onerror fires)', async () => {
    await import('./loader');

    const promise = window.CallWidgetLoader!.load({
      scriptUrl: 'https://cdn.example.com/call-widget.js',
    });
    capturedScript.onerror?.(new Event('error'));

    await expect(promise).rejects.toThrow('failed to load widget script');
  });
});

describe('concurrent and retry behaviour', () => {
  it('returns the same pending promise for concurrent load calls — deduplication', async () => {
    await import('./loader');
    const { load } = window.CallWidgetLoader!;

    const p1 = load({
      scriptUrl: 'https://cdn.example.com/call-widget.js',
    });
    const p2 = load({
      scriptUrl: 'https://cdn.example.com/call-widget.js',
    });

    expect(p1).toBe(p2);

    // Resolve to clean up
    (window as unknown as Record<string, unknown>)[WIDGET_GLOBAL] = mockWidget;
    capturedScript.onload?.(new Event('load'));
    await p1;
  });

  it('injects only one script tag regardless of how many concurrent calls are made', async () => {
    await import('./loader');
    const { load } = window.CallWidgetLoader!;

    const p1 = load({ scriptUrl: 'https://cdn.example.com/call-widget.js' });
    void load({ scriptUrl: 'https://cdn.example.com/call-widget.js' });
    void load({ scriptUrl: 'https://cdn.example.com/call-widget.js' });

    expect(scriptsCreated()).toBe(1);

    (window as unknown as Record<string, unknown>)[WIDGET_GLOBAL] = mockWidget;
    capturedScript.onload?.(new Event('load'));
    await p1;
  });

  it('clears pending after onerror so a subsequent load can retry', async () => {
    await import('./loader');
    const { load } = window.CallWidgetLoader!;

    // First attempt fails
    const failing = load({
      scriptUrl: 'https://cdn.example.com/call-widget.js',
    });
    capturedScript.onerror?.(new Event('error'));
    await expect(failing).rejects.toThrow();

    // Reset the captured script — the closure reads the variable, so reassignment
    // means the next createElement('script') call returns this fresh object.
    capturedScript = { src: '', async: false, onload: null, onerror: null };

    // Retry — should succeed
    const retrying = load({
      scriptUrl: 'https://cdn.example.com/call-widget.js',
    });
    (window as unknown as Record<string, unknown>)[WIDGET_GLOBAL] = mockWidget;
    capturedScript.onload?.(new Event('load'));

    await expect(retrying).resolves.toBe(mockWidget);
  });
});

describe('two-step usage: preload the script, init later with the auth token', () => {
  it('resolves with the widget without auto-initializing when no config is passed', async () => {
    await import('./loader');

    // Step 1 — preload before the user is authenticated
    const widgetPromise = window.CallWidgetLoader!.load({
      scriptUrl: 'https://cdn.example.com/call-widget.js',
    });

    // Simulate the widget bundle loading and registering itself on window
    (window as unknown as Record<string, unknown>)[WIDGET_GLOBAL] = mockWidget;
    capturedScript.onload?.(new Event('load'));

    const widget = await widgetPromise;

    // No auto-init — the widget is ready but not yet configured
    expect(mockWidget.emit).not.toHaveBeenCalled();

    // Step 2 — after login, init with the session token
    widget.emit('init', {
      apiBaseUrl: 'https://api.example.com',
      webBaseUrl: 'https://app.example.com',
      janusWsUrl: 'wss://webrtc.example.com',
      authToken: 'session-token-xyz',
    });

    // Only one emit, driven by the caller — not the loader
    expect(mockWidget.emit).toHaveBeenCalledTimes(1);
    expect(mockWidget.emit).toHaveBeenCalledWith(
      'init',
      expect.objectContaining({ authToken: 'session-token-xyz' }),
    );
  });
});
