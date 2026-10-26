/**
 * dsh-plugin-balance-badge - browser half.
 *
 * Shows the live DeepSeek account balance as a small pill in the macOS window
 * strip of the sidebar (right of the traffic lights, left of the sidebar
 * collapse control), or beside the Settings row on other shells.
 *
 * Refreshes on mount, every 60 s while the page is visible, when the window
 * regains focus, and when the stored account credential changes. Click the
 * pill to refresh it immediately; hover for balance, granted (bonus) balance
 * and the last update time.
 *
 * Data comes from the same Remote the shipped Settings -> Account page uses:
 * ctx.remote.account.getState() (local host read) followed, only while signed
 * in, by ctx.remote.account.getBalance({ version, locale, timezoneOffsetSeconds }).
 *
 * The module is a plain browser artifact for the Harness module table: no
 * @deepseek-ai package is required, React comes from the page module table.
 */
window.__ModuleLoader__.load({
	id: "dsh-plugin-balance-badge",
	factory: (require) => {
		const React = require("react");
		const h = React.createElement;

		const NS = "plugin.balance-badge";
		const POLL_MS = 60_000;
		const MIN_GAP_MS = 15_000;
		const CLIENT_META_VERSION = "1.0.0";

		const en = {
			balance: "Balance",
			bonus: "Granted balance",
			loading: "Loading balance",
			refreshing: "Refreshing balance",
			signedOut: "Sign in to view the balance",
			unavailable: "Balance unavailable",
			error: "Could not read the balance",
			refreshHint: "Refresh balance",
			updatedAt: "Updated {time}",
			stale: "Showing the last known balance",
		};
		const ru = {
			balance: "Баланс",
			bonus: "Бонусный баланс",
			loading: "Загрузка баланса",
			refreshing: "Обновление баланса",
			signedOut: "Войдите, чтобы увидеть баланс",
			unavailable: "Баланс недоступен",
			error: "Не удалось получить баланс",
			refreshHint: "Обновить баланс",
			updatedAt: "Обновлено {time}",
			stale: "Показан последний известный баланс",
		};
		const zh = {
			balance: "余额",
			bonus: "赠金余额",
			loading: "正在加载余额",
			refreshing: "正在刷新余额",
			signedOut: "登录后查看余额",
			unavailable: "余额不可用",
			error: "无法获取余额",
			refreshHint: "刷新余额",
			updatedAt: "更新于 {time}",
			stale: "显示上次获取的余额",
		};

		const CSS_TAG = "dsh-plugin-balance-badge/balance-badge.css";
		const CSS = [
			".dbb-chip{position:fixed;top:11px;left:96px;z-index:30;display:inline-flex;align-items:center;gap:6px;box-sizing:border-box;height:24px;margin:0;padding:0 9px;border:.5px solid var(--dsw-alias-border-l3);border-radius:12px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);font-family:inherit;font-size:11.5px;font-weight:500;line-height:16px;letter-spacing:.1px;font-variant-numeric:tabular-nums;white-space:nowrap;cursor:pointer;-webkit-app-region:no-drag;transition:background-color .15s ease,color .15s ease,opacity .15s ease}",
			".dbb-chip:hover{background:var(--dsw-alias-interactive-bg-hover-solid,var(--dsw-alias-interactive-bg-hover));color:var(--dsw-alias-label-primary)}",
			".dbb-chip:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}",
			".dbb-chip--footer{position:static;height:28px;border-radius:var(--dsw-radius-md);background:transparent;width:100%;justify-content:flex-start;padding:0 10px}",
			".dbb-chip--footer.dbb-chip--rail{width:28px;padding:0;justify-content:center;border-color:transparent}",
			".dbb-chip__icon{flex:none;display:block;opacity:.85}",
			".dbb-chip__value{display:block;max-width:148px;overflow:hidden;text-overflow:ellipsis}",
			".dbb-chip--loading .dbb-chip__value,.dbb-chip--stale .dbb-chip__value{opacity:.55}",
			".dbb-chip--signed-out,.dbb-chip--error{color:var(--dsw-alias-label-tertiary)}",
			".dbb-chip__dot{flex:none;width:5px;height:5px;border-radius:50%;background:currentColor;opacity:.55}",
			"[data-sidebar-collapsed] .dbb-chip--frame{display:none}",
			"@media (prefers-reduced-motion:reduce){.dbb-chip{transition:none}}",
		].join("");

		function installStyles(ctx) {
			ctx.effect(() => {
				try {
					if (typeof document === "undefined" || document.head === undefined) return () => {};
					if (document.querySelector('style[data-plugin-css="' + CSS_TAG + '"]') !== null) return () => {};
					const tag = document.createElement("style");
					tag.dataset.plugin = "dsh-plugin-balance-badge";
					tag.dataset.pluginCss = CSS_TAG;
					tag.textContent = CSS;
					document.head.appendChild(tag);
					return () => {
						tag.remove();
					};
				} catch (error) {
					report("stylesheet", error);
				}
				return () => {};
			}, "balance-badge: stylesheet");
		}

		/** One console line per failure, never a thrown error from the plugin itself. */
		function report(stage, error) {
			try {
				console.error("[balance-badge] " + stage + ":", error && (error.stack || error.message || error));
			} catch {
				/* ignore */
			}
		}

		//#region balance formatting (mirror of the shipped Account page)
		function groupDigits(integer) {
			return integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		}
		/**
		 * Format one Platform wallet amount the way Settings -> Account does:
		 * two truncated decimals, "<" for positive sub-cent amounts, "-" for
		 * negative ones. Mirrors the shipped formatBalance without Big.js.
		 */
		function formatBalance(rawAmount, symbol) {
			let text = String(rawAmount == null ? "" : rawAmount).trim();
			if (/[eE]/.test(text)) {
				const numeric = Number(text);
				if (!Number.isFinite(numeric)) return symbol + "--";
				text = numeric.toFixed(2);
			}
			const negative = text.charAt(0) === "-";
			const abs = negative ? text.slice(1) : text;
			const dot = abs.indexOf(".");
			const intRaw = dot === -1 ? abs : abs.slice(0, dot);
			const fracRaw = dot === -1 ? "" : abs.slice(dot + 1);
			if (!/^\d*$/.test(intRaw) || !/^\d*$/.test(fracRaw) || (intRaw === "" && fracRaw === "")) return symbol + "--";
			const intPart = intRaw.replace(/^0+(?=\d)/, "") || "0";
			const frac2 = (fracRaw + "00").slice(0, 2);
			const isZero = intPart === "0" && !/[1-9]/.test(fracRaw);
			if (isZero) return symbol + "0.00";
			const subCent = intPart === "0" && !/[1-9]/.test(fracRaw.slice(0, 2));
			if (negative) return "-" + symbol + (subCent ? "0.01" : groupDigits(intPart) + "." + frac2);
			if (subCent) return "<" + symbol + "0.01";
			return symbol + groupDigits(intPart) + "." + frac2;
		}
		function walletSymbol(currency) {
			return currency === "CNY" ? "\u00A5" : "$";
		}
		function formatWallets(wallets) {
			if (!Array.isArray(wallets) || wallets.length === 0) return "";
			return wallets
				.map((wallet) => formatBalance(wallet && wallet.balance, walletSymbol(wallet && wallet.currency)))
				.join(" + ");
		}
		function positiveBonuses(bonusWallets) {
			if (!Array.isArray(bonusWallets)) return [];
			return bonusWallets.filter((wallet) => {
				const amount = Number(wallet && wallet.balance);
				return Number.isFinite(amount) && amount > 0;
			});
		}
		//#endregion

		//#region balance store
		/**
		 * Single shared poller so any number of consumers costs one Platform call.
		 * @param account - the account Remote namespace.
		 * @param ctx - plugin context that owns the timers.
		 */
		function createBalanceStore(account, ctx) {
			let state = { kind: "loading", refreshing: true };
			const listeners = new Set();
			let inFlight = null;
			let lastStart = 0;
			let generation = 0;
			let disposed = false;

			const publish = (next) => {
				state = next;
				for (const listener of listeners) {
					try {
						listener();
					} catch (error) {
						report("listener", error);
					}
				}
			};
			const clientMetadata = () => {
				let active = "en";
				try {
					active = ctx.locale.getSnapshot().active;
				} catch {
					active = "en";
				}
				return {
					version: CLIENT_META_VERSION,
					locale: active,
					timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
				};
			};
			const read = async () => {
				const stateResult = await account.getState();
				if (!stateResult || !stateResult.ok) throw (stateResult && stateResult.error) || new Error("account state failed");
				const view = stateResult.value;
				const links = (view && view.links) || {};
				if (!view || view.status !== "credential-stored") return { kind: "signed-out", links, refreshing: false };
				const balanceResult = await account.getBalance(clientMetadata());
				if (!balanceResult || !balanceResult.ok) throw (balanceResult && balanceResult.error) || new Error("account balance failed");
				const balance = balanceResult.value;
				if (balance === null) return { kind: "signed-out", links, refreshing: false };
				if (balance.status !== "ready") {
					return { kind: "unavailable", links, refreshing: false, updatedAt: state.updatedAt };
				}
				return {
					kind: "ready",
					wallets: Array.isArray(balance.value) ? balance.value : [],
					bonusWallets: positiveBonuses(balance.bonusWallets),
					links,
					refreshing: false,
					updatedAt: Date.now(),
				};
			};
			const refresh = (options) => {
				if (disposed) return Promise.resolve();
				if (inFlight !== null) return inFlight;
				const force = Boolean(options && options.force);
				const now = Date.now();
				if (!force && now - lastStart < MIN_GAP_MS) return Promise.resolve();
				lastStart = now;
				const id = ++generation;
				publish({ ...state, refreshing: true });
				const request = read()
					.then((next) => {
						if (!disposed && id === generation) publish(next);
					})
					.catch((error) => {
						if (!disposed && id === generation) {
							report("balance read", error);
							publish({
								kind: state.kind === "ready" ? "stale" : "error",
								wallets: state.wallets,
								bonusWallets: state.bonusWallets,
								links: state.links,
								updatedAt: state.updatedAt,
								refreshing: false,
								message: String((error && error.message) || error),
							});
						}
					})
					.finally(() => {
						if (inFlight === request) inFlight = null;
					});
				inFlight = request;
				return request;
			};
			const subscribe = (listener) => {
				listeners.add(listener);
				return () => {
					listeners.delete(listener);
				};
			};

			ctx.effect(() => {
				refresh({ force: true });
				const timer = setInterval(() => {
					if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
					refresh();
				}, POLL_MS);
				return () => {
					clearInterval(timer);
					disposed = true;
					generation++;
				};
			}, "balance-badge: poller");
			ctx.effect(() => {
				if (typeof window === "undefined") return () => {};
				const onFocus = () => refresh();
				const onVisibility = () => {
					if (document.visibilityState === "visible") refresh();
				};
				window.addEventListener("focus", onFocus);
				document.addEventListener("visibilitychange", onVisibility);
				return () => {
					window.removeEventListener("focus", onFocus);
					document.removeEventListener("visibilitychange", onVisibility);
				};
			}, "balance-badge: focus refresh");
			// A stored-credential change (login, logout, grant rotation) invalidates the chip.
			ctx.effect(() => {
				try {
					const remote = ctx.get("remote");
					if (!remote || typeof remote.$on !== "function") return () => {};
					const off = remote.$on("credentials/record-updated", () => {
						refresh({ force: true });
					});
					return typeof off === "function" ? off : () => {};
				} catch (error) {
					report("credential events", error);
					return () => {};
				}
			}, "balance-badge: credential events");

			return { getSnapshot: () => state, subscribe, refresh };
		}
		//#endregion

		//#region view
		function CoinIcon() {
			return h(
				"svg",
				{ className: "dbb-chip__icon", width: 12, height: 12, viewBox: "0 0 16 16", "aria-hidden": true, focusable: "false" },
				h("circle", { cx: 8, cy: 8, r: 6.1, fill: "none", stroke: "currentColor", strokeWidth: 1.3 }),
				h("path", {
					d: "M8 4.3v7.4M10.4 6.1c-.5-.6-1.3-.9-2.2-.9-1.2 0-2.1.6-2.1 1.5 0 2.1 4.5 1 4.5 3.2 0 1-1 1.7-2.4 1.7-1 0-1.8-.3-2.4-.9",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: 1.3,
					strokeLinecap: "round",
				})
			);
		}

		/** Translate through the seat bound in apply; the key is the fallback. */
		function makeText(t) {
			return (key, params) => {
				try {
					if (typeof t === "function") return t(key, params);
				} catch {
					/* fall through to the key */
				}
				return key;
			};
		}

		function describe(state, tr) {
			const lines = [];
			if (state.kind === "ready" || state.kind === "stale") {
				lines.push(tr("balance") + ": " + (formatWallets(state.wallets) || "--"));
				const bonus = formatWallets(state.bonusWallets);
				if (bonus !== "") lines.push(tr("bonus") + ": " + bonus);
				if (state.updatedAt) {
					try {
						const time = new Date(state.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
						lines.push(tr("updatedAt", { time }));
					} catch {
						/* skip the timestamp */
					}
				}
				if (state.kind === "stale") lines.push(tr("stale"));
			} else if (state.kind === "signed-out") {
				lines.push(tr("signedOut"));
			} else if (state.kind === "unavailable") {
				lines.push(tr("unavailable"));
			} else if (state.kind === "error") {
				lines.push(tr("error"));
				if (state.message) lines.push(String(state.message).slice(0, 160));
			} else {
				lines.push(state.refreshing ? tr("refreshing") : tr("loading"));
			}
			lines.push(state.refreshing ? tr("refreshing") : tr("refreshHint"));
			return lines.join(" \u00B7 ");
		}

		function chipText(state) {
			if (state.kind === "ready" || state.kind === "stale") return formatWallets(state.wallets) || "--";
			return state.kind === "loading" ? "\u2026" : "--";
		}

		function BalancePillInner(props) {
			const { store, variant } = props;
			const tr = makeText(props.t);
			const wide = props.wide !== false;
			const fallback = React.useState({ kind: "loading", refreshing: true })[0];
			const bound = store && typeof store.subscribe === "function" ? store : null;
			const state = bound ? React.useSyncExternalStore(bound.subscribe, bound.getSnapshot, bound.getSnapshot) : fallback;
			const refresh = React.useCallback(() => {
				if (bound) bound.refresh({ force: true });
			}, [bound]);
			const modifier = state.kind === "ready" ? "" : " dbb-chip--" + state.kind;
			const classes =
				"dbb-chip" +
				(variant === "footer" ? " dbb-chip--footer" : " dbb-chip--frame") +
				(variant === "footer" && !wide ? " dbb-chip--rail" : "") +
				modifier;
			const tooltip = describe(state, tr);
			const showText = !(variant === "footer" && !wide);
			return h(
				"button",
				{
					type: "button",
					className: classes,
					title: tooltip,
					"aria-label": tooltip,
					onClick: refresh,
					"data-plugin-balance-badge": variant,
				},
				h(CoinIcon),
				showText ? h("span", { className: "dbb-chip__value" }, chipText(state)) : null,
				state.refreshing && showText ? h("span", { className: "dbb-chip__dot" }) : null
			);
		}

		/** Render guard: a crashed seat degrades to a placeholder pill, never a blank spot. */
		function BalancePill(props) {
			try {
				return BalancePillInner(props);
			} catch (error) {
				report("render", error);
				return h(
					"button",
					{
						type: "button",
						className: "dbb-chip dbb-chip--frame dbb-chip--error",
						title: "balance-badge: render error",
						"data-plugin-balance-badge": "error",
					},
					h(CoinIcon),
					h("span", { className: "dbb-chip__value" }, "--")
				);
			}
		}
		//#endregion

		return {
			inject: ["slots", "locale", "remote", "remote.account"],
			/**
			 * Register dictionaries and mount the balance surface for this platform.
			 * @param ctx - client plugin context.
			 */
			apply(ctx) {
				try {
					installStyles(ctx);
					ctx.effect(
						() =>
							ctx.locale.register(NS, {
								en,
								ru,
								zh,
							}),
						"balance-badge: dictionaries"
					);
					const t = ctx.locale.bind(NS);
					const account = ctx.remote.account;
					const store = createBalanceStore(account, ctx);

					let platform = "";
					try {
						platform = String(document.documentElement.dataset.platform || "");
					} catch {
						platform = "";
					}

					if (platform === "darwin") {
						// Frame-wide seat: additive and click-through until an entry opts in.
						ctx.slots.inject("shell.overlay", () =>
							ctx.slots.register(
								{
									name: "shell.overlay",
									id: "balance-badge",
									order: 40,
									inject: () => ({ store, variant: "frame", t }),
								},
								BalancePill
							)
						);
					} else {
						// Shells without a window strip over the sidebar: sit beside Settings.
						ctx.slots.inject("sidebar.footer.action", () =>
							ctx.slots.register(
								{
									name: "sidebar.footer.action",
									id: "balance-badge",
									order: 5,
									label: () => makeText(t)("balance"),
									inject: () => ({ store, variant: "footer", t }),
								},
								BalancePill
							)
						);
					}
				} catch (error) {
					report("activation", error);
				}
			},
		};
	},
});
