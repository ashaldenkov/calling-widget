# Call Widget — backendless demo

A Preact embeddable **calling widget** packaged as a public demo that runs with **no backend
and no telephony**. The widget ships as a CDN-style IIFE bundle that a host page injects via a
small loader; a mock **CRM host page** demonstrates it.

Because there's no server:

- The host passes **customer data** and the **trunk list** to the widget (via the `call`
  event).
- "Calls" are simulated: after a short ring, the widget **captures your microphone and
  replays it to your headphones**. On the first call it shows a one-time notice explaining
  this. Use headphones to avoid feedback.
- **Statuses** are in-memory; a saved status is reflected back to the host page.
- **Country flags** load on demand from a CDN (not bundled).

## Monorepo layout (npm workspaces)

```
widget/   # the widget package — builds dist/call-widget.js (IIFE) + dist/loader.js
demo/     # the mock CRM host app — loads the built widget via the loader
scripts/  # copy-widget-dist.mjs (copies widget/dist -> demo/public)
```

All dependencies are hoisted to the root `node_modules`; `widget/node_modules` and
`demo/node_modules` only hold Vite's local cache.

## Scripts (run from the repo root)

| Command | What it does |
| --- | --- |
| `npm install` | Install all workspaces |
| `npm run dev:demo` | Build the widget, copy it into `demo/public`, start the CRM host (http://localhost:5173) |
| `npm run build:widget` | Build `widget/dist/call-widget.js` + `loader.js` |
| `npm run build:demo` | Full static demo site → `demo/dist/` |
| `npm run analyze` | Build the widget with a bundle treemap → `widget/dist/stats.html` |
| `npm -w widget test` | Widget unit tests (Vitest) |
| `npm run lint` | Lint the widget |
| `npm run deploy` | Build the demo and publish `demo/dist` to the `gh-pages` branch |

## Deploy to GitHub Pages

Publishing uses the [`gh-pages`](https://www.npmjs.com/package/gh-pages) package (no GitHub
Actions workflow):

```bash
npm run deploy      # runs build:demo, then `gh-pages -d demo/dist`
```

One-time repo setup: **Settings → Pages → Build and deployment → Deploy from a branch →
branch `gh-pages` / `/ (root)`**. The demo uses a relative `base`, so it works at any project
subpath (`https://<user>.github.io/<repo>/`).

## Widget integration contract

See [`widget/README.md`](widget/README.md) for the widget's own docs. In this demo build the
host talks to the widget through the `window.CallWidget` event bus (or the loader):

- `init` → `{ theme?: { mode?, primaryColor? }, webBaseUrl? }`
- `call` → `{ customer, trunks, statuses?, phoneNumber? }`
- `customize` → `{ mode?, primaryColor? }` (live light/dark + accent)
- `dismiss`

Outbound: `initialized`, `widget_opened`, `widget_dismissed`, `call_state_change`,
`trunk_selected`, `mic_toggled`, `status_confirmed` (`{ customerId, statusId, status }`),
`status_change_skipped`, `error`.
