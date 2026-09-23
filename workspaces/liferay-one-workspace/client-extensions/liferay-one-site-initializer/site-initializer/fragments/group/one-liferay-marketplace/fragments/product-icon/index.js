/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

const liferayProductIcon = fragmentElement.querySelector(
	'#liferay-product-icon'
);
const liferayProductIconImg = fragmentElement.querySelector(
	'#liferay-product-icon-img'
);

if (liferayProductIcon && liferayProductIconImg) {
	liferayProductIconImg.src = liferayProductIcon.textContent;
}