/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayButtonWithIcon} from '@clayui/button';
import {ClayDropDownWithItems} from '@clayui/drop-down';
import {ClayInput} from '@clayui/form';
import ClayIcon from '@clayui/icon';
import ClayLabel from '@clayui/label';
import classNames from 'classnames';
import {ComponentProps, forwardRef, useState} from 'react';
import i18n from '~/i18n';

import {
	getActiveValueCount,
	toggleFilterValue,
} from '../../utils/inspectorFilterUtils';

import type {Word} from '~/i18n';

import type {
	InspectorFilter,
	InspectorFilterOption,
} from '../../utils/inspectorFilterUtils';

type DropDownItems = ComponentProps<typeof ClayDropDownWithItems>['items'];

export type InspectorColumnOption = {
	label: Word;
	visible: boolean;
};

type InspectorToolbarProps = {
	columns?: InspectorColumnOption[];
	filter: InspectorFilter;
	filterOptions?: InspectorFilterOption[];
	onChange: (filter: InspectorFilter) => void;
	onToggleColumn?: (label: Word) => void;
	resultCount?: number;
	showFlaggedOnly?: boolean;
	totalCount?: number;
};

type IconButtonProps = Omit<
	ComponentProps<typeof ClayButtonWithIcon>,
	'aria-label' | 'symbol'
> & {
	active?: boolean;
	label: string;
	symbol: string;
};

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
	({active, className, label, symbol, ...otherProps}, ref) => (
		<ClayButtonWithIcon
			{...otherProps}
			aria-label={label}
			className={classNames(
				className,
				'account-inspector-toolbar-button',
				{
					active,
				}
			)}
			displayType="secondary"
			ref={ref}
			size="sm"
			symbol={symbol}
			title={label}
		/>
	)
);

export default function InspectorToolbar({
	columns,
	filter,
	filterOptions = [],
	onChange,
	onToggleColumn,
	resultCount,
	showFlaggedOnly = true,
	totalCount,
}: InspectorToolbarProps) {
	const [searchOpen, setSearchOpen] = useState(Boolean(filter.search));

	const activeFilterCount =
		getActiveValueCount(filter) + (filter.flaggedOnly ? 1 : 0);

	const filterItems: DropDownItems = [
		...(showFlaggedOnly
			? [
					{
						checked: filter.flaggedOnly,
						onChange: () =>
							onChange({
								...filter,
								flaggedOnly: !filter.flaggedOnly,
							}),
						title: i18n.translate('flagged-only'),
						type: 'checkbox' as const,
					},
				]
			: []),
		...filterOptions.map(({label, values}) => ({
			items: values.map((value) => ({
				checked: Boolean(filter.values[label]?.includes(value)),
				onChange: () =>
					onChange(toggleFilterValue(filter, label, value)),
				title: value,
				type: 'checkbox' as const,
			})),
			title: i18n.translate(label),
			type: 'group' as const,
		})),
	];

	return (
		<div className="account-inspector-toolbar align-items-center d-flex mb-3">
			{searchOpen ? (
				<div className="account-inspector-toolbar-search">
					<ClayInput
						aria-label={i18n.translate('search')}
						autoFocus
						onBlur={() => !filter.search && setSearchOpen(false)}
						onChange={(event) =>
							onChange({...filter, search: event.target.value})
						}
						onKeyDown={(event) => {
							if (event.key === 'Escape') {
								onChange({...filter, search: ''});
								setSearchOpen(false);
							}
						}}
						placeholder={i18n.translate('search')}
						sizing="sm"
						type="search"
						value={filter.search}
					/>

					<ClayIcon
						className="account-inspector-toolbar-search-icon"
						symbol="search"
					/>
				</div>
			) : (
				<IconButton
					label={i18n.translate('search')}
					onClick={() => setSearchOpen(true)}
					symbol="search"
				/>
			)}

			{columns && onToggleColumn && (
				<ClayDropDownWithItems
					items={columns.map(({label, visible}) => ({
						checked: visible,
						disabled:
							visible &&
							columns.filter((column) => column.visible)
								.length === 1,
						onChange: () => onToggleColumn(label),
						title: i18n.translate(label),
						type: 'checkbox',
					}))}
					menuElementAttrs={{className: 'account-inspector-menu'}}
					trigger={
						<IconButton
							className="account-inspector-columns-button"
							label={i18n.translate('columns')}
							symbol="bars"
						/>
					}
				/>
			)}

			{Boolean(filterItems.length) && (
				<ClayDropDownWithItems
					items={filterItems}
					menuElementAttrs={{className: 'account-inspector-menu'}}
					trigger={
						<IconButton
							active={Boolean(activeFilterCount)}
							label={i18n.translate('filter')}
							symbol="filter"
						/>
					}
				/>
			)}

			{Boolean(activeFilterCount) && (
				<ClayLabel
					className="ml-1"
					closeButtonProps={{
						'aria-label': i18n.translate('clear'),
						'onClick': () =>
							onChange({
								...filter,
								flaggedOnly: false,
								values: {},
							}),
					}}
					displayType="info"
				>
					{i18n.sub('filters-x', String(activeFilterCount))}
				</ClayLabel>
			)}

			{resultCount !== undefined && totalCount !== undefined && (
				<span className="ml-auto small text-secondary">
					{i18n.sub('showing-x-of-x', [
						String(resultCount),
						String(totalCount),
					])}
				</span>
			)}
		</div>
	);
}
