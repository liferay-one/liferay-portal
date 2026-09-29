/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import classNames from 'classnames';
import {CSSProperties, ReactNode} from 'react';
import {NavLink} from 'react-router-dom';
import CustomIcon from '~/components/CustomIcon/CustomIcon';
import i18n, {Word, languages} from '~/i18n';

import './SideNav.css';

export type NavItem = {
	children?: NavItem[];
	end?: boolean;
	icon?: string;
	label: string;
	path: string;
};

type SideNavItemProps = {
	depth: number;
	item: NavItem;
};

function SideNavItem({depth, item}: SideNavItemProps) {
	const hasChildren = Boolean(item.children && item.children.length);
	const icon = item.icon;

	const labelKey = (
		item.label in languages.en_US
			? item.label
			: item.label
					?.toLowerCase()
					.replace(/[^a-z0-9]+/g, '-')
					.replace(/^-|-$/g, '')
	) as Word;

	const label = i18n.translate(labelKey) || item.label;

	return (
		<li className="side-nav-item">
			<NavLink
				className={({isActive}) =>
					classNames('side-nav-link', {
						'side-nav-link-active': isActive,
					})
				}
				end={item.end ?? !hasChildren}
				style={{'--side-nav-depth': depth} as CSSProperties}
				to={item.path}
			>
				{icon && <CustomIcon className="side-nav-icon" symbol={icon} />}

				<span className="side-nav-label">{label}</span>
			</NavLink>

			{hasChildren && (
				<ul className="side-nav-sublist">
					{item.children?.map((child) => (
						<SideNavItem
							depth={depth + 1}
							item={child}
							key={child.path}
						/>
					))}
				</ul>
			)}
		</li>
	);
}

type SideNavProps = {
	header?: ReactNode;
	headerBackground?: boolean;
	items: NavItem[];
	title?: string;
};

export default function SideNav({
	header,
	headerBackground = true,
	items,
	title,
}: SideNavProps) {
	const titleKey =
		title &&
		(title in languages.en_US
			? title
			: title
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, '-')
					.replace(/^-|-$/g, ''));

	const displayTitle = titleKey
		? i18n.translate(titleKey as Word) || title
		: title;

	return (
		<nav className="side-nav">
			{header && (
				<div
					className={classNames('side-nav-header', {
						'side-nav-header-plain': !headerBackground,
					})}
				>
					{header}
				</div>
			)}

			<div className="side-nav-panel">
				{displayTitle && (
					<div className="side-nav-title">{displayTitle}</div>
				)}

				<ul className="side-nav-list">
					{items.map((item) => (
						<SideNavItem depth={0} item={item} key={item.path} />
					))}
				</ul>
			</div>
		</nav>
	);
}
