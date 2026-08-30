# Call Widget
**Standalone Call Widget** — a reusable voice-calling component that can be embedded into any web application with a simple script integration. It provides a complete calling experience, including call initiation, line selection, microphone controls, call status, and post-call customer status updates, while remaining fully isolated from the host application’s UI and styles. 

The widget is independently versioned and released through immutable CDN builds, making it safe to roll out, test, roll back, and reuse across products. Its lightweight, self-contained architecture separates the loader from the widget bundle, minimizing integration effort while keeping the component independently maintainable and deployable.

---

A Preact embeddable **calling widget** packaged as a public demo that runs with **no backend
and no telephony**. The widget ships as a CDN-style IIFE bundle that a host page injects via a
small loader; a mock **CRM host page** demonstrates it.

Because there's no server:

- "Calls" are simulated: after a short ring, the widget **captures your microphone and
  replays it to your headphones**. On the first call it shows a one-time notice explaining
  this. Use headphones to avoid feedback.

## Monorepo layout (npm workspaces)

```
widget/   # the widget package — builds dist/call-widget.js (IIFE) + dist/loader.js
demo/     # the mock CRM host app — loads the built widget via the loader
scripts/  # copy-widget-dist.mjs (copies widget/dist -> demo/public)
```

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
