# Changelog

All notable changes to this plugin are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] — 2026-10-29

### Added

- **Relative freshness in the tooltip** — `Updated 11:34 PM (5 min ago)` instead of a bare
  timestamp, so a glance tells you whether the number is live. The label re-renders every
  30 s and never spends a request.
- **Screen-reader support** — the amount is a polite live region (`aria-live`,
  `aria-atomic`) and reports `aria-busy` while a read is in flight.

### Changed

- **Adaptive polling** — a failed read backs off 15 s → 30 s → 60 s → 120 s instead of
  retrying at the normal 60 s cadence; the first success resets the streak.
- **Quieter console** — one `console.error` per failure streak (plus a single recovery
  line), not one per retry.
- Catalog/Plugin Market listing added to the README; the pin example now points at v1.0.2.

## [1.0.1] — 2026-10-26

### Added

- Published to npm as `dsh-plugin-balance-badge@1.0.1` — the prebuilt install path the
  catalog and Plugin Market point at.
- README screenshot, en/ru/zh dictionaries, contract test without a browser.

## [1.0.0] — 2026-10-26

### Added

- First tagged release: the balance pill in the macOS window strip, the sidebar-footer
  fallback on Web/Windows/Linux shells, balance formatting that mirrors Settings → Account,
  bonus wallet in the tooltip, and 60 s polling with visibility, focus and credential
  refresh.
