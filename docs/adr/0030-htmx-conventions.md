# ADR-0030: HTMX conventions — vendored, always-200, OOB in template

## Status

Accepted

## Context

HTMX is the interactivity layer (ADR-0010). Three questions arose during implementation planning that each deserve a recorded decision because they affect every handler, every view, and the base layout.

### 1. CDN vs vendored

HTMX is typically loaded from a CDN (unpkg, cdnjs). However, this app runs on a Proxmox LXC behind Tailscale (ADR-0009). The LXC may not have reliable outbound internet access — a DNS blip or firewall change would leave the app non-functional. HTMX is a single ~15 KB file that changes infrequently.

### 2. HTTP status codes on responses

HTMX does not swap response content on 4xx/5xx status codes by default. This creates a problem: if a handler returns 422 for a validation error with an error partial, HTMX silently discards it. The workarounds are:

- Configure `htmx.config.responseHandling` to process specific status codes as swaps
- Return 200 for everything and let the HTML content communicate the outcome

We own both sides of the client/server contract. This is not a public REST API where status codes communicate semantics to unknown consumers — the only consumer is our own HTMX-driven frontend. The response body (HTML) already carries the full meaning.

### 3. OOB swap wrapping

HTMX 2.x out-of-band swaps (`hx-swap-oob`) allow a single response to update multiple page elements. OOB elements are extracted from the response before the primary swap. Two issues:

- Certain HTML elements (`<tr>`, `<td>`, `<li>`) cannot legally stand alone in the DOM — the browser's parser may mangle them before HTMX can extract them. Wrapping in `<template>` prevents this.
- A mix of primary content and bare OOB siblings is harder to read and reason about than a consistent wrapping convention.

HTMX 2.x also defaults `allowNestedOobSwaps` to `true`, meaning OOB-attributed elements inside the primary swap content are extracted too. This is dangerous when a template fragment is reused both standalone and embedded — the inner fragment gets unexpectedly removed.

## Decision

### Vendor HTMX

Download a pinned version of `htmx.min.js` into `public/htmx.min.js` and serve it as a static asset. No CDN dependency. The version is updated manually and deliberately, not automatically. The layout references `<script src="/htmx.min.js"></script>`.

### All HTMX responses return HTTP 200

Every handler that serves HTMX content returns 200, including:

- **Successful mutations** — return the updated partial or OOB swap
- **Expected errors** (validation failures, duplicate names, not-found) — return an error partial targeting the relevant error area
- **Unexpected errors** (unhandled exceptions caught by `onError`) — return an OOB swap targeting `#global-error`

The two exceptions where non-200 is appropriate:

- **API key middleware** returns 401 Unauthorized — consumed by the backup cron job (curl), not HTMX
- **Redirects** use 302 or the `HX-Redirect` header on a 200 response

No `htmx.config.responseHandling` customisation is needed. The default HTMX behaviour (swap on 200, ignore on error codes) works in our favour — we simply never return error codes to HTMX.

### OOB elements are always wrapped in `<template>`

Every out-of-band swap element in a response is wrapped in a `<template>` tag, regardless of whether the element technically requires it. The `<template>` wrapper is stripped by HTMX and never rendered.

Example response from a deposit handler:

```html
<!-- Primary swap: new transaction row prepended to list -->
<tr id="tx-42" ...>...</tr>

<!-- OOB: update balance display -->
<template>
  <span id="balance-display" hx-swap-oob="true">£7.50</span>
</template>

<!-- OOB: clear form error area -->
<template>
  <div id="deposit-errors" hx-swap-oob="true"></div>
</template>
```

Additionally, `allowNestedOobSwaps` is set to `false` via `<meta name="htmx-config">` in the base layout. OOB extraction only applies to response siblings, not descendants of the primary swap content.

## Consequences

- No external runtime dependency on CDN availability — the app works fully offline on the Tailnet
- HTMX version upgrades are deliberate — download the new file, test, commit
- Handlers never need to reason about which HTTP status code to return for HTMX consumers — it is always 200
- No `responseHandling` configuration to maintain or debug
- ADR-0013's OOB error swap pattern works without any special HTMX configuration
- Consistent `<template>` wrapping means developers never need to think about which elements require it — the rule is unconditional
- `allowNestedOobSwaps: false` prevents subtle bugs when template fragments are reused in different contexts
- The API key middleware (ADR-0026) is the only place that returns non-200 to a non-HTMX consumer — this boundary remains clean
