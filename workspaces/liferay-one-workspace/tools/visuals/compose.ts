/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * Composes several visuals into one page with a tab for each. A visual is
 * written as a standalone page, so composing it needs two kinds of isolation:
 *
 * - Its CSS is scoped to its tab, so that two visuals can both style .row or
 *   .tag. Each selector gets the tab's [data-tab] attribute in front of it.
 * - Its script runs in a function that receives a document scoped to its
 *   tab, so that two visuals can both use the id "search". getElementById
 *   and querySelector look inside the tab, a listener on the document
 *   listens on the tab, and a key listener fires only while the tab shows.
 *
 * A tab mounts the first time it opens, so a diagram measures itself while
 * it is visible.
 */

export interface IPart {
	data: unknown;
	id: string;
	label: string;
	params?: Record<string, unknown>;
	template: string;
}

const SHELL_STYLE = `
.layer-tabs { border-bottom: 1px solid var(--line); display: flex; flex-wrap: wrap; gap: 4px; }
.layer-tabs a { border-bottom: 2px solid transparent; color: var(--muted); font-weight: 600; margin-bottom: -1px; padding: 8px 12px; text-decoration: none; }
.layer-tabs a[aria-selected="true"] { border-bottom-color: var(--accent); color: var(--fg); }
.layer-panel { --wrap-width: 1280px; }
.layer-panel .wrap { padding: 0; }
.layer-panel header h1 { font-size: 24px; }
`;

const SHELL_SCRIPT = `
function scopedDocument(panel) {
	const overrides = {
		addEventListener(type, listener, options) {
			if (type.startsWith("key")) {
				window.addEventListener(type, event => { if (!panel.hidden) listener(event); }, options);
			}
			else {
				panel.addEventListener(type, listener, options);
			}
		},
		getElementById: id => panel.querySelector("#" + CSS.escape(id)),
		querySelector: selector => panel.querySelector(selector),
		querySelectorAll: selector => panel.querySelectorAll(selector),
	};
	return new Proxy(document, {
		get(target, key) {
			if (key in overrides) return overrides[key];
			const value = Reflect.get(target, key);
			return typeof value === "function" ? value.bind(target) : value;
		},
	});
}

function scopedAddEventListener(panel) {
	return (type, listener, options) => window.addEventListener(type, event => { if (!panel.hidden) listener(event); }, options);
}

const mounted = new Set();
const tabs = [...document.querySelectorAll(".layer-tabs a")];
let storedTab = null;
try { storedTab = localStorage.getItem(STORAGE_KEY); } catch {}

// A hash is "tab", "tab.section", or "tab.section~item": the tab to open,
// the id of a section inside it, and the item in that section to highlight.
// The item is base64url, because a hash keeps only letters, digits, and
// a few marks.

function reveal(hash) {
	const [place, token] = hash.split("~");
	const [id, anchor] = place.split(".");
	if (!ids.includes(id)) return false;
	activate(id);
	const panel = document.querySelector('.layer-panel[data-tab="' + id + '"]');
	const section = anchor ? panel.querySelector("#" + CSS.escape(anchor)) : null;
	const item = token ? vizDecode(token) : "";
	if (item) vizHighlight(section ?? panel, item).then(found => { if (!found && section) vizHighlight(section, ""); });
	else if (section) vizHighlight(section, "");
	try { history.replaceState(null, "", "#" + hash); } catch {}
	return true;
}

function activate(id) {
	for (const tab of tabs) tab.setAttribute("aria-selected", String(tab.dataset.tab === id));
	for (const panel of document.querySelectorAll(".layer-panel")) panel.hidden = panel.dataset.tab !== id;
	if (!mounted.has(id)) {
		mounted.add(id);
		const panel = document.querySelector('.layer-panel[data-tab="' + id + '"]');
		try { MOUNTS[id](scopedDocument(panel), scopedAddEventListener(panel)); }
		catch (error) { panel.insertAdjacentHTML("afterbegin", '<p class="note">This tab failed to load: ' + String(error.message).replace(/[<&]/g, "") + '</p>'); }
	}
	try { localStorage.setItem(STORAGE_KEY, id); } catch {}
	try { history.replaceState(null, "", "#" + id); } catch {}
}

for (const tab of tabs) tab.addEventListener("click", event => { event.preventDefault(); activate(tab.dataset.tab); });
const ids = tabs.map(tab => tab.dataset.tab);
if (!reveal(location.hash.slice(1))) activate(ids.includes(storedTab) ? storedTab : ids[0]);
window.addEventListener("hashchange", () => reveal(location.hash.slice(1)));
`;

/**
 * Returns the page that holds every part as a tab.
 */
