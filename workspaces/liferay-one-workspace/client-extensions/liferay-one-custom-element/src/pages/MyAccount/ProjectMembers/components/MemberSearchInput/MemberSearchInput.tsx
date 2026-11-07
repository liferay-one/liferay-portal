/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayInput} from '@clayui/form';
import ClayIcon from '@clayui/icon';
import {translate} from '~/i18n';

import '../../ProjectMembers.css';

type MemberSearchInputProps = {
	onChange: (value: string) => void;
	value: string;
};

export default function MemberSearchInput({
	onChange,
	value,
}: MemberSearchInputProps) {
	return (
		<ClayInput.Group className="project-permissions-search">
			<ClayInput.GroupItem>
				<ClayInput
					aria-label={translate('search')}
					className="input-group-inset input-group-inset-after"
					onChange={(event) => onChange(event.target.value)}
					placeholder={translate('search')}
					type="text"
					value={value}
				/>

				<ClayInput.GroupInsetItem after tag="span">
					<ClayIcon className="text-neutral-7" symbol="search" />
				</ClayInput.GroupInsetItem>
			</ClayInput.GroupItem>
		</ClayInput.Group>
	);
}
