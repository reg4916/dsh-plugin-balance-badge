// Contract test for the browser half: no browser, no real React.
// Loads client.js with a stubbed page, applies it with a fake client context and
// asserts registration, the account Remote flow, formatting and view states.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../client.js", import.meta.url), "utf8");

/* ---------- page stubs ---------- */
let definition = null;
globalThis.window = {
	__ModuleLoader__: {
		load(loaded) {
			definition = loaded;
		},
	},
	addEventListener() {},
	removeEventListener() {},
};
const styleTags = [];
globalThis.document = {
	documentElement: { dataset: { platform: "darwin" } },
	head: { appendChild(el) { styleTags.push(el); } },
	querySelector() { return null; },
	createElement() { return { dataset: {}, textContent: "", remove() {} }; },
	addEventListener() {},
	removeEventListener() {},
	visibilityState: "visible",
};

const React = {
	createElement(type, props, ...children) {
		return { type, props: props || {}, children: children.flat(Infinity) };
	},
	useSyncExternalStore(subscribe, getSnapshot) { return getSnapshot(); },
	useCallback(fn) { return fn; },
	useState(initial) { return [typeof initial === "function" ? initial() : initial, () => {}]; },
	useRef(value) { return { current: value }; },
	useEffect() {},
};
const fakeRequire = (id) => {
	if (id === "react") return React;
	throw new Error("unexpected require: " + id);
};

new Function("window", "document", "require", source)(globalThis.window, globalThis.document, fakeRequire);
assert.ok(definition, "module loader called");
assert.equal(definition.id, "dsh-plugin-balance-badge");

/* ---------- fake client context ---------- */
const registrations = [];
const dictionaries = [];
const effects = [];

function makeAccount(overrides = {}) {
	return {
		async getState() {
			return { ok: true, value: { status: "credential-stored", links: { topUpUrl: "https://platform.deepseek.com/topup" } } };
		},
		async getBalance() {
			return {
				ok: true,
				value: { status: "ready", value: [{ currency: "USD", balance: "17.43" }], bonusWallets: [{ currency: "USD", balance: "0" }] },
			};
		},
		...overrides,
	};
}
function makeContext(account) {
	return {
		remote: { account },
		effect(fn) {
			const dispose = fn();
			effects.push(typeof dispose === "function" ? dispose : () => {});
		},
		locale: {
			register(ns, dicts) {
				dictionaries.push({ ns, dicts });
				return () => {};
			},
			bind(ns) {
				const dict = dictionaries.find((d) => d.ns === ns)?.dicts || {};
				return (key, params) => {
					const raw = dict.en?.[key] ?? key;
					return params ? raw.replace(/\{(\w+)\}/g, (m, n) => (n in params ? String(params[n]) : m)) : raw;
				};
			},
			getSnapshot: () => ({ active: "en" }),
		},
		inject(deps, cb) {
			cb(this, {});
		},
		get: () => undefined,
		slots: {
			inject(key, cb) {
				cb();
				return () => {};
			},
			register(options, component) {
				registrations.push({ key: options.name, options, component });
				return () => {};
			},
		},
	};
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 20));
function renderTree(node) {
	const out = { text: [], classes: [], button: null, value: null };
	(function walk(n) {
		if (!n || typeof n !== "object") return;
		if (n.type === "button") {
			out.button = n;
			out.classes.push(n.props.className);
		}
		if (n.type === "span" && n.props.className === "dbb-chip__value") {
			out.value = n;
			out.text.push(n.children.join(""));
		}
		for (const child of n.children || []) walk(child);
	})(node);
	return out;
}

/* ---------- plugin contract ---------- */
const plugin = definition.factory(fakeRequire);
assert.deepEqual(plugin.inject, ["slots", "locale", "remote", "remote.account"]);
assert.equal(typeof plugin.apply, "function");

/* ---------- macOS: overlay pill, live balance ---------- */
const account = makeAccount();
plugin.apply(makeContext(account));
assert.equal(styleTags.length, 1, "stylesheet inserted once");
assert.equal(dictionaries.length, 1, "one dictionary registered");
assert.deepEqual(Object.keys(dictionaries[0].dicts).sort(), ["en", "ru", "zh"]);
assert.equal(registrations.length, 1, "one slot registration");
const overlay = registrations[0];
assert.equal(overlay.key, "shell.overlay");
assert.equal(overlay.options.id, "balance-badge");
const props = overlay.options.inject();
assert.equal(props.variant, "frame");
assert.equal(typeof props.t, "function");

await tick();
assert.equal(props.store.getSnapshot().kind, "ready");
assert.equal(props.store.getSnapshot().wallets[0].balance, "17.43");
assert.deepEqual(props.store.getSnapshot().bonusWallets, [], "zero bonuses filtered out");

const first = renderTree(overlay.component({ ...props }));
assert.ok(first.classes[0].includes("dbb-chip--frame"));
assert.deepEqual(first.text, ["$17.43"]);
assert.match(first.button.props.title, /Balance: \$17\.43/);
// 1.0.2: the tooltip carries relative freshness and the screen reader gets a live value.
assert.match(first.button.props.title, /Updated .+\(just now\)/);
assert.equal(first.value.props["aria-live"], "polite");
assert.equal(first.value.props["aria-atomic"], "true");
assert.equal(first.value.props["aria-busy"], "false");

/* ---------- formatting edge cases ---------- */
registrations.length = 0;
const edge = makeAccount({
	async getBalance() {
		return {
			ok: true,
			value: {
				status: "ready",
				value: [
					{ currency: "USD", balance: "0.005" },
					{ currency: "CNY", balance: "1234.567" },
				],
				bonusWallets: [{ currency: "USD", balance: "2.5" }],
			},
		};
	},
});
plugin.apply(makeContext(edge));
const edgeProps = registrations[0].options.inject();
await tick();
const edgeView = renderTree(registrations[0].component({ ...edgeProps }));
assert.deepEqual(edgeView.text, ["<$0.01 + \u00A51,234.56"], "multi-wallet, truncation and sub-cent rule");
assert.match(edgeView.button.props.title, /Granted balance: \$2\.50/);

/* ---------- signed-out and unavailable ---------- */
for (const [kind, view] of [
	["signed-out", { status: "signed-out" }],
	["unavailable", { status: "failed" }],
]) {
	registrations.length = 0;
	const accountState = makeAccount(kind === "signed-out" ? { async getState() { return { ok: true, value: view }; } } : {
		async getBalance() { return { ok: true, value: view }; },
	});
	plugin.apply(makeContext(accountState));
	const current = registrations[0].options.inject();
	await tick();
	assert.equal(current.store.getSnapshot().kind, kind);
	const rendered = renderTree(registrations[0].component({ ...current }));
	assert.deepEqual(rendered.text, ["--"]);
}

/* ---------- other shells: sidebar footer seat ---------- */
document.documentElement.dataset.platform = "linux";
registrations.length = 0;
plugin.apply(makeContext(makeAccount()));
assert.equal(registrations[0].key, "sidebar.footer.action");
const footerProps = registrations[0].options.inject();
assert.equal(footerProps.variant, "footer");
const rail = registrations[0].component({ ...footerProps, wide: false });
assert.ok(rail.props.className.includes("dbb-chip--rail"), "rail-aware rendering");

for (const dispose of effects) dispose();
console.log("contract tests passed");
