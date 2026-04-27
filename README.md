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
    ConfirmationDialog.tsx  # Reusable confirmation dialog (used in SipTrunkScreen)
    StatusesList.tsx        # Infinite-scroll status picker (used in ChangeStatusScreen)
    WidgetErrorBoundary.tsx # Error boundary (react-error-boundary under preact/compat)
  screens/
    index.ts
    SipTrunkScreen.tsx
    CallInformationScreen.tsx
    CollapsedCallBar.tsx
    ChangeStatusScreen.tsx
    CompatibilityWarningScreen.tsx
    ErrorScreen.tsx
  stores/
    widgetStore.ts          # Zustand state
    janusStore.ts           # Janus WebRTC session manager
  hooks/
    useCall.ts              # Call orchestration: mic check, trunk selection, Janus flow
    useJanusCall.ts         # Janus SIP call hook (emits CallState events)
  eventBus/                 # EventBus for host app communication
  api/                      # Fetch wrapper, TanStack Query defaults, QueryClient
  theme/                    # MUI theme
  types/
```

### Runtime stack

The widget runs on **Preact 10** via `preact/compat`, wired up by `@preact/preset-vite`. The preset aliases `react`, `react-dom`, and the JSX runtime to Preact at bundle time, so first‑party code and third‑party libs (MUI, `@tanstack/react-query`, `react-error-boundary`) keep importing from `react` unchanged.

## Backend API contract

- **POST** `{apiBaseUrl}/widget/trunks-for-call` — body `{ extAgentId, extCustomerId?, phoneNumber? }`, returns `{ customerInfo, trunks: [...] }` with all available SIP trunks.
- **POST** `{apiBaseUrl}/customers/:customerId/call` — body `{ trunkId: number }`, returns `{ bridgeId: string, targetUri: string }`.
- **PATCH** `{apiBaseUrl}/customers/:customerId/status` — body `{ statusId: string, comment?: string }`, returns updated customer status.
- **GET** `{apiBaseUrl}/statuses` — query params `{ page, perPage, search? }`, returns `{ data: StatusOption[], pageInfo: { ... } }` (paginated).

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
  emit(event: 'dismiss'): void;
  emit(event: 'update_token', payload: { token: string }): void;
  on(event: 'initialized', handler: () => void): void;
  on(event: 'widget_opened', handler: () => void): void;
  on(event: 'widget_dismissed', handler: () => void): void;
  on(
    event: 'call_state_change',
    handler: (payload: { state: string; clientId?: number }) => void,
  ): void;
  on(
    event: 'trunk_selected',
    handler: (payload: { trunkId: string; trunkName: string }) => void,
  ): void;
  on(
    event: 'mic_toggled',
    handler: (payload: { muted: boolean }) => void,
  ): void;
  on(
    event: 'status_confirmed',
    handler: (payload: {
      clientId: number;
      statusId: string;
      dialerId: number;
    }) => void,
  ): void;
  on(
    event: 'status_change_skipped',
    handler: (payload: { clientId: number }) => void,
  ): void;
  on(event: 'error', handler: (payload: { message: string }) => void): void;
  off(event: string, handler: (...args: never[]) => void): void;
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
widget.on('widget_opened', () => {
  console.log('Widget is now visible');
});

widget.on('call_state_change', (payload) => {
  // payload.state: 'calling' | 'ringing' | 'connected' | 'ended' | 'failed'
  console.log('Call state:', payload.state, payload.clientId);
});

widget.on('trunk_selected', (payload) => {
  console.log('Trunk confirmed:', payload.trunkId, payload.trunkName);
});

widget.on('mic_toggled', (payload) => {
  console.log('Mic muted:', payload.muted);
});

widget.on('status_confirmed', (payload) => {
  console.log(
    'Status saved:',
    payload.statusId,
    'dialerId: ',
    payload.dialerId,
  );
});

widget.on('status_change_skipped', (payload) => {
  console.log('Status skipped for client:', payload.clientId);
});

widget.on('widget_dismissed', () => {
  console.log('Widget closed');
});
```

### Dismissing the widget

Resets any active call and returns the widget to idle. The widget stays mounted so `emit('call')` works again immediately without re-emitting `init`:

```typescript
widget.emit('dismiss');
```

### Token refresh and logout

Update the auth token at any time without re-initializing:

```typescript
widget.emit('update_token', { token: newJwt });
```

On logout, invalidate the token and dismiss any active state:

```typescript
widget.emit('update_token', { token: '' });
widget.emit('dismiss');
```

