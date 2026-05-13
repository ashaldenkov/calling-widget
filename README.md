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

- **POST** `{apiBaseUrl}/widget/trunks-for-call` — body `{ apiKey, extAgentId, extCustomerId?, phoneNumberEnc?, search? }`, returns `{ customerInfo, trunks: [...] }` with all available SIP trunks. `phoneNumberEnc` is the host-supplied `phoneNumber` encrypted client-side via `encryptPhoneNumber()` before being sent. `search` is sent as an empty string by the widget; trunk filtering is performed client-side.
- **GET** `{apiBaseUrl}/customers/:customerId/in-call` — returns `{ inCall: boolean }`. Polled once before placing the call to block double-dialing.
- **POST** `{apiBaseUrl}/customers/:customerId/call` — body `{ trunkId: number }`, returns `{ bridgeId: string, targetUri: string }`.
- **PATCH** `{apiBaseUrl}/customers/:customerId/status` — body `{ statusId: string, comment?: string }`, returns updated customer status.
- **GET** `{apiBaseUrl}/statuses` — query params `{ page, perPage, search? }`, returns `{ items: StatusOption[], pageInfo: { ... } }` (paginated).

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
    payload: {
      apiKey: string;
      extCustomerId: number;
      phoneNumber?: string;
      extAgentId: number;
    },
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
  on(event: 'unauthorized', handler: () => void): void;
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

Then call `load()` when the auth token is available and pass widget bundle URL (usually `latest`):

