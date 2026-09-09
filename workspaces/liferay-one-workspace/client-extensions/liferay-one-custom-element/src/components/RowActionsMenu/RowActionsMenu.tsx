/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import ClayDropDown from '@clayui/drop-down';
import ClayIcon from '@clayui/icon';
import {ClayTooltipProvider} from '@clayui/tooltip';
import classNames from 'classnames';
import {useState} from 'react';
import {Word, translate} from '~/i18n';

export type RowAction = {
	disabled?: boolean;
	label: Word;
	onClick?: () => void;
	title?: string;
};

type RowActionsMenuProps = {
	actions: RowAction[];
};

export default function RowActionsMenu({actions}: RowActionsMenuProps) {
	const [active, setActive] = useState(false);

	return (
		<ClayDropDown
			active={active}
			onActiveChange={setActive}
			trigger={
				<ClayButton
					aria-label={translate('actions')}
					borderless
					className="text-neutral-7"
					displayType="unstyled"
					onClick={(event) => event.stopPropagation()}
				>
					<ClayIcon symbol="ellipsis-v" />
				</ClayButton>
			}
		>
			<ClayTooltipProvider>
				<ClayDropDown.ItemList>
					{actions.map((action) => (
						<ClayDropDown.Item
							aria-disabled={action.disabled}
							className={classNames({
								disabled: action.disabled,
							})}
							key={action.label}
							onClick={(event) => {
								event.stopPropagation();

								if (action.disabled) {
									event.preventDefault();

									return;
								}

								setActive(false);
								action.onClick?.();
							}}
							title={action.title}
						>
							{translate(action.label)}
						</ClayDropDown.Item>
					))}
				</ClayDropDown.ItemList>
			</ClayTooltipProvider>
		</ClayDropDown>
	);
}
