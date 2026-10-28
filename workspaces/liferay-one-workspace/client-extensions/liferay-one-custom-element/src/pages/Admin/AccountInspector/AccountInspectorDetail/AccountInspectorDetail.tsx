/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayLabel from '@clayui/label';
import {useMemo, useState} from 'react';
import {Navigate, useParams} from 'react-router';
import {useSWRConfig} from 'swr';
import BackLink from '~/components/BackLink/BackLink';
import {PageRenderer} from '~/components/Page/Page';
import RowActionsMenu from '~/components/RowActionsMenu/RowActionsMenu';
import {useDataQuery} from '~/hooks/useDataQuery';
import i18n from '~/i18n';
import InspectorTree from '~/pages/Admin/components/InspectorTree/InspectorTree';
import {accountInspectionQuery} from '~/services/queries/accountInspectionQuery';
import {accountSalesforceRecordsQuery} from '~/services/queries/accountSalesforceRecordsQuery';

import AccountFindings from './components/AccountFindings/AccountFindings';
import AccountSummary from './components/AccountSummary/AccountSummary';
import InspectedCollectionPanel from './components/InspectedCollectionPanel/InspectedCollectionPanel';
import JSMRecords from './components/JSMRecords/JSMRecords';
import SalesforceRecords from './components/SalesforceRecords/SalesforceRecords';
import {openAccountDashboard} from './utils/accountDashboardUtils';
import {getOrderItemCollection} from './utils/accountFindingUtils';
import buildAccountTree from './utils/buildAccountTree';
import getAccountFindings from './utils/getAccountFindings';
import isSalesforceAccountId from './utils/isSalesforceAccountId';
import syncAccountFromSalesforce from './utils/syncAccountFromSalesforce';
import syncRecordToJSM from './utils/syncRecordToJSM';

import type FetcherError from '~/services/fetcher/FetcherError';
import type {
	AccountFinding,
	AccountInspection,
	AccountInspectorFocus,
	InspectedCollection,
	InspectedCollectionKey,
	InspectedEntry,
	RelatedCollectionKey,
	SalesforceComparison,
} from '~/types/accountInspection';
import type {Account} from '~/types/accounts';

const RELATED_COLLECTION_DISPLAY_ORDER: RelatedCollectionKey[] = [
	'projects',
	'projectMemberships',
	'contracts',
	'entitlements',
	'licenseKeys',
	'activationKeys',
	'environments',
	'usageReports',
	'trialExtensionRequests',
	'accountInvitations',
	'accountNotes',
	'oauth2DxpAuthorizations',
	'ticketAttachments',
	'properties',
	'publisherDetails',
	'publisherAssets',
	'publisherSalesSummaries',
];

function getCollections(
	inspection: AccountInspection
): [InspectedCollectionKey, InspectedCollection<InspectedEntry>][] {
	return [
		['users', inspection.users],
		['orders', inspection.orders],
		['orderItems', getOrderItemCollection(inspection.orders)],
		...RELATED_COLLECTION_DISPLAY_ORDER.map(
			(key) =>
				[key, inspection.related[key]] as [
					RelatedCollectionKey,
					InspectedCollection,
				]
		),
	];
}

function getFlaggedIdsByCollection(
	findings: AccountFinding[],
	inspection: AccountInspection
) {
	return new Map(
		getCollections(inspection).map(([collectionKey, collection]) => {
			const recordIds = new Set<number | string>(
				collection.items.map(({id}) => id)
			);

			return [
				collectionKey,
				new Set(
					findings
						.filter(
							(finding) => finding.collection === collectionKey
						)
						.flatMap(({ids}) => ids)
						.filter((id) => recordIds.has(id))
				),
			];
		})
	);
}

