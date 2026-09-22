/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

const isDebug = configuration.enableDebug;
if (fragmentNamespace) {
  const elementId = fragmentElement.id.replace('fragment-', '');
  const iconSpan = fragmentElement.querySelector(
    `#icon-${elementId} span.svg-icon`
  );
  const button = fragmentElement.querySelector(`#button-${elementId}`);
  const textContent = button.textContent?.trim();
  if (isDebug) {
    console.debug('elementId', elementId);
    console.debug('iconSpan', iconSpan);
    console.debug('button', button);
    console.debug('textContent', textContent);
  }

  if (button) {
    button.innerHtml = textContent;
		if (configuration.iconPosition === 'right') {
			iconSpan.classList.add("svg-right");
			button.appendChild(iconSpan);
		} else {
			iconSpan.classList.add("svg-left");
			button.insertBefore(iconSpan, button.firstChild);
		}
  }
} else {
  if (isDebug) console.debug('fragmentNamespace is undefined');
}