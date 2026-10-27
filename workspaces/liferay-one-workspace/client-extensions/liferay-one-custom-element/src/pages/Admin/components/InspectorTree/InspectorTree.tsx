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
import InspectorSection from '~/pages/Admin/AccountInspector/AccountInspectorDetail/components/InspectorSection/InspectorSection';
import InspectorToolbar from '~/pages/Admin/AccountInspector/AccountInspectorDetail/components/InspectorToolbar/InspectorToolbar';
import {
	EMPTY_FILTER,
	filterInspectorTree,
	getTreeKeys,
	isFilterActive,
} from '~/pages/Admin/AccountInspector/AccountInspectorDetail/utils/inspectorFilterUtils';

import type {InspectorFilter} from '~/pages/Admin/AccountInspector/AccountInspectorDetail/utils/inspectorFilterUtils';
import type {InspectorTreeNode} from '~/types/accountInspection';

type InspectorTreeItemProps<CollectionKey extends string> = {
	depth: number;
	expandedKeys: Set<string>;
	node: InspectorTreeNode<CollectionKey>;
	onSelect: (node: InspectorTreeNode<CollectionKey>) => void;
	onToggle: (key: string) => void;
};

function InspectorTreeItem<CollectionKey extends string>({
	depth,
	expandedKeys,
	node,
	onSelect,
	onToggle,
}: InspectorTreeItemProps<CollectionKey>) {
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
						<InspectorTreeItem
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

type InspectorTreeProps<CollectionKey extends string> = {
	id: string;
	isExpandedByDefault: (node: InspectorTreeNode<CollectionKey>) => boolean;
	nodes: InspectorTreeNode<CollectionKey>[];
	onSelect: (node: InspectorTreeNode<CollectionKey>) => void;
	rootLabel: string;
};

export default function InspectorTree<CollectionKey extends string>({
	id,
	isExpandedByDefault,
	nodes,
	onSelect,
	rootLabel,
}: InspectorTreeProps<CollectionKey>) {
	const [expandedKeys, setExpandedKeys] = useState(
		() => new Set(nodes.filter(isExpandedByDefault).map(({key}) => key))
	);

	const [filter, setFilter] = useState<InspectorFilter>(EMPTY_FILTER);

	const visibleNodes = filterInspectorTree(nodes, filter);

	const onFilterChange = (nextFilter: InspectorFilter) => {
		setFilter(nextFilter);

		if (isFilterActive(nextFilter)) {
			setExpandedKeys(
				new Set(getTreeKeys(filterInspectorTree(nodes, nextFilter)))
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
		<InspectorSection id={id} title={i18n.translate('relationship-tree')}>
			<InspectorToolbar filter={filter} onChange={onFilterChange} />

			<p className="font-weight-semi-bold mb-2">{rootLabel}</p>

			{!visibleNodes.length && (
				<p className="mb-0 text-secondary">
					{i18n.translate('no-matching-records')}
				</p>
			)}

			<ul className="account-inspector-tree list-unstyled mb-0">
				{visibleNodes.map((node) => (
					<InspectorTreeItem
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
