/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayIcon from '@clayui/icon';
import classNames from 'classnames';
import {ReactNode} from 'react';
import {getIconSpriteMap} from '~/services/liferay/liferay';

type SelectFieldProps = {
	children: ReactNode;
	id: string;
	single?: boolean;
};

export default function SelectField({children, id, single}: SelectFieldProps) {
	return (
		<div className="position-relative">
			<ClayIcon
				className={classNames('select-icon', {
					'generate-activation-key-select-icon-single': single,
				})}
				key={`${id}-icon`}
				spritemap={getIconSpriteMap()}
				symbol="caret-bottom"
			/>

			{children}
		</div>
	);
}
