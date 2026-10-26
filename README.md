# dsh-plugin-balance-badge

[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-plugin-4D6BFE)](https://github.com/deepseek-ai/deepseek-harness)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Always-visible **DeepSeek account balance** for DeepSeek Harness. A small pill in
the top-left window strip of the sidebar shows the same *Topped-up balance* as
**Settings → Account**, and keeps itself up to date.

```
⬤ ⬤ ⬤        ⌄
   ●  ██ $16.59        ← the balance pill (macOS window strip)
   🐋 deepseek HARNESS
   ⊕ Новая сессия
```

## Features

- **Same number as Settings → Account** — reads the DeepSeek account Remote, not a
  separate/provider-specific API.
- **Refreshes itself**: on load, every 60 s while the page is visible, immediately when
  the window regains focus, and immediately when the stored account credential changes
  (sign-in, sign-out, grant rotation). Click the pill to refresh on demand.
- **Honest states**: `…` while loading, `--` when signed out / unavailable, and the last
  known amount plus a "stale" hint when a refresh fails — never a fake zero.
- **Bonus balance** is shown separately in the tooltip (only when positive), exactly like
  Settings → Account; it is never added to the topped-up amount.
- **Localized** (en / ru / zh) and styled with Harness theme tokens, so it follows the
  active theme and language.
- Pure presentation: no tools, no config, no Host service of its own.

## Requirements

- DeepSeek Harness `0.2.x` with the DeepSeek account feature available
  (the same feature that renders Settings → Account).
- On the macOS desktop build the pill sits in the window strip; on Web/Windows/Linux
  shells it is placed beside the Settings row at the sidebar foot instead.

## Install

### From the GUI (recommended, Desktop and Web)

Settings → **Plugins** → **Add plugin**, then paste one of:

```
github:reg4916/dsh-plugin-balance-badge
github:reg4916/dsh-plugin-balance-badge#v1.0.0
```

The Desktop app owns its profile, so this (or an agent using the `plugin_manager`
tool) is the supported path there.

### With an agent (plugin_manager tool)

Ask the agent to run `install_bundle` with the target
`github:reg4916/dsh-plugin-balance-badge`. It installs the package, selects the
bundle, and applies it through the profile's HMR when available.

### From the CLI (non-managed profiles)

```sh
dsh plugin --profile <profile> add github:reg4916/dsh-plugin-balance-badge
```

### Manual (development)

```sh
git clone https://github.com/reg4916/dsh-plugin-balance-badge.git
# in your profile package.json: "dsh-plugin-balance-badge": "link:/abs/path/to/clone"
# and append "dsh-plugin-balance-badge" to "dsh.profile.bundles"
ln -s /abs/path/to/clone <profile>/node_modules/dsh-plugin-balance-badge
```

Restart the app once if the profile's HMR is not running; afterwards client-plugin
edits are picked up by the running page.

## Uninstall

Remove the dependency entry and the bundle name from the profile `package.json`,
remove `node_modules/dsh-plugin-balance-badge` (and the lockfile importer entry if
you edited it by hand), then restart the app.

## How it works

| Piece | Detail |
|---|---|
| Data | `ctx.remote.account.getState()` (local credential read) → `ctx.remote.account.getBalance({ version, locale, timezoneOffsetSeconds })` only while signed in |
| Host chain | `accountController` → `deepseekAccount` → Platform `GET /api/v0/users/get_user_summary` (`normal_wallets` / `bonus_wallets`) |
| Placement (macOS) | frame slot `shell.overlay`, entry `balance-badge`, fixed at the window strip next to the traffic lights |
| Placement (other) | `sidebar.footer.action`, beside Settings (rail-aware) |
| Rendering | plain React from the page module table; no `@deepseek-ai/*` import |
| Refresh | one shared poller per plugin (single-flight, 15 s floor, stale results dropped, paused while hidden) |

The module is a browser artifact for the Harness module table
(`window.__ModuleLoader__.load({ id, factory })`) plus an empty Host row
(`index.js` = `export function apply() {}`).

## Development

```sh
node test/contract.test.mjs     # loads client.js with a stubbed page and asserts
                                # registration, live data flow, formatting and states
```

```
.
├── package.json         # dsh.bundle.patch + dsh.client manifest
├── cordis.patch.yml     # inserts the balance-badge row into the profile layer stack
├── index.js             # Host half (no Host service)
├── client.js            # browser half: dictionaries, stylesheet, poller, pill
├── locale/{en,ru,zh}.json
├── icon.svg
└── test/contract.test.mjs
```

Tuning: `POLL_MS` / `MIN_GAP_MS` in `client.js`.

## Русский

Плагин показывает баланс аккаунта DeepSeek маленькой «таблеткой» в верхней полосе окна
рядом с кнопками управления (на macOS) — тот же *Topped-up balance*, что в
**Настройки → Аккаунт**. Обновляется сам: при запуске, раз в 60 секунд, при возврате
фокуса в окно и при смене учётной записи; по клику — принудительное обновление, при
наведении — бонусный баланс и время обновления. Установка: Настройки → Плагины →
Add plugin → `github:reg4916/dsh-plugin-balance-badge`.

## License

[MIT](LICENSE)
