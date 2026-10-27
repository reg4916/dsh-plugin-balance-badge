# Security policy

## Reporting a vulnerability

Please report security issues **privately**, not in a public issue:

- use GitHub's [private vulnerability reporting](https://github.com/reg4916/dsh-plugin-balance-badge/security/advisories/new)
  (Security → Advisories → Report a vulnerability), or
- e-mail the maintainer at the address on the [GitHub profile](https://github.com/reg4916).

Please include the affected version, the Harness version, and a minimal reproduction.
You can expect an acknowledgement within a few days.

## Scope

`dsh-plugin-balance-badge` is a client-side plug-in for DeepSeek Harness. It:

- reads the account balance through the Host's own `remote.account` service — the same
  call the shipped Settings → Account page uses; it never talks to Platform directly
  and never sees the account credential;
- stores nothing: no telemetry, no analytics, no cookies, no local persistence;
- makes no network requests of its own and loads no remote code — the browser half is a
  single static file served from this package, with React taken from the page module table.

Reports that are most useful: anything that could leak the balance or account state to a
third party, execution of untrusted code, or a way for a plug-in row to affect other
Harness plug-ins beyond its own slot occupant.
