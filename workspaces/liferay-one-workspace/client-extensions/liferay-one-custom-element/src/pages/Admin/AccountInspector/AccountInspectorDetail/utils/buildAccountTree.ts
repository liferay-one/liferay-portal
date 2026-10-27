/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import i18n from '~/i18n';

import {
	getInspectedCollections,
	getOrderItemCollection,
	toNumber,
} from './accountFindingUtils';
import {
	buildSeverityIndex,
	getWorstSeverity,
	toGroupNode,
	toRecordNode,
} from './accountTreeNodeUtils';
import {INSPECTED_COLLECTION_LABELS} from './inspectedCollectionConstants';

import type {
	AccountFinding,
	AccountInspection,
	AccountTreeNode,
	InspectedEntry,
} from '~/types/accountInspection';

import type {SeverityIndex} from './accountTreeNodeUtils';

const NO_CONTRACT_ID = 0;

const NO_PROJECT_ID = 0;

function groupBy<Entry>(
	entries: Entry[],
	getKey: (entry: Entry) => number | string
) {
	const entriesByKey = new Map<string, Entry[]>();

	entries.forEach((entry) => {
		const key = String(getKey(entry));

		entriesByKey.set(key, [...(entriesByKey.get(key) ?? []), entry]);
	});

	return (key: number | string) => entriesByKey.get(String(key)) ?? [];
}

function toPlacementKey(contractId: number, projectId: number) {
	return `${contractId}/${projectId}`;
}

function buildTreeIndex(inspection: AccountInspection) {
	const {orders, related} = inspection;

	const contractIds = new Set(related.contracts.items.map(({id}) => id));
	const entitlementIds = new Set(
		related.entitlements.items.map(({id}) => id)
	);
	const orderItems = getOrderItemCollection(orders).items;
	const projectIds = new Set(related.projects.items.map(({id}) => id));

	const orderItemIds = new Set(orderItems.map(({id}) => id));

	const projectIdsByName = new Map<string, number | null>();

	related.projects.items.forEach(({id, name}) => {
		if (name) {
			projectIdsByName.set(
				String(name),
				projectIdsByName.has(String(name)) ? null : id
			);
		}
	});

	const toContractId = (contractId: unknown) => {
		const id = toNumber(contractId);

		return contractIds.has(id) ? id : NO_CONTRACT_ID;
	};

	const toProjectId = (projectId: unknown) => {
		const id = toNumber(projectId);

		return projectIds.has(id) ? id : NO_PROJECT_ID;
	};

	const byProject = (entries: InspectedEntry[], fieldName: string) =>
		groupBy(entries, (entry) => toProjectId(entry[fieldName]));

	const getOrderItemId = (entitlement: InspectedEntry) =>
		toNumber(
			entitlement.r_commerceOrderItemToEntitlement_commerceOrderItemId
		);

	const getEntitlementId = (licenseKey: InspectedEntry) =>
		toNumber(licenseKey.r_entitlementToLicenseKey_c_entitlementId);

	const isUnderEntitlement = (licenseKey: InspectedEntry) =>
		entitlementIds.has(getEntitlementId(licenseKey));

	const isUnderOrderItem = (entitlement: InspectedEntry) =>
		orderItemIds.has(getOrderItemId(entitlement));

	return {
		activationKeys: byProject(
			related.activationKeys.items,
			'r_projectToActivationKey_c_projectId'
		),
		entitlements: groupBy(
			related.entitlements.items.filter(
				(entitlement) => !isUnderOrderItem(entitlement)
			),
			(entitlement) =>
				toPlacementKey(
					toContractId(
						entitlement.r_contractToEntitlement_c_contractId
					),
					toProjectId(entitlement.r_projectToEntitlement_c_projectId)
				)
		),
		entitlementsByOrderItem: groupBy(
			related.entitlements.items.filter(isUnderOrderItem),
			getOrderItemId
		),
		licenseKeys: byProject(
			related.licenseKeys.items.filter(
				(licenseKey) => !isUnderEntitlement(licenseKey)
			),
			'r_projectToLicenseKey_c_projectId'
		),
		licenseKeysByEntitlement: groupBy(
			related.licenseKeys.items.filter(isUnderEntitlement),
			getEntitlementId
		),
		orderItems: groupBy(orderItems, ({orderId}) => orderId ?? 0),
		orders: groupBy(orders.items, ({customFields}) =>
			toPlacementKey(
				toContractId(customFields?.contractId),
				projectIdsByName.get(String(customFields?.projectName ?? '')) ??
					NO_PROJECT_ID
			)
		),
		projectMemberships: byProject(
			related.projectMemberships.items,
			'r_projectToProjectMembership_c_projectId'
		),
		toProjectId,
		usageReports: byProject(
			related.usageReports.items,
			'r_projectToUsageReport_c_projectId'
		),
	};
}

type TreeIndex = ReturnType<typeof buildTreeIndex>;

function buildEntitlementNodes(
	parentKey: string,
	entitlements: InspectedEntry[],
	index: TreeIndex,
	severityIndex: SeverityIndex
) {
	return toGroupNode(
		parentKey,
		'entitlements',
		entitlements,
		severityIndex,
		(entitlement, entitlementKey) =>
			toGroupNode(
				entitlementKey,
				'licenseKeys',
				index.licenseKeysByEntitlement(entitlement.id),
				severityIndex
			)
	);
}