export function compose(
	name: string,
	page: {description: string; title: string},
	parts: IPart[],
	theme: string
): string {
	const panels: string[] = [];
	const mounts: string[] = [];
	const styles: string[] = [];

	for (const part of parts) {
		const template = fill(part.template, part.data, part.params);

		const style = /<style>([\s\S]*?)<\/style>/.exec(template)?.[1] ?? '';
		const markup = template
			.slice(
				template.indexOf('</style>') + '</style>'.length,
				template.indexOf('<script>')
			)
			.trim();
		const script = /<script>([\s\S]*?)<\/script>/.exec(template)?.[1] ?? '';

		const scope = `[data-tab="${part.id}"]`;

		styles.push(scopeCSS(style, scope));
		panels.push(
			`<section class="layer-panel" data-tab="${part.id}" hidden>${markup}</section>`
		);
		mounts.push(
			`${JSON.stringify(part.id)}: function (document, addEventListener) {${script}}`
		);
	}

	return `<title>${page.title}</title>
${theme}<style>${SHELL_STYLE}${styles.join('\n')}</style>

<div class="wrap" style="--wrap-width:1760px">
	<header>
		<div class="eyebrow">${name} · workspace visuals</div>
		<h1>${page.title}</h1>
		<p>${page.description}</p>
	</header>

	<nav aria-label="${page.title}" class="layer-tabs">${parts
		.map(
			(part) =>
				`<a data-tab="${part.id}" href="#${part.id}">${part.label}</a>`
		)
		.join('')}</nav>

	${panels.join('\n\t')}
</div>

<script>
const STORAGE_KEY = ${JSON.stringify(`visuals-${name}-tab`)};
const MOUNTS = {${mounts.join(',\n')}};
${SHELL_SCRIPT}
</script>
`;
}

/**
 * Puts the data and the parameters into a template. A "</script>" inside a
 * string would end the inline script early, so every "<" in the JSON is
 * escaped. JSON.parse reads < back as "<".
 */
export function fill(
	template: string,
	data: unknown,
	params: Record<string, unknown> = {}
): string {
	const json = JSON.stringify(data).replace(/</g, '\\u003c');

	return template
		.replace('__DATA__', () => json)
		.replace(/__PARAMS__/g, () =>
			JSON.stringify(params).replace(/</g, '\\u003c')
		);
}

/**
 * Prefixes every selector in the CSS with the scope, inside @media blocks
 * too. :root, html, and body become the scope itself, so the custom
 * properties that a visual sets on :root apply to its tab.
 */
export function scopeCSS(css: string, scope: string): string {
	return _statements(css)
		.map((statement) => {
			const trimmed = statement.trim();

			if (!trimmed || trimmed.startsWith('/*')) {
				return statement;
			}

			const open = trimmed.indexOf('{');
			const prelude = trimmed.slice(0, open).trim();
			const body = trimmed.slice(open + 1, trimmed.lastIndexOf('}'));

			if (
				prelude.startsWith('@media') ||
				prelude.startsWith('@supports')
			) {
				return `${prelude} {${scopeCSS(body, scope)}}`;
			}

			if (prelude.startsWith('@')) {
				return trimmed;
			}

			return `${_selectors(prelude)
				.map((selector) => _scopeSelector(selector, scope))
				.join(', ')} {${body}}`;
		})
		.join('\n');
}

function _scopeSelector(selector: string, scope: string): string {
	const rootMatch = /^(:root|html|body)(.*)$/.exec(selector);

	if (rootMatch) {
		const rest = rootMatch[2];

		if (!rest) {
			return scope;
		}

		// :root[data-theme="dark"] or :root:not(...) is a theme condition on
		// the real root element, so the scope goes after it.

		if (rootMatch[1] === ':root' && /^[:[]/.test(rest)) {
			return `:root${rest} ${scope}`;
		}

		return `${scope}${rest}`;
	}

	return `${scope} ${selector}`;
}

/**
 * Splits a selector list at the commas that are not inside parentheses.
 */
function _selectors(prelude: string): string[] {
	const selectors: string[] = [];

	let depth = 0;
	let start = 0;

	for (let i = 0; i < prelude.length; i++) {
		if (prelude[i] === '(') {
			depth++;
		}
		else if (prelude[i] === ')') {
			depth--;
		}
		else if (prelude[i] === ',' && !depth) {
			selectors.push(prelude.slice(start, i).trim());
			start = i + 1;
		}
	}

	selectors.push(prelude.slice(start).trim());

	return selectors.filter(Boolean);
}

/**
 * Splits CSS into its top-level statements: comments, rules, and at-rules
 * with their blocks.
 */
function _statements(css: string): string[] {
	const statements: string[] = [];

	let depth = 0;
	let start = 0;

	for (let i = 0; i < css.length; i++) {
		if (css.startsWith('/*', i)) {
			const end = css.indexOf('*/', i) + 2;

			if (!depth) {
				statements.push(css.slice(start, i), css.slice(i, end));
				start = end;
			}

			i = end - 1;

			continue;
		}

		if (css[i] === '{') {
			depth++;
		}
		else if (css[i] === '}' && !--depth) {
			statements.push(css.slice(start, i + 1));
			start = i + 1;
		}
	}

	statements.push(css.slice(start));

	return statements;
}
