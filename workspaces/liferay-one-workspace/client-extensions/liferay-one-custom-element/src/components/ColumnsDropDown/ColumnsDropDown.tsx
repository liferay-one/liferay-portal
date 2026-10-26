/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayButtonWithIcon} from '@clayui/button';
import {ClayDropDownWithItems} from '@clayui/drop-down';
import classNames from 'classnames';
import i18n from '~/i18n';

import './ColumnsDropDown.css';

export type ColumnOption = {
	id: string;
	label: string;
	visible: boolean;
};

type ColumnsDropDownProps = {
	className?: string;
	columns: ColumnOption[];
	onToggle: (id: string) => void;
};

export default function ColumnsDropDown({
	className,
	columns,
	onToggle,
}: ColumnsDropDownProps) {
	const visibleCount = columns.filter(({visible}) => visible).length;

	return (
		<ClayDropDownWithItems
			items={columns.map(({id, label, visible}) => ({
				checked: visible,
				disabled: visible && visibleCount === 1,
				onChange: () => onToggle(id),
				title: label,
				type: 'checkbox' as const,
			}))}
			trigger={
				<ClayButtonWithIcon
					aria-label={i18n.translate('columns')}
					className={classNames(
						className,
						'columns-drop-down-button'
					)}
					displayType="secondary"
					symbol="bars"
					title={i18n.translate('columns')}
				/>
			}
		/>
	);
}