function AccountInspectorContent({
	inspection,
	onRecordChange,
}: {
	inspection: AccountInspection;
	onRecordChange: () => void;
}) {
	const findings = useMemo(
		() => getAccountFindings(inspection),
		[inspection]
	);

	const treeNodes = useMemo(
		() => buildAccountTree(inspection, findings),
		[findings, inspection]
	);

	const flaggedIdsByCollection = useMemo(
		() => getFlaggedIdsByCollection(findings, inspection),
		[findings, inspection]
	);

	const [focus, setFocus] = useState<AccountInspectorFocus>();

	const focusCollection = (
		collection: InspectedCollectionKey,
		recordId?: number
	) => {
		if (collection === 'account') {
			document
				.getElementById('account-inspector-account')
				?.scrollIntoView({behavior: 'smooth', block: 'center'});

			return;
		}

		setFocus((previousFocus) => ({
			collection,
			recordId,
			request: (previousFocus?.request ?? 0) + 1,
		}));
	};

	const {account} = inspection;

	return (
		<>
			<div className="align-items-center d-flex mb-4">
				<div className="flex-grow-1">
					<h2 className="mb-1">{account.name}</h2>

					<div className="align-items-center d-flex text-secondary">
						<span className="mr-3">
							{account.externalReferenceCode}
						</span>

						<ClayLabel displayType="secondary">
							{account.type}
						</ClayLabel>
					</div>
				</div>
			</div>

			<AccountFindings
				findings={findings}
				onSelect={(collection) => focusCollection(collection)}
			/>

			<InspectorTree
				id="account-inspector-tree"
				isExpandedByDefault={({collection}) => collection !== 'users'}
				nodes={treeNodes}
				onSelect={({collection, recordId}) =>
					collection && focusCollection(collection, recordId)
				}
				rootLabel={account.name}
			/>

			<AccountSummary inspection={inspection} />

			<JSMRecords inspection={inspection} />

			{isSalesforceAccountId(account.externalReferenceCode) && (
				<SalesforceRecords inspection={inspection} />
			)}

			<h3 className="mb-3">{i18n.translate('related-records')}</h3>

			{getCollections(inspection).map(([collectionKey, collection]) => (
				<InspectedCollectionPanel
					account={account}
					collection={collection}
					collectionKey={collectionKey}
					flaggedIds={flaggedIdsByCollection.get(collectionKey)!}
					focus={focus}
					key={collectionKey}
					onRecordChange={onRecordChange}
				/>
			))}
		</>
	);
}

export default function AccountInspectorDetail() {
	const {externalReferenceCode} = useParams();

	const query = accountInspectionQuery(externalReferenceCode);

	const {data, error, isLoading, isValidating, mutate} = useDataQuery(query, {
		revalidateOnFocus: false,
	});

	const {cache} = useSWRConfig();

	const [syncing, setSyncing] = useState(false);

	const syncAccountToJSM = async (account: Account) => {
		setSyncing(true);

		if (
			await syncRecordToJSM({
				externalReferenceCode: account.externalReferenceCode,
				name: account.name,
				recordId: account.id,
				type: 'account',
			})
		) {
			mutate();
		}

		setSyncing(false);
	};

	const syncFromSalesforce = async (inspection: AccountInspection) => {
		setSyncing(true);

		const salesforceComparison: SalesforceComparison | undefined =
			cache.get(
				accountSalesforceRecordsQuery(
					inspection.account.externalReferenceCode,
					inspection.loadedAt
				).key!
			)?.data;

		if (
			await syncAccountFromSalesforce(
				inspection.account.externalReferenceCode,
				salesforceComparison?.queryJobIds
			)
		) {
			mutate();
		}

		setSyncing(false);
	};

	if (!query.key) {
		return <Navigate replace to="/account-inspector" />;
	}

	return (
		<div className="account-inspector w-100">
			<div className="align-items-center d-flex justify-content-between mb-4">
				<BackLink path="/account-inspector">
					{i18n.translate('back-to-accounts')}
				</BackLink>

				<RowActionsMenu
					actions={[
						...(data
							? [
									{
										label: 'go-to-account' as const,
										onClick: () =>
											openAccountDashboard(data.account),
									},
									{
										disabled:
											syncing ||
											!data.account.externalReferenceCode,
										label: 'sync-to-jsm' as const,
										onClick: () =>
											syncAccountToJSM(data.account),
									},
								]
							: []),
						...(data &&
						isSalesforceAccountId(
							data.account.externalReferenceCode
						)
							? [
									{
										disabled: syncing,
										label: 'sync-from-salesforce' as const,
										onClick: () => syncFromSalesforce(data),
									},
								]
							: []),
						{
							disabled: isValidating,
							label: 'reload',
							onClick: () => mutate(),
						},
					]}
				/>
			</div>

			<PageRenderer
				error={error as FetcherError | undefined}
				isLoading={isLoading}
			>
				{data && (
					<AccountInspectorContent
						inspection={data}
						key={data.loadedAt}
						onRecordChange={() => window.location.reload()}
					/>
				)}
			</PageRenderer>
		</div>
	);
}
