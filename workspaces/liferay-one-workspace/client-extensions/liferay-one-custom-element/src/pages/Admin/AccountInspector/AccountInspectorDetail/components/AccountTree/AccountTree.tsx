/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import ClayIcon from '@clayui/icon';
import ClayLabel from '@clayui/label';
import classNames from 'classnames';
import {useState} from 'react';
import i18n from '~/i18n';

import {
	EMPTY_FILTER,
	filterAccountTree,
	getTreeKeys,
	isFilterActive,
} from '../../utils/inspectorFilterUtils';
import InspectorSection from '../InspectorSection/InspectorSection';
import InspectorToolbar from '../InspectorToolbar/InspectorToolbar';

import type {AccountTreeNode} from '~/types/accountInspection';

import type {InspectorFilter} from '../../utils/inspectorFilterUtils';

type AccountTreeItemProps = {
	depth: number;
	expandedKeys: Set<string>;
	node: AccountTreeNode;
	onSelect: (node: AccountTreeNode) => void;
	onToggle: (key: string) => void;
};

function AccountTreeItem({
	depth,
	expandedKeys,
	node,
	onSelect,
	onToggle,
}: AccountTreeItemProps) {
	const expanded = expandedKeys.has(node.key);
	const hasChildren = Boolean(node.children.length);

	return (
		<li>
			<div
				className="account-inspector-tree-row align-items-center d-flex"
				style={{paddingLeft: `${depth * 1.25}rem`}}
			>
				{hasChildren ? (
					<ClayButton
						aria-expanded={expanded}
						aria-label={i18n.translate(
							expanded ? 'collapse' : 'expand'
						)}
						className="account-inspector-tree-toggle"
						displayType="unstyled"
						onClick={() => onToggle(node.key)}
						size="xs"
					>
						<ClayIcon
							symbol={expanded ? 'angle-down' : 'angle-right'}
						/>
					</ClayButton>
				) : (
					<span className="account-inspector-tree-toggle" />
				)}

				<button
					className={classNames(
						'account-inspector-tree-label btn btn-link btn-sm text-left text-truncate',
						{
							'font-weight-semi-bold': hasChildren,
							'text-dark': !node.collection,
						}
					)}
					disabled={!node.collection}
					onClick={() => onSelect(node)}
					title={node.label}
					type="button"
				>
					{node.label}
				</button>

				{node.meta && (
					<span className="ml-1 small text-secondary">
						{node.meta}
					</span>
				)}

				{node.count !== undefined && (
					<ClayLabel className="ml-2" displayType="info">
						{node.count}
					</ClayLabel>
				)}

				{node.severity && (
					<ClayIcon
						className={`ml-2 text-${node.severity}`}
						symbol={
							node.severity === 'info'
								? 'info-circle'
								: 'warning-full'
						}
					/>
				)}
			</div>

			{expanded && hasChildren && (
				<ul className="list-unstyled mb-0">
					{node.children.map((child) => (
						<AccountTreeItem
							depth={depth + 1}
							expandedKeys={expandedKeys}
							key={child.key}
							node={child}
							onSelect={onSelect}
							onToggle={onToggle}
						/>
					))}
				</ul>
			)}
		</li>
	);
}

type AccountTreeProps = {
	accountName: string;
	nodes: AccountTreeNode[];
	onSelect: (node: AccountTreeNode) => void;
};

export default function AccountTree({
	accountName,
	nodes,
	onSelect,
}: AccountTreeProps) {
	const [expandedKeys, setExpandedKeys] = useState(
		() =>
			new Set(
				nodes
					.filter(({collection}) => collection !== 'users')
					.map(({key}) => key)
			)
	);

	const [filter, setFilter] = useState<InspectorFilter>(EMPTY_FILTER);

	const visibleNodes = filterAccountTree(nodes, filter);

	const onFilterChange = (nextFilter: InspectorFilter) => {
		setFilter(nextFilter);

		if (isFilterActive(nextFilter)) {
			setExpandedKeys(
				new Set(getTreeKeys(filterAccountTree(nodes, nextFilter)))
			);
		}
	};

	const onToggle = (key: string) =>
		setExpandedKeys((previousKeys) => {
			const nextKeys = new Set(previousKeys);

			if (!nextKeys.delete(key)) {
				nextKeys.add(key);
			}

			return nextKeys;
		});

	return (
		<InspectorSection
			id="account-inspector-tree"
			title={i18n.translate('relationship-tree')}
		>
			<InspectorToolbar filter={filter} onChange={onFilterChange} />

			<p className="font-weight-semi-bold mb-2">{accountName}</p>

			{!visibleNodes.length && (
				<p className="mb-0 text-secondary">
					{i18n.translate('no-matching-records')}
				</p>
			)}

			<ul className="account-inspector-tree list-unstyled mb-0">
				{visibleNodes.map((node) => (
					<AccountTreeItem
						depth={0}
						expandedKeys={expandedKeys}
						key={node.key}
						node={node}
						onSelect={onSelect}
						onToggle={onToggle}
					/>
				))}
			</ul>
		</InspectorSection>
	);
}
