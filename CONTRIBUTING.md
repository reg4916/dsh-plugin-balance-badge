# Contributing

Thanks for helping! This is a small, single-file plug-in; the whole surface is
`client.js`, so changes stay reviewable.

## Development

```sh
git clone https://github.com/reg4916/dsh-plugin-balance-badge.git
cd dsh-plugin-balance-badge
node test/contract.test.mjs      # stubbed page: slot registration, Remote flow, formatting, states
npm pack --dry-run               # what the package would ship
```

There is no build step: `client.js` is a plain browser artifact for the Harness module
table and `index.js` is an empty Host row.

## Ground rules

- **No imports of `@deepseek-ai/*` packages** in the browser half. React comes from the
  page module table (`require('react')`); everything else must come from the client
  context services (`ctx.slots`, `ctx.locale`, `ctx.remote.*`, `ctx.effect`).
- Keep visible text in the locale dictionaries (`en`, `ru`, `zh`) and styles on the
  `--dsw-*` theme tokens, so the pill follows the active theme and language.
- The plug-in must degrade, not throw: a failed read keeps the last known value and marks
  it stale; a missing account feature leaves the slot unaffected.
- Do not add telemetry, remote code, or extra network calls.

## Pull requests

- One logical change per PR, with a short description of what the user sees differently.
- Run the contract test before pushing; CI runs it too.
- If you change behaviour, update `README.md` (and the Russian section at the bottom).
- Releases: version bumps follow the `package.json` version and get a `vX.Y.Z` tag here,
  then `npm publish` from the maintainer's machine.

## Reporting bugs

Use the issue template — version of the plug-in, Harness version, what you expected and
what happened. Console output from the Harness client window helps a lot.
