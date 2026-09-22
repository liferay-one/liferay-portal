/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

const productIcon = fragmentElement.querySelector(
	`#product-icon-${configuration.fragmentId}`
);
const productIconImg = fragmentElement.querySelector(
	`.product-icon-img-${configuration.fragmentId}`
);

if (productIcon && productIconImg) {
	productIconImg.src = productIcon.textContent;
}