```typescript
const widget = await window.CallWidgetLoader!.load({
  scriptUrl: 'https://cdn.example.com/call-widget/latest/call-widget.js',
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

If you need to pin a specific build for testing/rollback, pass a version URL explicitly:

```typescript
const widget = await window.CallWidgetLoader!.load({
  scriptUrl: 'https://cdn.example.com/call-widget/v/1.2.3/call-widget.js',
  config: {
    apiBaseUrl: 'https://api.example.com',
    webBaseUrl: 'https://app.example.com',
    janusWsUrl: 'wss://webrtc.example.com',
    authToken: session.token,
  },
});
```

If the auth token isn't available at page load, omit `config` from `load()` and call `init` once you have it:

```typescript
// On page load — preload the script without initializing
const widgetPromise = window.CallWidgetLoader!.load({
  scriptUrl: 'https://cdn.example.com/call-widget/latest/call-widget.js',
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
  apiKey: 'dialer_api_9Fv8qwvtxglAXKzp6IXBC_fksdfjdkj', // backend API key
  extCustomerId: 123, // numeric CRM customer ID
  phoneNumber: '+1234567890', // E.164 format, optional
  extAgentId: 456, // numeric CRM agent ID
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

widget.on('unauthorized', async () => {
  const token = await refreshAuthToken();
  widget.emit('update_token', { token });
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

| Event          | Payload                                               | Description                                 |
| -------------- | ----------------------------------------------------- | ------------------------------------------- |
| `init`         | `{ apiBaseUrl, webBaseUrl, janusWsUrl, authToken }`   | Initialize widget (first time only)         |
| `call`         | `{ apiKey, extCustomerId, phoneNumber?, extAgentId }` | Open widget and start a call flow           |
| `dismiss`      | —                                                     | Reset to idle; widget stays mounted         |
| `update_token` | `{ token }`                                           | Refresh auth token; pass `''` to invalidate |

**Outbound (widget → host):**

| Event                   | Payload                            | When                                                                        |
| ----------------------- | ---------------------------------- | --------------------------------------------------------------------------- |
| `initialized`           | —                                  | Widget mounted and ready                                                    |
| `widget_opened`         | —                                  | Widget UI became visible                                                    |
| `widget_dismissed`      | —                                  | Widget UI fully gone (all paths)                                            |
| `call_state_change`     | `{ state, clientId? }`             | Every state transition: calling → ringing → connected → ended/failed        |
| `trunk_selected`        | `{ trunkId: string, trunkName }`   | User confirmed trunk selection                                              |
| `mic_toggled`           | `{ muted }`                        | User muted or unmuted the microphone                                        |
| `status_confirmed`      | `{ clientId, statusId, dialerId }` | User saved a post-call status                                               |
| `status_change_skipped` | `{ clientId }`                     | User skipped status change after call                                       |
| `error`                 | `{ message }`                      | Any error occurred                                                          |
| `unauthorized`          | —                                  | Any API request returned 401. Host should refresh token via `update_token`. |

## Screen & call state flow

### Widget life flow

| Phase                            | `screen`       | `callState` | Set by                                               |
| -------------------------------- | -------------- | ----------- | ---------------------------------------------------- |
| Widget hidden                    | `idle`         | `Idle`      | `resetToIdle()` or initial state                     |
| Trunk selection                  | `sipTrunk`     | `Idle`      | `handleCall()` in index.ts                           |
| Call initiating                  | `calling`      | `Calling`   | `startCallWithTrunk()` — set together atomically     |
| Destination ringing              | `calling`      | `Ringing`   | `useCall` Janus event                                |
| Call live                        | `calling`      | `Connected` | `useCall` Janus event                                |
| Call failed                      | `calling`      | `Failed`    | `useCall` Janus event — shows notification           |
| Status edit during live call     | `changeStatus` | `Connected` | `setScreen('changeStatus')` in `ExpandedCallBar.tsx` |
| Call ended, status not yet given | `changeStatus` | `Ended`     | `useCall` Ended handler                              |
| Status saved / skipped           | `idle`         | `Idle`      | `resetToIdle()`                                      |

> **`screen='calling'` + `callState=Idle`** is a special state produced **only by `mergePersisted()` in `widgetStore.ts` on page reload** during an active call. It is the signal for the auto-restart call by `useEffect` in `useCall.ts` and never appears in the normal live-session flow.

## Development

### Setup

```bash
npm install
cp .env.example .env
```

Fill `.env`:

| Variable                 | Required for             | Purpose                                                                |
| ------------------------ | ------------------------ | ---------------------------------------------------------------------- |
| `HTTP_PORT`              | `npm run dev` (optional) | Dev-server port. Default `3030`.                                       |
| `VITE_API_BASE_URL`      | standalone dev page      | CRM backend base URL — used both for dev auto-login and widget config. |
| `VITE_WEB_BASE_URL`      | standalone dev page      | Web app base URL (passed into widget config).                          |
| `VITE_JANUS_WS_URL`      | standalone dev page      | Janus gateway WS URL.                                                  |
| `VITE_DEV_AUTH_EMAIL`    | standalone dev page      | Email used by `devLogin()` to fetch a JWT against `POST /auth`.        |
| `VITE_DEV_AUTH_PASSWORD` | standalone dev page      | Password for `devLogin()`.                                             |

> `.env` is gitignored. `.env.example` is the template — keep it in sync when adding new variables.

### Option 1 — Standalone dev page (recommended for widget work)

```bash
npm run dev
```

Starts the Vite dev server (HMR) on `http://localhost:${HTTP_PORT:-3030}` and serves a built-in test page ([index.html](index.html) → [src/localDev.tsx](src/localDev.tsx)) that:

1. Hits `POST {VITE_API_BASE_URL}/auth` with `VITE_DEV_AUTH_EMAIL` / `VITE_DEV_AUTH_PASSWORD` to obtain a JWT.
2. Emits `init` automatically with that token + URLs from `.env`.
3. Renders a form for the `call` payload.

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
    authToken: session.token,
  },
});
```

After any widget change, re-run `npm run preview` (it rebuilds before serving) and refresh the host page.

### Without a CDN (testing)

Copy `dist/loader.js` and `dist/call-widget.js` into the host app's static folder and pass a same-origin `scriptUrl` (e.g. `/widget/call-widget.js`).

## CI/CD CDN deploy

GitLab pipeline deploys to **DigitalOcean Spaces** (S3-compatible) and publishes:

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

### Infrastructure

The DigitalOcean Spaces bucket and CDN are provisioned via Terraform (`terraform-scalefinal/do/dialers`):

- Bucket ACL: `public-read`
- CORS: `*` (all origins allowed)
- CDN: enabled with 600 s TTL

Bucket credentials are stored in Vault automatically by Terraform at:

- mount: `dialers`
- path: `prod/_common/buckets/call-widget/terraform`
- fields: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET_NAME`, `AWS_REGION`, `AWS_ENDPOINT`

### CI variables

All variables have defaults in `.gitlab-ci.yml`. Override only if needed:

| Variable                 | Default                                      | Description                           |
| ------------------------ | -------------------------------------------- | ------------------------------------- |
| `VAULT_AUTH_ROLE`        | `dialers-gitlab`                             | GitLab JWT role in Vault              |
| `VAULT_MOUNT`            | `dialers`                                    | Vault KV mount                        |
| `VAULT_SECRET_PATH`      | `prod/_common/buckets/call-widget/terraform` | Vault secret path                     |
| `WIDGET_STORAGE_PREFIX`  | `call-widget`                                | S3 key prefix                         |
| `WIDGET_S3_BUCKET`       | from Vault                                   | Override bucket name                  |
| `WIDGET_S3_ENDPOINT_URL` | from Vault                                   | Override S3 endpoint                  |
| `AWS_DEFAULT_REGION`     | from Vault                                   | Override region                       |
| `WIDGET_CDN_BASE_URL`    | —                                            | When set, prints CDN URLs in job logs |

### Manual operations

- `deploy_cdn` — available as a manual button on `main` branch; runs automatically on tags and web/API triggers.
- `list_cdn_versions` — lists all uploaded `v/<version>` builds with CDN URLs.
- `promote_existing_version` — promotes any existing version to `latest` without rebuild (rollback / hot switch). Pass variable `SOURCE_VERSION=v1.2.3`.

Example CDN URLs (when `WIDGET_CDN_BASE_URL=https://cdn.example.com`):

- `https://cdn.example.com/call-widget/loader.js`
- `https://cdn.example.com/call-widget/latest/call-widget.js`
- `https://cdn.example.com/call-widget/v/1.2.3/call-widget.js`

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
