# integration-call-widget

Standalone call widget injected into any web page via a `<script>` tag. Uses Janus WebRTC Gateway for voice calls and communicates with the CRM backend.

## Table of Contents

- [Architecture](#architecture)
- [Backend API contract](#backend-api-contract)
- [Integration](#integration)
- [Events](#events)
- [Development](#development)
- [Style Isolation](#style-isolation)

## Architecture

```
src/
  index.ts                  # Entry point: Shadow DOM setup, EventBus handlers, global API
  App.tsx                   # QueryClientProvider + Emotion + MUI ThemeProvider
  components/
    ExternalCallWidget.tsx  # Widget orchestration: screens, call flow, store
    CallNotification.tsx    # Info/error notification bar
    WidgetErrorBoundary.tsx # React error boundary for ErrorScreen
  screens/
    index.ts
    ConfirmationScreen.tsx
    CallInformationScreen.tsx
    CollapsedCallBar.tsx
    ErrorScreen.tsx
  stores/
    widgetStore.ts          # Zustand state
    janusStore.ts           # Janus WebRTC session manager
  hooks/
    useCall.ts              # Call orchestration: mic check, trunk fetch, Janus flow
    useJanusCall.ts         # Janus SIP call hook (emits CallState events)
  eventBus/                 # EventBus for host app communication
  api/                      # Fetch wrapper, TanStack Query defaults, QueryClient
  theme/                    # MUI theme
  types/
```

## Backend API contract

- **POST** `{apiBaseUrl}/widget/best-trunk-for-call` — body `{ extAgentId, extCustomerId?, phoneNumber? }`, returns the best available SIP trunk with `customerInfo` embedded.
- **POST** `{apiBaseUrl}/customers/:customerId/call` — body `{ trunkId: number }`, returns `{ bridgeId: string, targetUri: string }`.

All requests use `Authorization: Bearer {authToken}` from the init config.

## Integration

Build output is two files — `dist/loader.js` and `dist/call-widget.js` (no separate CSS, styles are injected from JS). Host both on your CDN or serve them from the host app's public folder.

### TypeScript types for the host app

Create a shared type file in the host project (e.g. `src/shared/callWidget.ts`):

```typescript
export interface CallWidgetConfig {
  apiBaseUrl: string;
  webBaseUrl: string;
  janusWsUrl: string;
  authToken: string;
}

export interface CallWidgetAPI {
  emit(event: 'init', payload: CallWidgetConfig): void;
  emit(
    event: 'call',
    payload: { clientId: number; phoneNumber: string; agentId: number },
  ): void;
  emit(event: 'destroy'): void;
  on(event: 'initialized', handler: () => void): void;
  on(event: 'call_initiated', handler: () => void): void;
  on(
    event: 'call_state_change',
    handler: (payload: { state: string; clientId?: number }) => void,
  ): void;
  on(
    event: 'mic_toggled',
    handler: (payload: { muted: boolean }) => void,
  ): void;
  on(event: 'widget_dismissed', handler: () => void): void;
  on(event: 'error', handler: (payload: { message: string }) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    CallWidgetLoader?: {
      load(options: {
        scriptUrl: string;
        config?: CallWidgetConfig;
      }): Promise<CallWidgetAPI>;
    };
  }
}
```

### Loading the widget

Include `loader.js` once in the host app (e.g. in `index.html`):

```html
<script src="https://your-cdn.com/loader.js"></script>
```

Then call `load()` when the auth token is available:

```typescript
const widget = await window.CallWidgetLoader!.load({
  scriptUrl: 'https://your-cdn.com/call-widget.js',
  config: {
    apiBaseUrl: 'https://api.example.com',
    webBaseUrl: 'https://app.example.com',
    janusWsUrl: 'wss://webrtc.example.com',
    authToken: session.token,
  },
});

widget.on('initialized', () => {
  console.log('Widget ready');
});

widget.on('error', (payload) => {
  console.error('Widget error:', payload.message);
});
```

If the auth token isn't available at page load, omit `config` from `load()` and call `init` once you have it:

```typescript
// On page load — preload the script without initializing
const widgetPromise = window.CallWidgetLoader!.load({
  scriptUrl: 'https://your-cdn.com/call-widget.js',
});

// After login — initialize with the token
const widget = await widgetPromise;
widget.emit('init', {
  apiBaseUrl: 'https://api.example.com',
  webBaseUrl: 'https://app.example.com',
  janusWsUrl: 'wss://webrtc.example.com',
  authToken: session.token,
});
```

### Making a call

```typescript
widget.emit('call', {
  clientId: 123, // numeric CRM client ID
  phoneNumber: '+1234567890', // E.164 format
  agentId: 456, // numeric CRM agent ID
});
```

### Listening for events

```typescript
widget.on('call_state_change', (payload) => {
  // payload.state: 'calling' | 'ringing' | 'connected' | 'ended' | 'failed'
  console.log('Call state:', payload.state, payload.clientId);
});

widget.on('call_initiated', () => {
  console.log('Call initiated');
});

widget.on('mic_toggled', (payload) => {
  console.log('Mic muted:', payload.muted);
});

widget.on('widget_dismissed', () => {
  console.log('Widget closed by user');
});
```

### Destroying the widget

Forces the widget to end any active call, tear down Janus, unmount React, and remove its DOM container. Call this on logout or page unload:

```typescript
widget.emit('destroy');
```

## Events

| Event               | Direction     | Payload                                             |
| ------------------- | ------------- | --------------------------------------------------- |
| `init`              | Host → Widget | `{ apiBaseUrl, webBaseUrl, janusWsUrl, authToken }` |
| `call`              | Host → Widget | `{ clientId, phoneNumber, agentId }`                |
| `destroy`           | Host → Widget | —                                                   |
| `initialized`       | Widget → Host | —                                                   |
| `call_initiated`    | Widget → Host | —                                                   |
| `call_state_change` | Widget → Host | `{ state, clientId? }`                              |
| `mic_toggled`       | Widget → Host | `{ muted }`                                         |
| `widget_dismissed`  | Widget → Host | —                                                   |
| `error`             | Widget → Host | `{ message }`                                       |

## Development

```bash
npm install
```

**Embedding in a host app — two options:**

**Dev server (HMR, no build step):** run `npm run dev` — starts on **http://localhost:5174**. Load the widget directly in the host:

```html
<script type="module" src="http://localhost:5174/src/index.ts"></script>
```

**Built preview:** run `npm run preview` — builds to `dist/` and serves on **http://localhost:3005**. Use the loader as usual:

- Loader: `http://localhost:3005/loader.js`
- Widget: `http://localhost:3005/call-widget.js`

After any widget change, re-run `npm run build` and refresh the host page.

**Without a CDN (production):** copy `dist/loader.js` and `dist/call-widget.js` into the host app's static folder and use relative paths (e.g. `/widget/call-widget.js`). Same-origin avoids CORS.

### Versioning

```bash
npm run version:patch   # 1.0.0 → 1.0.1
npm run version:minor   # 1.0.0 → 1.1.0
npm run version:major   # 1.0.0 → 2.0.0
```

Bumps `package.json`, creates a git commit and tag. The version is embedded as `__WIDGET_VERSION__` and logged to the console on load.

Release workflow:

1. `npm run version:minor` (or patch/major)
2. `git push && git push --tags`
3. `npm run build` and deploy `dist/loader.js` + `dist/call-widget.js` to CDN

## Style Isolation

The widget renders inside a Shadow DOM — immune to host page CSS. All MUI/Emotion styles inject into the shadow root. The container uses `z-index: 1300`; host elements that must appear above it need a higher z-index.
