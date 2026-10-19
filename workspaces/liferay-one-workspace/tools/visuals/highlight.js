/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * Finds the element that shows an item and highlights it. A link from
 * Workspace Health names the item of an action, such as an endpoint or a
 * variable, and the page that opens calls vizHighlight with it. build.ts
 * puts this script on every page, after theme.css.
 *
 * An element whose whole text is the item wins, and the highlight goes to the
 * row that holds it. Otherwise the shortest row whose text holds the item
 * wins. Spaces and case do not count, so "POST /trial" matches a row that
 * shows the method and the path in separate cells.
 *
 * When the item is not found at first, the root gets a viz-find event with
 * the item, so a page can clear a filter that hides it.
 */

const VIZ_ROWS =
	'[data-item], button, details, li, tr, .config-card, .row, .tile';

function vizEncode(item) {
	return btoa(unescape(encodeURIComponent(item)))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

function vizDecode(token) {
	try {
		return decodeURIComponent(
			escape(atob(token.replace(/-/g, '+').replace(/_/g, '/')))
		);
	}
	catch {
		return '';
	}
}

function vizFind(root, item) {
	const key = vizNormalize(item);

	if (!key) {
		return null;
	}

	const visible = (element) => !element.closest('[hidden]');

	for (const element of root.querySelectorAll('[data-item]')) {
		if (vizNormalize(element.dataset.item) === key && visible(element)) {
			return element;
		}
	}

	for (const element of root.querySelectorAll('*')) {
		if (visible(element) && vizNormalize(element.textContent) === key) {
			const row = element.closest(VIZ_ROWS);

			return row && root.contains(row) ? row : element;
		}
	}

	let best = null;
	let bestLength = Infinity;

	for (const element of root.querySelectorAll(VIZ_ROWS)) {
		const text = vizNormalize(element.textContent);

		if (
			visible(element) &&
			text.includes(key) &&
			text.length < bestLength
		) {
			best = element;
			bestLength = text.length;
		}
	}

	return best;
}

/**
 * Highlights the item inside the root, or the root itself when the item is
 * empty. A page can render after it mounts, so the search tries again for
 * two seconds. Returns a promise of the element, or null.
 */
function vizHighlight(root, item) {
	return new Promise((resolve) => {
		let tries = 0;

		const attempt = () => {
			const element = item ? vizFind(root, item) : root;

			if (!element && ++tries < 20) {

				// A filter on the page can hide the item. The page listens
				// for viz-find to show it.

				if (tries === 1) {
					root.dispatchEvent(
						new CustomEvent('viz-find', {
							bubbles: true,
							detail: item,
						})
					);
				}

				setTimeout(attempt, 100);

				return;
			}

			if (element) {
				vizMark(element);
			}

			resolve(element);
		};

		attempt();
	});
}

function vizMark(element) {
	for (const previous of document.querySelectorAll('.viz-hit')) {
		previous.classList.remove('viz-hit');
	}

	for (
		let details = element.closest('details');
		details;
		details = details.parentElement?.closest('details')
	) {
		details.open = true;
	}

	element.classList.add('viz-hit');
	element.scrollIntoView({
		behavior: 'smooth',
		block:
			element.offsetHeight > window.innerHeight / 2 ? 'start' : 'center',
	});

	// The highlight stays until the reader clicks somewhere else.

	const clear = (event) => {
		if (!element.contains(event.target)) {
			element.classList.remove('viz-hit');
			document.removeEventListener('pointerdown', clear, true);
		}
	};

	setTimeout(() => document.addEventListener('pointerdown', clear, true), 0);
}

function vizNormalize(text) {
	return String(text ?? '')
		.replace(/\s+/g, '')
		.toLowerCase();
}
