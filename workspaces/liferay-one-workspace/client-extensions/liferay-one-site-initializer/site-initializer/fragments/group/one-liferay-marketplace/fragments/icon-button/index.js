/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

if (fragmentNamespace) {
	const elementId = fragmentElement.id.replace('fragment-', '');

	const button = fragmentElement.querySelector(`#button-${elementId}`);
	const iconSpan = fragmentElement.querySelector(
		`#icon-${elementId} span.svg-icon`
	);

	if (button && iconSpan) {
		if (configuration.iconPosition === 'right') {
			iconSpan.classList.add('svg-right');

			button.appendChild(iconSpan);
		}
		else {
			iconSpan.classList.add('svg-left');

			button.insertBefore(iconSpan, button.firstChild);
		}
	}
}