/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import filterMemberOptions from '~/pages/MyAccount/ProjectMembers/utils/filterMemberOptions';

type MemberRow = {
	email: string;
	isNew: boolean;
	name: string;
	removed: boolean;
};

export function getVisibleMemberRows<Member extends MemberRow>(
	members: Member[],
	searchValue: string,
	visibleCount: number
) {
	const indexedMembers = members
		.map((member, index) => ({
			email: member.email,
			index,
			member,
			name: member.name,
		}))
		.filter(({member}) => !member.removed);

	const savedMembers = indexedMembers.filter(({member}) => !member.isNew);

	const {matchCount, visibleOptions} = filterMemberOptions(
		savedMembers,
		searchValue,
		visibleCount
	);

	return {
		hiddenCount: matchCount - visibleOptions.length,
		rows: [
			...visibleOptions,
			...indexedMembers.filter(({member}) => member.isNew),
		].map(({index, member}) => ({index, member})),
		savedMemberCount: savedMembers.length,
	};
}

export default getVisibleMemberRows;
