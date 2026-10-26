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
	toSeverityKey,
} from './accountTreeNodeUtils';
import {INSPECTED_COLLECTION_LABELS} from './inspectedCollectionConstants';

import type {
	AccountFinding,
	AccountInspection,
	AccountTreeNode,
	InspectedEntry,
} from '~/types/accountInspection';

import type {SeverityIndex} from './accountTreeNodeUtils';

const NO_PROJECT_ID = 0;

function buildBuckets(inspection: AccountInspection) {
	const {orders, related} = inspection;

	const projectIds = new Set(related.projects.items.map(({id}) => id));

	const contractsById = new Map(
		related.contracts.items.map((contract) => [contract.id, contract])
	);

	const projectIdsByName = new Map<string, number | null>();

	related.projects.items.forEach(({id, name}) => {
		if (name) {
			projectIdsByName.set(
				String(name),
				projectIdsByName.has(String(name)) ? null : id
			);
		}
	});

	const toBucketId = (projectId: unknown) => {
		const id = toNumber(projectId);

		return projectIds.has(id) ? id : NO_PROJECT_ID;
	};

	const byBucket = <Entry>(
		entries: Entry[],
		getProjectId: (entry: Entry) => number
	) => {
		const entriesByBucket = new Map<number, Entry[]>();

		entries.forEach((entry) => {
			const bucketId = getProjectId(entry);

			entriesByBucket.set(bucketId, [
				...(entriesByBucket.get(bucketId) ?? []),
				entry,
			]);
		});

		return (bucketId: number) => entriesByBucket.get(bucketId) ?? [];
	};

	const orderItems = getOrderItemCollection(orders).items;

	const byRelationship = (entries: InspectedEntry[], fieldName: string) =>
		byBucket(entries, (entry) => toBucketId(entry[fieldName]));

	return {
		activationKeys: byRelationship(
			related.activationKeys.items,
			'r_projectToActivationKey_c_projectId'
		),
		contracts: byRelationship(
			related.contracts.items,
			'r_projectToContract_c_projectId'
		),
		contractsById,
		entitlements: byRelationship(
			related.entitlements.items,
			'r_projectToEntitlement_c_projectId'
		),
		environments: byRelationship(
			related.environments.items,
			'r_projectToEnvironment_c_projectId'
		),
		licenseKeys: byRelationship(
			related.licenseKeys.items,
			'r_projectToLicenseKey_c_projectId'
		),
		orderItems: byBucket(orderItems, ({orderId}) => orderId ?? 0),
		orders: byBucket(
			orders.items,
			({customFields}) =>
				projectIdsByName.get(String(customFields?.projectName ?? '')) ??
				NO_PROJECT_ID
		),
		projectMemberships: byRelationship(
			related.projectMemberships.items,
			'r_projectToProjectMembership_c_projectId'
		),
		usageReports: byRelationship(
			related.usageReports.items,
			'r_projectToUsageReport_c_projectId'
		),
	};
}

function partitionByContract(
	entries: InspectedEntry[],
	fieldName: string,
	contractIds: Set<number>
) {
	return {
		inContract: (contractId: number) =>
			entries.filter(
				(entry) => toNumber(entry[fieldName]) === contractId
			),
		withoutContract: entries.filter(
			(entry) => !contractIds.has(toNumber(entry[fieldName]))
		),
	};
}

function getReferencedContracts(
	entries: InspectedEntry[][],
	contractIds: Set<number>,
	contractsById: Map<number, InspectedEntry>
) {
	const referencedIds = new Set(
		entries
			.flat()
			.flatMap((entry) => [
				toNumber(entry.r_contractToEntitlement_c_contractId),
				toNumber(entry.r_contractToEnvironment_c_contractId),
			])
			.filter((id) => id && !contractIds.has(id) && contractsById.has(id))
	);

	return [...referencedIds].map((id) => contractsById.get(id)!);
}

function buildBucketChildren(
	bucketKey: string,
	bucketId: number,
	buckets: ReturnType<typeof buildBuckets>,
	severityIndex: SeverityIndex
): AccountTreeNode[] {
	const bucketEntitlements = buckets.entitlements(bucketId);
	const bucketEnvironments = buckets.environments(bucketId);
	const ownContracts = buckets.contracts(bucketId);

	const contracts = [
		...ownContracts,
		...getReferencedContracts(
			[bucketEntitlements, bucketEnvironments],
			new Set(ownContracts.map(({id}) => id)),
			buckets.contractsById
		),
	];

	const contractIds = new Set(contracts.map(({id}) => id));

	const entitlements = partitionByContract(
		bucketEntitlements,
		'r_contractToEntitlement_c_contractId',
		contractIds
	);
	const environments = partitionByContract(
		bucketEnvironments,
		'r_contractToEnvironment_c_contractId',
		contractIds
	);

	return [
		...toGroupNode(
			bucketKey,
			'projectMemberships',
			buckets.projectMemberships(bucketId),
			severityIndex
		),
		...contracts.map((contract) => {
			const contractKey = `${bucketKey}/${toSeverityKey(
				'contracts',
				contract.id
			)}`;

			return toRecordNode(
				bucketKey,
				'contracts',
				contract,
				severityIndex,
				[
					...toGroupNode(
						contractKey,
						'entitlements',
						entitlements.inContract(contract.id),
						severityIndex
					),
					...toGroupNode(
						contractKey,
						'environments',
						environments.inContract(contract.id),
						severityIndex
					),
				]
			);
		}),
		...toGroupNode(
			bucketKey,
			'entitlements',
			entitlements.withoutContract,
			severityIndex
		),
		...toGroupNode(
			bucketKey,
			'environments',
			environments.withoutContract,
			severityIndex
		),
		...toGroupNode(
			bucketKey,
			'orders',
			buckets.orders(bucketId),
			severityIndex,
			(order, orderKey) =>
				toGroupNode(
					orderKey,
					'orderItems',
					buckets.orderItems(order.id),
					severityIndex
				)
		),
		...toGroupNode(
			bucketKey,
			'licenseKeys',
			buckets.licenseKeys(bucketId),
			severityIndex
		),
		...toGroupNode(
			bucketKey,
			'activationKeys',
			buckets.activationKeys(bucketId),
			severityIndex
		),
		...toGroupNode(
			bucketKey,
			'usageReports',
			buckets.usageReports(bucketId),
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

	const buckets = buildBuckets(inspection);

	const projectNodes = inspection.related.projects.items.map((project) =>
		toRecordNode(
			'root',
			'projects',
			project,
			severityIndex,
			buildBucketChildren(
				`root/${toSeverityKey('projects', project.id)}`,
				project.id,
				buckets,
				severityIndex
			)
		)
	);

	const accountLevelChildren = buildBucketChildren(
		'account-level',
		NO_PROJECT_ID,
		buckets,
		severityIndex
	);

	return [
		...toGroupNode('root', 'users', inspection.users.items, severityIndex),
		...projectNodes,
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
