/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

const div = fragmentElement.querySelector('liferay-section-container');

if (div?.id) {
	div.id = div.id
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^a-zA-Z0-9\-_]/g, '');
}