# integration-call-widget

Standalone call widget injected into any web page via a `<script>` tag. Uses Janus WebRTC Gateway for voice calls and communicates with the CRM backend.

## Table of Contents

- [Backend API contract](#backend-api-contract)
- [Integration](#integration)
- [Events](#events)
- [Development](#development)
- [CI/CD CDN deploy](#cicd-cdn-deploy)
- [Releases & versioning](#releases--versioning)
- [Style Isolation](#style-isolation)

## Backend API contract

- **POST** `{apiBaseUrl}/integration/auth` — header `X-Api-Key: {apiKey}`, body `{ agent_id }`, returns `{ token, expires_at }`. Called by the widget itself at the start of each call (using the `apiKey`/`extAgentId` from the `call` payload) to obtain the bearer token — the host never supplies a token directly.
- **POST** `{apiBaseUrl}/widget/trunks-for-call` — body `{ apiKey, extAgentId, extCustomerId?, phoneNumberEnc?, search? }`, returns `{ customerInfo, trunks: [...] }` with all available SIP trunks. `phoneNumberEnc` is the host-supplied `phoneNumber` encrypted client-side via `encryptPhoneNumber()` before being sent. `search` is sent as an empty string by the widget; trunk filtering is performed client-side.
- **GET** `{apiBaseUrl}/customers/:dialerId/in-call` — returns `{ inCall: boolean }`. Checked once before placing the call to block double-dialing. `dialerId` comes from `customerInfo` in the `trunks-for-call` response.
- **POST** `{apiBaseUrl}/customers/:dialerId/call` — body `{ trunkId: number }`, returns `{ bridgeId: string, targetUri: string }`.
- **PATCH** `{apiBaseUrl}/customers/:dialerId/status` — body `{ statusId: string, comment?: string }`, returns updated customer status.
- **GET** `{apiBaseUrl}/statuses` — query params `{ page, perPage, search? }`, returns `{ items: StatusOption[], pageInfo: { ... } }` (paginated).

All other requests use `Authorization: Bearer {token}`, where the token is obtained internally by the widget via `/integration/auth` for the current call (per-call auth — no token lifecycle to manage on the host). On a `401` the widget re-authenticates once with the call's credentials and replays the request; if that still fails the request errors and the widget shows its error screen (`error` event).

## Integration

Build output is two files — `dist/loader.js` and `dist/call-widget.js` (no separate CSS, styles are injected from JS). Host both on your CDN or serve them from the host app's public folder.

### TypeScript types for the host app

Create a shared type file in the host project (e.g. `src/shared/callWidget.ts`):

```typescript
export interface CallWidgetConfig {
  apiBaseUrl: string;
  webBaseUrl: string;
  janusWsUrl: string;
}

export interface CallWidgetAPI {
  emit(event: 'init', payload: CallWidgetConfig): void;
  emit(
    event: 'call',
    payload: {
      apiKey: string;
      extCustomerId: number;
      phoneNumber?: string;
      extAgentId: number;
    },
  ): void;
  emit(event: 'dismiss'): void;
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
<script src="https://cdn.example.com/call-widget/loader.js"></script>
```

Call `load()` with the (immutable) infrastructure config and the widget bundle URL (usually `latest`). The config carries only URLs — no token; the widget authenticates itself per call:

```typescript
const widget = await window.CallWidgetLoader!.load({
  scriptUrl: 'https://cdn.example.com/call-widget/latest/call-widget.js',
  config: {
    apiBaseUrl: 'https://api.example.com',
    webBaseUrl: 'https://app.example.com',
    janusWsUrl: 'wss://webrtc.example.com',
  },
});

widget.on('initialized', () => {
  console.log('Widget ready');
});

widget.on('error', (payload) => {
  console.error('Widget error:', payload.message);
});
```

If you need to pin a specific build for testing/rollback, pass a version URL explicitly:

```typescript
const widget = await window.CallWidgetLoader!.load({
  scriptUrl: 'https://cdn.example.com/call-widget/v/1.2.3/call-widget.js',
  config: {
    apiBaseUrl: 'https://api.example.com',
    webBaseUrl: 'https://app.example.com',
    janusWsUrl: 'wss://webrtc.example.com',
  },
});
```

You can also preload the script first and `init` later — the config is just URLs, so it can be emitted as soon as the page loads:

```typescript
// On page load — preload the script without initializing
const widgetPromise = window.CallWidgetLoader!.load({
  scriptUrl: 'https://cdn.example.com/call-widget/latest/call-widget.js',
});

// Initialize with the infrastructure config
const widget = await widgetPromise;
widget.emit('init', {
  apiBaseUrl: 'https://api.example.com',
  webBaseUrl: 'https://app.example.com',
  janusWsUrl: 'wss://webrtc.example.com',
});
```

### Making a call

The `call` payload carries everything the call needs. The widget authenticates **per call** — on `call` it exchanges `apiKey` + `extAgentId` for a token via `/integration/auth`, uses it for that call's requests, and keeps no session afterwards. There is no separate login/logout step and no token lifecycle for the host to manage.

```typescript
widget.emit('call', {
  apiKey: 'dialer_api_9Fv8qwvtxglAXKzp6IXBC_fksdfjdkj', // backend API key
  extCustomerId: 123, // numeric CRM customer ID
  phoneNumber: '+1234567890', // E.164 format, optional
  extAgentId: 456, // numeric CRM agent ID
});
```

If authentication fails (e.g. a bad `apiKey`), the widget shows its error screen and emits an `error` event. The token lives only in memory for the duration of the call.

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

widget.on('error', (payload) => {
  console.error('Widget error:', payload.message);
});
```

### Dismissing the widget

Resets any active call and returns the widget to idle. The widget stays mounted, so `emit('call')` works again immediately without re-emitting `init` (the next call re-authenticates):

```typescript
widget.emit('dismiss');
```

## Events

**Inbound (host → widget):**

| Event     | Payload                                               | Description                                                      |
| --------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| `init`    | `{ apiBaseUrl, webBaseUrl, janusWsUrl }`              | Initialize widget with immutable infrastructure config (once)    |
| `call`    | `{ apiKey, extAgentId, extCustomerId, phoneNumber? }` | Open widget, authenticate for the call, and start the call flow  |
| `dismiss` | —                                                     | Reset to idle; widget stays mounted (next call re-authenticates) |

**Outbound (widget → host):**

| Event                   | Payload                            | When                                                                 |
| ----------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| `initialized`           | —                                  | Widget mounted and ready (emit `call` to start a call)               |
| `widget_opened`         | —                                  | Widget UI became visible                                             |
| `widget_dismissed`      | —                                  | Widget UI fully gone (all paths)                                     |
| `call_state_change`     | `{ state, clientId? }`             | Every state transition: calling → ringing → connected → ended/failed |
| `trunk_selected`        | `{ trunkId: string, trunkName }`   | User confirmed trunk selection                                       |
| `mic_toggled`           | `{ muted }`                        | User muted or unmuted the microphone                                 |
| `status_confirmed`      | `{ clientId, statusId, dialerId }` | User saved a post-call status                                        |
| `status_change_skipped` | `{ clientId }`                     | User skipped status change after call                                |
| `error`                 | `{ message }`                      | Any error occurred (including failed per-call authentication)        |

## Screen & call state flow

### Widget life flow

| Phase                            | `screen`       | `callState` | Set by                                               |
| -------------------------------- | -------------- | ----------- | ---------------------------------------------------- |
| Widget hidden                    | `idle`         | `Idle`      | `resetToIdle()` or initial state                     |
| Trunk selection                  | `sipTrunk`     | `Idle`      | `call` event handler in `init.ts`                    |
| Call initiating                  | `calling`      | `Calling`   | `startCall()` in `useStartCall.ts`                   |
| Destination ringing              | `calling`      | `Ringing`   | `useStartCall` Janus event (via `useJanusCall`)      |
| Call live                        | `calling`      | `Connected` | `useStartCall` Janus event (via `useJanusCall`)      |
| Call failed                      | `calling`      | `Failed`    | `useStartCall` Janus event — shows notification      |
| Status edit during live call     | `changeStatus` | `Connected` | `setScreen('changeStatus')` in `ExpandedCallBar.tsx` |
| Call ended, status not yet given | `changeStatus` | `Ended`     | `useStartCall` Ended handler                         |
| Status saved / skipped           | `idle`         | `Idle`      | `resetToIdle()`                                      |

> **`screen='calling'` + `callState=Idle`** is a special state produced **only by `mergePersisted()` in `widgetStore.ts` on page reload** during an active call. It is the signal for the auto-restart call by `useEffect` in `useStartCall.ts` and never appears in the normal live-session flow.

## Development

### Setup

```bash
npm install
cp .env.example .env
```

Fill `.env`:

| Variable            | Required for             | Purpose                                           |
| ------------------- | ------------------------ | ------------------------------------------------- |
| `HTTP_PORT`         | `npm run dev` (optional) | Dev-server port. Default `3030`.                  |
| `VITE_API_BASE_URL` | standalone dev page      | CRM backend base URL (passed into widget config). |
| `VITE_WEB_BASE_URL` | standalone dev page      | Web app base URL (passed into widget config).     |
| `VITE_JANUS_WS_URL` | standalone dev page      | Janus gateway WS URL.                             |

> `.env` is gitignored. `.env.example` is the template — keep it in sync when adding new variables.

### Option 1 — Standalone dev page (recommended for widget work)

```bash
npm run dev
```

Starts the Vite dev server (HMR) on `http://localhost:${HTTP_PORT:-3030}` and serves a built-in test page ([index.html](index.html) → [src/localDev.tsx](src/localDev.tsx)) that:

1. Emits `init` automatically with the URLs from `.env`.
2. Renders a form for the `call` payload (`apiKey`, `extAgentId`, `extCustomerId`, `phoneNumber`); submit emits `call`. The widget authenticates itself per call via `/integration/auth` using the form's `apiKey`/`extAgentId` — no dev login step needed.

### Option 2 — Embedded in a host app via loader (mirrors prod)

```bash
npm run preview
```

Builds to `dist/` and serves on **http://localhost:3005**. The host (e.g. crm-front in dev mode) loads:

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
  },
});
// then: widget.emit('call', { apiKey, extAgentId, extCustomerId, phoneNumber? })
```

After any widget change, re-run `npm run preview` (it rebuilds before serving) and refresh the host page.

### Without a CDN (testing)

Copy `dist/loader.js` and `dist/call-widget.js` into the host app's static folder and pass a same-origin `scriptUrl` (e.g. `/widget/call-widget.js`).

## CI/CD CDN deploy

GitLab pipeline deploys to CDN and publishes:

```text
call-widget/
  loader.js
  latest/
    call-widget.js
  v/
    <version>/
      loader.js
      call-widget.js
```

**Deploy triggers:**

| Trigger                                                 | `deploy_cdn` behavior                                                                   |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Push tag (`v1.1.0` etc.)                                | ✅ Auto-deploys on build success. Use `npm run version:*` and `git push --follow-tags`. |
| Pipeline triggered via web UI / API / scheduled trigger | ✅ Auto-deploys on build success.                                                       |
| Push to `main`                                          | ⏸ Manual — appears as a play button in the pipeline; click to deploy.                  |
| Push to feature branch                                  | ❌ No deploy job. Build-only.                                                           |
| Merge request                                           | ❌ No deploy job. Build-only.                                                           |

> **`/latest/` is shared across all customers using that URL.** Any deploy overwrites it. Don't trigger a web-UI pipeline from a feature branch unless you intend to ship that branch to all `/latest/` users. For local testing put build contents to the main app and create a feature-stand by separate MR.

Version is resolved in this order:

1. `WIDGET_VERSION` CI variable (manual override)
2. `CI_COMMIT_TAG`
3. `CI_COMMIT_SHORT_SHA`

Cache policy:

- `v/<version>/*` — `Cache-Control: public, max-age=31536000, immutable`
- `latest/*` and root `loader.js` — `Cache-Control: public, max-age=300, must-revalidate`

## Releases & versioning

The widget version comes from `package.json` and is embedded into the bundle as `__WIDGET_VERSION__` (logged to the console on load).

```bash
npm run version:patch   # 1.0.0 → 1.0.1
npm run version:minor   # 1.0.0 → 1.1.0
npm run version:major   # 1.0.0 → 2.0.0
```

Each command bumps `package.json`, creates a git commit, and creates an annotated git tag (`v1.0.1`, etc.) pointing at that bump commit.

**Release workflow:**

1. Make sure your changes are merged to `main` and your local `main` is up to date.
2. From `main`: `npm run version:minor` (or patch/major).
3. Push the bump commit **and** the tag:
   `git push && git push --tags` or `git push --follow-tags`
4. The tag pipeline auto-deploys to CDN — overwriting `/latest/` and creating an immutable `/v/<tag>/` URL. See [CI/CD CDN deploy](#cicd-cdn-deploy) for triggers.

> **Tag from `main` only.** Pushing a tag from any branch triggers an auto-deploy of that exact commit, overwriting `/latest/` for every customer. Treat tagging as the production-deploy action.

## Style Isolation

The widget renders inside a Shadow DOM — immune to host page CSS. The bundled CSS (imported as a `?inline` string in `index.ts`) is injected into the shadow root as a single `<style>` tag. The Roboto font is loaded via a Google Fonts `<link>` injected into `document.head` — `@font-face` rules at document scope are visible inside shadow trees across all browsers. The container uses `z-index: 1300`; host elements that must appear above it need a higher z-index.
