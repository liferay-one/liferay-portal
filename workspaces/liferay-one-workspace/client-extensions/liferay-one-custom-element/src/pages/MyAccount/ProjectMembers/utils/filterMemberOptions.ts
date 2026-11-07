/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

const MEMBER_OPTIONS_LIMIT = 50;

export function filterMemberOptions<
	Option extends {email: string; name: string},
>(options: Option[], searchValue: string, limit = MEMBER_OPTIONS_LIMIT) {
	const searchTerm = searchValue.trim().toLowerCase();

	const matches = searchTerm
		? options.filter(
				({email, name}) =>
					name.toLowerCase().includes(searchTerm) ||
					email.toLowerCase().includes(searchTerm)
			)
		: options;

	return {
		matchCount: matches.length,
		visibleOptions: matches.slice(0, limit),
	};
}

export default filterMemberOptions;
