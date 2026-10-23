/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import ClayLabel from '@clayui/label';
import {useMemo, useState} from 'react';
import {Navigate, useParams} from 'react-router';
import BackLink from '~/components/BackLink/BackLink';
import {PageRenderer} from '~/components/Page/Page';
import {useDataQuery} from '~/hooks/useDataQuery';
import i18n from '~/i18n';
import {accountInspectionQuery} from '~/services/queries/accountInspectionQuery';

import AccountFindings from './components/AccountFindings/AccountFindings';
import AccountSummary from './components/AccountSummary/AccountSummary';
import AccountTree from './components/AccountTree/AccountTree';
import InspectedCollectionPanel from './components/InspectedCollectionPanel/InspectedCollectionPanel';
import {openAccountDashboard} from './utils/accountDashboardUtils';
import buildAccountTree from './utils/buildAccountTree';
import getAccountFindings from './utils/getAccountFindings';

import type FetcherError from '~/services/fetcher/FetcherError';
import type {
	AccountFinding,
	AccountInspection,
	AccountInspectorFocus,
	InspectedCollection,
	InspectedCollectionKey,
	InspectedEntry,
	RelatedCollectionKey,
} from '~/types/accountInspection';

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
}: {
	inspection: AccountInspection;
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

			<AccountTree
				accountName={account.name}
				nodes={treeNodes}
				onSelect={({collection, recordId}) =>
					collection && focusCollection(collection, recordId)
				}
			/>

			<AccountSummary inspection={inspection} />

			<h3 className="mb-3">{i18n.translate('related-records')}</h3>

			{getCollections(inspection).map(([collectionKey, collection]) => (
				<InspectedCollectionPanel
					account={account}
					collection={collection}
					collectionKey={collectionKey}
					flaggedIds={flaggedIdsByCollection.get(collectionKey)!}
					focus={focus}
					key={collectionKey}
				/>
			))}
		</>
	);
}

export default function AccountInspectorDetail() {
	const {accountId} = useParams();

	const query = accountInspectionQuery(accountId);

	const {data, error, isLoading, isValidating, mutate} = useDataQuery(query, {
		revalidateOnFocus: false,
	});

	if (!query.key) {
		return <Navigate replace to="/account-inspector" />;
	}

	return (
		<div className="account-inspector w-100">
			<div className="align-items-center d-flex justify-content-between mb-4">
				<BackLink path="/account-inspector">
					{i18n.translate('back-to-accounts')}
				</BackLink>

				<div className="d-flex">
					{data && (
						<ClayButton
							className="mr-2"
							displayType="secondary"
							onClick={() => openAccountDashboard(data.account)}
							size="sm"
						>
							{i18n.translate('go-to-account')}
						</ClayButton>
					)}

					<ClayButton
						disabled={isValidating}
						displayType="secondary"
						onClick={() => mutate()}
						size="sm"
					>
						{i18n.translate('reload')}
					</ClayButton>
				</div>
			</div>

			<PageRenderer
				error={error as FetcherError | undefined}
				isLoading={isLoading}
			>
				{data && (
					<AccountInspectorContent
						inspection={data}
						key={data.loadedAt}
					/>
				)}
			</PageRenderer>
		</div>
	);
}
