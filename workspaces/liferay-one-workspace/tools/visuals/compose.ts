/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * Puts visuals inside a page that has its own tabs. A visual is written as a
 * standalone page, so putting it inside another needs two kinds of
 * isolation:
 *
 * - Its CSS is scoped to its section, so that two visuals can both style .row
 *   or .tag. Each selector gets the section's [data-part] attribute in front
 *   of it.
 * - Its script runs in a function that receives a document scoped to its
 *   section, so that two visuals can both use the id "search".
 *   getElementById and querySelector look inside the section, a listener on
 *   the document listens on the section, and a key listener fires only while
 *   the section shows.
 *
 * A section mounts the first time it shows, so a diagram measures itself
 * while it is visible.
 *
 * In a comparison, a section whose data has __changes starts with a change
 * bar: the counts of the added, changed, and removed items, the removed
 * items, and an Only Changed switch. The switch sends a viz-only-changed
 * event to the section, and the template reads it with vizOnlyChanged.
 */

import {forLayer} from './changes.ts';

import type {IChanges} from './lib.ts';

export interface IPart {
	data: unknown;
	id: string;
	label: string;
	params?: Record<string, unknown>;
	template: string;
}

const PANEL_STYLE = `
.layer-panel .wrap { max-width: none; padding: 0; }
.layer-panel header h1 { font-size: 24px; }
`;

/**
 * Runs the script of a part against its panel. A key listener fires only
 * while no hidden element holds the panel.
 */
const SCOPE_SCRIPT = `
function scopedDocument(panel) {
	const overrides = {
		addEventListener(type, listener, options) {
			if (type.startsWith("key")) {
				window.addEventListener(type, event => { if (!panel.closest("[hidden]")) listener(event); }, options);
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
	return (type, listener, options) => window.addEventListener(type, event => { if (!panel.closest("[hidden]")) listener(event); }, options);
}

document.addEventListener("click", event => {
	const button = event.target.closest("[data-viz-only-changed]");
	if (!button) return;
	const bar = button.closest(".viz-changes");
	const on = bar.dataset.on !== "true";
	bar.dataset.on = String(on);
	button.setAttribute("aria-pressed", String(on));
	bar.dispatchEvent(new CustomEvent("viz-only-changed", {bubbles: true, detail: on}));
});

function mountPart(id, panel) {
	try { MOUNTS[id](scopedDocument(panel), scopedAddEventListener(panel)); }
	catch (error) { panel.insertAdjacentHTML("afterbegin", '<p class="note">This tab failed to load: ' + String(error.message).replace(/[<&]/g, "") + '</p>'); }
}
`;

/**
 * Puts groups of parts into a page that has its own tabs. The page marks
 * where each group goes with <!-- parts:group -->, and where the shared
 * style and script go with <!-- parts:head -->. Each part is a section with
 * a data-part attribute and a data-label, hidden until the page shows it,
 * and the page mounts it with mountPart(id, section) the first time.
 */
export function embed(page: string, groups: Record<string, IPart[]>): string {
	const all = _render(Object.values(groups).flat());

	let html = page.replace(
		'<!-- parts:head -->',
		() =>
			`<style>${PANEL_STYLE}${all.styles}</style>\n<script>\nconst MOUNTS = {${all.mounts}};\n${SCOPE_SCRIPT}</script>`
	);

	for (const [group, parts] of Object.entries(groups)) {
		html = html.replace(`<!-- parts:${group} -->`, () =>
			_render(parts, 'data-part').panels.join('\n\t\t')
		);
	}

	return html;
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

function _render(parts: IPart[]) {
	const mounts: string[] = [];
	const panels: string[] = [];
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

		styles.push(scopeCSS(style, `[data-part="${part.id}"]`));
		panels.push(
			`<section class="layer-panel" data-label="${part.label.replace(/"/g, '&quot;')}" data-part="${part.id}" hidden>${_changesBar(part.data, part.params?.layer as string | undefined)}${markup}</section>`
		);
		mounts.push(
			`${JSON.stringify(part.id)}: function (document, addEventListener) {${script}}`
		);
	}

	return {mounts: mounts.join(',\n'), panels, styles: styles.join('\n')};
}

/**
 * Returns the change bar of a section in a comparison, or nothing at a point
 * in time. Null changes mean that the extractor failed at the base. A section
 * of a layer counts only the items of that layer.
 */
function _changesBar(data: unknown, layer?: string): string {
	if (!data || typeof data !== 'object' || !('__changes' in data)) {
		return '';
	}

	const allChanges = (data as {__changes: IChanges | null}).__changes;

	const changes =
		allChanges && layer ? forLayer(allChanges, layer) : allChanges;

	if (!changes) {
		return '<div class="viz-changes" data-on="false"><b>This comparison</b><span class="muted">The extractor failed at the base, so this section shows the head with no changes marked.</span></div>';
	}

	const {added, changed, removed} = changes.counts;

	const esc = (text: string) =>
		text.replace(/[&<>"]/g, (character) => `&#${character.charCodeAt(0)};`);

	if (!added && !changed && !removed) {
		return '<div class="viz-changes" data-on="false"><b>This comparison</b><span class="muted">No item in this section changed.</span></div>';
	}

	const on = added + changed > 0;

	const kinds = Object.entries(changes.kinds)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(
			([kind, count]) =>
				`${esc(kind)}: ${[
					count.added && `${count.added} new`,
					count.changed && `${count.changed} changed`,
					count.removed && `${count.removed} removed`,
				]
					.filter(Boolean)
					.join(', ')}`
		)
		.join(' · ');

	return `<div class="viz-changes" data-on="${on}"><b>This comparison</b><span><span class="chg chg-added">${added} new</span><span class="chg chg-changed">${changed} changed</span><span class="chg chg-removed">${removed} removed</span></span><span class="muted">${kinds}</span>${on ? `<button aria-pressed="true" class="btn" data-viz-only-changed type="button">Only changed</button>` : ''}${
		changes.removed.length
			? `<details><summary>${removed} removed</summary><div class="chips">${changes.removed
					.map(
						(item) =>
							`<span title="${esc(`${item.kind}: ${item.label}`)}">${esc(item.label.length > 90 ? `${item.label.slice(0, 89)}…` : item.label)}</span>`
					)
					.join('')}</div></details>`
			: ''
	}</div>`;
}