function buildPlacementChildren(
	parentKey: string,
	contractId: number,
	projectId: number,
	index: TreeIndex,
	severityIndex: SeverityIndex
): AccountTreeNode[] {
	const placementKey = toPlacementKey(contractId, projectId);

	return [
		...toGroupNode(
			parentKey,
			'orders',
			index.orders(placementKey),
			severityIndex,
			(order, orderKey) =>
				toGroupNode(
					orderKey,
					'orderItems',
					index.orderItems(order.id),
					severityIndex,
					(orderItem, orderItemKey) =>
						buildEntitlementNodes(
							orderItemKey,
							index.entitlementsByOrderItem(orderItem.id),
							index,
							severityIndex
						)
				)
		),
		...buildEntitlementNodes(
			parentKey,
			index.entitlements(placementKey),
			index,
			severityIndex
		),
	];
}

function buildProjectChildren(
	projectKey: string,
	projectId: number,
	contracts: InspectedEntry[],
	index: TreeIndex,
	severityIndex: SeverityIndex
): AccountTreeNode[] {
	const projectContracts = contracts.filter((contract) => {
		const placementKey = toPlacementKey(contract.id, projectId);

		return (
			index.toProjectId(contract.r_projectToContract_c_projectId) ===
				projectId ||
			index.orders(placementKey).length ||
			index.entitlements(placementKey).length
		);
	});

	return [
		...toGroupNode(
			projectKey,
			'contracts',
			projectContracts,
			severityIndex,
			(contract, contractKey) =>
				buildPlacementChildren(
					contractKey,
					contract.id,
					projectId,
					index,
					severityIndex
				)
		),
		...toGroupNode(
			projectKey,
			'projectMemberships',
			index.projectMemberships(projectId),
			severityIndex
		),
		...buildPlacementChildren(
			projectKey,
			NO_CONTRACT_ID,
			projectId,
			index,
			severityIndex
		),
		...toGroupNode(
			projectKey,
			'licenseKeys',
			index.licenseKeys(projectId),
			severityIndex
		),
		...toGroupNode(
			projectKey,
			'activationKeys',
			index.activationKeys(projectId),
			severityIndex
		),
		...toGroupNode(
			projectKey,
			'usageReports',
			index.usageReports(projectId),
			severityIndex
		),
	];
}

function buildBrokenLinksNode(
	inspection: AccountInspection,
	findings: AccountFinding[],
	severityIndex: SeverityIndex
): AccountTreeNode[] {
	const entriesByCollection = new Map(
		getInspectedCollections(inspection).map(([collection, {items}]) => [
			collection,
			items,
		])
	);

	const children = findings
		.filter(
			({collection, ids, severity}) =>
				collection !== 'account' && ids.length && severity !== 'info'
		)
		.map(({collection, ids, message, severity}) => {
			const entries = entriesByCollection.get(collection) ?? [];
			const findingKey = `broken/${collection}/${message}`;
			const flaggedIds = new Set(ids);

			return {
				children: entries
					.filter(({id}) => flaggedIds.has(id))
					.map((entry) =>
						toRecordNode(
							findingKey,
							collection,
							entry,
							severityIndex
						)
					),
				collection,
				count: ids.length,
				key: findingKey,
				label: `${i18n.translate(
					INSPECTED_COLLECTION_LABELS[collection]
				)}: ${i18n.translate(message)}`,
				severity,
			};
		});

	if (!children.length) {
		return [];
	}

	return [
		{
			children,
			count: children.reduce((total, {count}) => total + count, 0),
			key: 'broken',
			label: i18n.translate('broken-links'),
			severity: getWorstSeverity(children.map(({severity}) => severity)),
		},
	];
}

function buildAccountTree(
	inspection: AccountInspection,
	findings: AccountFinding[]
): AccountTreeNode[] {
	const severityIndex = buildSeverityIndex(findings);

	const contracts = inspection.related.contracts.items;
	const index = buildTreeIndex(inspection);

	const accountLevelChildren = buildProjectChildren(
		'account-level',
		NO_PROJECT_ID,
		contracts,
		index,
		severityIndex
	);

	return [
		...toGroupNode(
			'root',
			'projects',
			inspection.related.projects.items,
			severityIndex,
			(project, projectKey) =>
				buildProjectChildren(
					projectKey,
					project.id,
					contracts,
					index,
					severityIndex
				)
		),
		...toGroupNode(
			'root',
			'environments',
			inspection.related.environments.items,
			severityIndex
		),
		...toGroupNode('root', 'users', inspection.users.items, severityIndex),
		...(accountLevelChildren.length
			? [
					{
						children: accountLevelChildren,
						key: 'account-level',
						label: i18n.translate('no-project-account-level'),
						severity: getWorstSeverity(
							accountLevelChildren.map(({severity}) => severity)
						),
					},
				]
			: []),
		...buildBrokenLinksNode(inspection, findings, severityIndex),
	];
}

export default buildAccountTree;
