/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayDropDown from '@clayui/drop-down';
import ClayIcon from '@clayui/icon';
import {useState} from 'react';
import i18n, {translate} from '~/i18n';
import filterMemberOptions from '~/pages/MyAccount/ProjectMembers/utils/filterMemberOptions';

import '../../ProjectMembers.css';

import type {AccountMemberOption} from '~/pages/MyAccount/ProjectMembers/types';

type MemberDropDownProps = {
	onChange: (option: AccountMemberOption) => void;
	options: AccountMemberOption[];
	selectedName: string;
};

export default function MemberDropDown({
	onChange,
	options,
	selectedName,
}: MemberDropDownProps) {
	const [active, setActive] = useState(false);
	const [searchValue, setSearchValue] = useState('');

	const {matchCount, visibleOptions} = filterMemberOptions(
		options,
		searchValue
	);

	const handleActiveChange = (nextActive: boolean) => {
		if (!nextActive) {
			setSearchValue('');
		}

		setActive(nextActive);
	};

	const handleSelect = (option: AccountMemberOption) => {
		handleActiveChange(false);

		onChange(option);
	};

	return (
		<ClayDropDown
			active={active}
			className="project-permissions-role-dropdown"
			menuElementAttrs={{className: 'project-permissions-member-menu'}}
			onActiveChange={handleActiveChange}
			trigger={
				<button
					className="align-items-center d-flex form-control justify-content-between project-permissions-role-trigger"
					type="button"
				>
					<span>{selectedName || translate('select-a-member')}</span>

					<ClayIcon symbol="caret-bottom" />
				</button>
			}
		>
			<ClayDropDown.Search
				aria-label={translate('search')}
				onChange={setSearchValue}
				placeholder={translate('search')}
				value={searchValue}
			/>

			<ClayDropDown.ItemList>
				{!visibleOptions.length && (
					<ClayDropDown.Item disabled>
						{translate('no-results-found')}
					</ClayDropDown.Item>
				)}

				{visibleOptions.map((option) => (
					<ClayDropDown.Item
						key={option.userId}
						onClick={() => handleSelect(option)}
					>
						<span className="d-block text-truncate">
							{option.name}
						</span>

						<span className="d-block small text-neutral-7 text-truncate">
							{option.email}
						</span>
					</ClayDropDown.Item>
				))}

				{matchCount > visibleOptions.length && (
					<ClayDropDown.Item disabled>
						{i18n.sub(
							'showing-the-first-x-of-x-members-type-to-narrow-the-results',
							[String(visibleOptions.length), String(matchCount)]
						)}
					</ClayDropDown.Item>
				)}
			</ClayDropDown.ItemList>
		</ClayDropDown>
	);
}