On re-login, restore the token and the widget is ready to use:

```typescript
widget.emit('update_token', { token: newJwt });
widget.emit('call', params);
```

## Events

**Inbound (host → widget):**

| Event          | Payload                                             | Description                                 |
| -------------- | --------------------------------------------------- | ------------------------------------------- |
| `init`         | `{ apiBaseUrl, webBaseUrl, janusWsUrl, authToken }` | Initialize widget (first time only)         |
| `call`         | `{ clientId, phoneNumber, agentId }`                | Open widget and start a call flow           |
| `dismiss`      | —                                                   | Reset to idle; widget stays mounted         |
| `update_token` | `{ token }`                                         | Refresh auth token; pass `''` to invalidate |

**Outbound (widget → host):**

| Event                   | Payload                            | When                                                                 |
| ----------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| `initialized`           | —                                  | Widget mounted and ready                                             |
| `widget_opened`         | —                                  | Widget UI became visible                                             |
| `widget_dismissed`      | —                                  | Widget UI fully gone (all paths)                                     |
| `call_state_change`     | `{ state, clientId? }`             | Every state transition: calling → ringing → connected → ended/failed |
| `trunk_selected`        | `{ trunkId: string, trunkName }`   | User confirmed trunk selection                                       |
| `mic_toggled`           | `{ muted }`                        | User muted or unmuted the microphone                                 |
| `status_confirmed`      | `{ clientId, statusId, dialerId }` | User saved a post-call status                                        |
| `status_change_skipped` | `{ clientId }`                     | User skipped status change after call                                |
| `error`                 | `{ message }`                      | Any error occurred                                                   |

## Screen & call state flow

### Widget life flow

| Phase                            | `screen`       | `callState` | Set by                                           |
| -------------------------------- | -------------- | ----------- | ------------------------------------------------ |
| Widget hidden                    | `idle`         | `Idle`      | `resetToIdle()` or initial state                 |
| Trunk selection                  | `sipTrunk`     | `Idle`      | `handleCall()` in index.ts                       |
| Call initiating                  | `calling`      | `Calling`   | `startCallWithTrunk()` — set together atomically |
| Destination ringing              | `calling`      | `Ringing`   | `useCall` Janus event                            |
| Call live                        | `calling`      | `Connected` | `useCall` Janus event                            |
| Call failed                      | `calling`      | `Failed`    | `useCall` Janus event — shows notification       |
| Status edit during live call     | `changeStatus` | `Connected` | `handleOpenStatusChange()`                       |
| Call ended, status not yet given | `changeStatus` | `Ended`     | `useCall` Ended handler                          |
| Status saved / skipped           | `idle`         | `Idle`      | `resetToIdle()`                                  |

> **`screen='calling'` + `callState=Idle`** is a special state produced **only by the Zustand `merge` function on page reload** during an active call. It is the signal for the auto-restart call by `useEffect` in `useCall.ts` and never appears in the normal live-session flow.

## Development

```bash
npm install
```

**Embedding in a host app — two options:**

**Dev server (HMR, no build step):** run `npm run dev` — starts on **http://localhost:5174**. Add the module script to the host HTML and use `window.CallWidget` directly (no loader). All events and payloads are identical to the loader-based integration. Add `CallWidget` to the host's local type declaration:

```html
<script type="module" src="http://localhost:5174/src/index.ts"></script>
```

```typescript
window.CallWidget.emit('init', {
  apiBaseUrl: 'https://api.example.com',
  webBaseUrl: 'https://app.example.com',
  janusWsUrl: 'wss://webrtc.example.com',
  authToken: session.token,
});
```

```typescript
declare global {
  interface Window {
    CallWidget: CallWidgetAPI;
  }
}
```

**Built preview:** run `npm run preview` — builds to `dist/` and serves on **http://localhost:3005**. Use the loader:

```html
<script src="http://localhost:3005/loader.js"></script>
```

```typescript
const widget = await window.CallWidgetLoader!.load({
  scriptUrl: 'http://localhost:3005/call-widget.js',
  config: {
    apiBaseUrl: '...',
    webBaseUrl: '...',
    janusWsUrl: '...',
    authToken: session.token,
  },
});
```

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

The widget renders inside a Shadow DOM — immune to host page CSS. All MUI/Emotion styles inject into the shadow root. The Roboto font is loaded via a Google Fonts `<link>` injected into `document.head` — `@font-face` so rules at document scope are visible inside shadow trees across all browsers. The container uses `z-index: 1300`; host elements that must appear above it need a higher z-index.
