# ADR-0037: Setup features live behind a navigation menu, not on the home page

## Status

Accepted (amended by ADR-0038 — empty-state CTA carve-out)

## Context

The home page had grown to host three categories of feature:

- **Day-to-day**: the list of children with their balances.
- **Setup**: adding a child.
- **Maintenance**: export and restore (backup).

Two of those — adding a child, backup — are only needed during initial setup or occasional housekeeping. Once a parent has set up children, the add-child form sits on the home page they look at every day, adding visual noise without adding value. The backup section is even less day-to-day: it's a "before holiday" or "I'm worried about data loss" action, used maybe monthly. Both were taking up real estate on the surface a parent visits to check a balance or record a transaction.

This is a recurring pattern question — where do setup/maintenance features live in a UI that's otherwise focused on day-to-day use? The cleanest answer is "behind a navigation affordance that's discoverable but doesn't intrude on the main view". Mobile apps converge on the burger menu for exactly this purpose.

The app is mobile-first (the user views it on a phone 99.999% of the time) so the menu pattern needs to work well on a phone-sized viewport: tappable target sizes, slide-in rather than dropdown, easy to dismiss.

Two specific implementation choices are worth recording so future contributors don't relitigate them:

- **Plain forms vs HTMX for `POST /children`.** The original Add Child used HTMX with a partial swap to update the children list inline. Now that AddChild is its own page, there's no "stay on this page and update part of it" semantic — success means leaving for Home. A plain `<form method="post">` returning a 302 redirect on success (or re-rendering the AddChild page with the error on failure) is simpler than HTMX with `HX-Redirect`, matches what the backup flow already does, and removes the HTMX-driven OOB error swap machinery.
- **Where to render upload errors.** The previous restore-upload flow returned a standalone `Layout + RestoreError` page on failure. With Backup as its own surface, errors render inline on `BackupPage` itself (via an `uploadError` prop), so the user can immediately retry without backtracking. The confirm-time error path (rare, indicates form tampering) keeps the standalone error page because re-rendering the upload form there would imply "try again" semantics that don't apply.

## Decision

Setup-flavoured features move to dedicated pages reached via a navigation menu rendered as layout chrome:

- `/add-child` hosts the AddChild surface (one input, submit, cancel). Submission with a valid name redirects to Home via a plain HTTP 302. Validation errors re-render the AddChild page with the entered value preserved in the input and the message shown inline.
- `/backup` hosts the Backup surface (export link, restore upload form). Restore upload errors render inline on the same page; restore success follows the existing two-step confirmation flow (ADR-0023) ending in a 302 to Home.
- The home page (`/`) shrinks to just the children list. The empty state points users at the menu to add their first child.

The menu itself:

- Lives in `Layout` and is only rendered when `sessionName` is set (i.e. on authenticated pages).
- Slide-in panel from the left, 288px wide (or 80vw on very small screens, whichever is smaller).
- Z-index 50, above a z-40 backdrop with 40% opacity.
- Burger button in the header top-left opens it; a ✕ button inside the menu or a tap on the backdrop dismisses it.
- Toggle implemented as a small inline `onclick` handler that adds or removes a `-translate-x-full` Tailwind class on the menu and a `hidden` class on the backdrop. Six lines of DOM manipulation, no framework.
- Each menu item is a full-width link with `py-4 px-6` padding — well over the 44px tap-target guideline.
- Menu items currently: "Add child" (→ `/add-child`) and "Backup and restore" (→ `/backup`).

Future setup-flavoured features (settings, parent management, etc.) follow this pattern: dedicated page, menu link, no presence on Home.

## Consequences

- Home is focused on day-to-day use. The children list and balances are the whole content area.
- Add Child and Backup are now full-page surfaces in their own right, modeled as separate Allium surfaces (`AddChild`, `Backup`) in `pocket-money.allium`. The scenarios doc reflects this.
- The menu pattern is now the established home for any future setup/maintenance feature. New features pick a slot rather than each one debating placement.
- Adding a child requires one extra tap (open menu → tap "Add child") versus the previous home-page form. Acceptable cost — add-child is rare after initial setup.
- The Allium spec lost some content from Home and gained two new surfaces. ADR-0030 (HTMX conventions) is unaffected: HTMX still powers transaction handling on ChildDetail; the AddChild page just uses plain HTML form submission, which is appropriate for its no-partial-swap nature.
- The browser's HTML5 form `required` attribute prevents fully-empty submissions on the AddChild input. Whitespace-only names (" ") still reach the server, where `parseChildName` rejects them — both layers stay correct.
- One Playwright e2e quirk discovered: a `fixed inset-0 bg-black/40` element confuses Playwright's actionability checks (the backdrop is reported as "outside the viewport" for click purposes). The MenuCloseButtonDismissesMenu test covers the close-via-button path; backdrop-tap-to-dismiss works in the browser but isn't covered by an e2e test. If this becomes a real correctness concern later, options include switching to programmatic event dispatch in the test, or using a `<button>` element styled as a backdrop overlay.

## Amendment (ADR-0038)

ADR-0038's visual redesign reintroduces a single AddChild CTA on the Home empty state: when the children list is empty, a neon "Add the first kid" pill links directly to `/add-child` from the Home content area.

This is a deliberate, narrowly-scoped carve-out:

- The CTA appears **only** when there are zero children — i.e. on first run, before the menu has any purpose other than this one action.
- Once any child exists, the CTA disappears and the menu is the sole path to AddChild, exactly as this ADR specifies.
- The populated Home stays clean: no `+ new` shortcut, no inline form. The original "noise on the day-to-day view" concern is preserved.

In other words, ADR-0037's principle holds for steady-state Home; the empty state is a one-off bootstrap moment where pointing the user at the menu added friction without value. The menu still exists, still works, and still hosts AddChild on every authenticated surface.
