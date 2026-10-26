/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayAlert from '@clayui/alert';
import ClayLabel from '@clayui/label';
import {ClayPaginationBarWithBasicItems} from '@clayui/pagination-bar';
import {useEffect, useMemo, useRef, useState} from 'react';
import i18n from '~/i18n';

import {
	INSPECTED_COLLECTION_COLUMNS,
	INSPECTED_COLLECTION_LABELS,
} from '../../utils/inspectedCollectionConstants';
import {
	EMPTY_FILTER,
	filterInspectedEntries,
	getFilterOptions,
} from '../../utils/inspectorFilterUtils';
import InspectedCollectionTable, {
	toRowId,
} from '../InspectedCollectionTable/InspectedCollectionTable';
import InspectorSection from '../InspectorSection/InspectorSection';
import InspectorToolbar from '../InspectorToolbar/InspectorToolbar';

import type {Word} from '~/i18n';
import type {
	AccountInspectorFocus,
	InspectedCollection,
	InspectedCollectionKey,
	InspectedEntry,
} from '~/types/accountInspection';
import type {Account} from '~/types/accounts';

import type {InspectorFilter} from '../../utils/inspectorFilterUtils';

const PAGE_SIZES = [10, 20, 50];

type InspectedCollectionPanelProps = {
	account: Account;
	collection: InspectedCollection<InspectedEntry>;
	collectionKey: InspectedCollectionKey;
	flaggedIds: Set<number | string>;
	focus?: AccountInspectorFocus;
};

export default function InspectedCollectionPanel({
	account,
	collection,
	collectionKey,
	flaggedIds,
	focus,
}: InspectedCollectionPanelProps) {
	const [expanded, setExpanded] = useState(
		Boolean(collection.error || collection.truncated || flaggedIds.size)
	);
	const [filter, setFilter] = useState(EMPTY_FILTER);
	const [hiddenColumns, setHiddenColumns] = useState(
		() =>
			new Set(
				INSPECTED_COLLECTION_COLUMNS[collectionKey]
					.filter(({hidden}) => hidden)
					.map(({label}) => label)
			)
	);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

	const itemsRef = useRef(collection.items);
	const pageSizeRef = useRef(pageSize);

	itemsRef.current = collection.items;
	pageSizeRef.current = pageSize;

	const focusedId =
		focus?.collection === collectionKey ? focus.recordId : undefined;

	useEffect(() => {
		if (focus?.collection !== collectionKey) {
			return;
		}

		setExpanded(true);
		setFilter(EMPTY_FILTER);

		const recordIndex = itemsRef.current.findIndex(
			({id}) => id === focus.recordId
		);

		setPage(
			recordIndex < 0
				? 1
				: Math.floor(recordIndex / pageSizeRef.current) + 1
		);

		const frame = requestAnimationFrame(() =>
			document
				.getElementById(
					focus.recordId
						? toRowId(collectionKey, focus.recordId)
						: `account-inspector-${collectionKey}`
				)
				?.scrollIntoView({behavior: 'smooth', block: 'center'})
		);

		return () => cancelAnimationFrame(frame);
	}, [collectionKey, focus]);

	const allColumns = INSPECTED_COLLECTION_COLUMNS[collectionKey];

	const columns = allColumns.filter(({label}) => !hiddenColumns.has(label));

	const filterOptions = useMemo(
		() =>
			expanded
				? getFilterOptions(collection.items, allColumns, account.id)
				: [],
		[account.id, allColumns, collection.items, expanded]
	);

	const entries = useMemo(
		() =>
			expanded
				? filterInspectedEntries(
						collection.items,
						allColumns,
						filter,
						flaggedIds,
						account.id
					)
				: [],
		[account.id, allColumns, collection.items, expanded, filter, flaggedIds]
	);

	const lastPage = Math.max(1, Math.ceil(entries.length / pageSize));

	const currentPage = Math.min(page, lastPage);

	const onFilterChange = (nextFilter: InspectorFilter) => {
		setFilter(nextFilter);
		setPage(1);
	};

	const onToggleColumn = (label: Word) =>
		setHiddenColumns((previousColumns) => {
			const nextColumns = new Set(previousColumns);

			if (!nextColumns.delete(label)) {
				nextColumns.add(label);
			}

			return nextColumns;
		});

	return (
		<InspectorSection
			badges={
				<>
					<ClayLabel displayType="info">
						{collection.totalCount}
					</ClayLabel>

					{collection.error && (
						<ClayLabel displayType="danger">
							{i18n.translate('error')}
						</ClayLabel>
					)}

					{Boolean(flaggedIds.size) && (
						<ClayLabel displayType="warning">
							{i18n.sub('x-flagged', String(flaggedIds.size))}
						</ClayLabel>
					)}
				</>
			}
			expanded={expanded}
			id={`account-inspector-${collectionKey}`}
			onExpandedChange={setExpanded}
			title={i18n.translate(INSPECTED_COLLECTION_LABELS[collectionKey])}
		>
			{collection.error && (
				<ClayAlert displayType="danger">{collection.error}</ClayAlert>
			)}

			{collection.truncated && (
				<ClayAlert displayType="warning">
					{collection.totalCount > collection.items.length
						? i18n.sub('only-x-of-x-records-could-be-loaded', [
								String(collection.items.length),
								String(collection.totalCount),
							])
						: i18n.translate(
								'only-part-of-the-records-could-be-loaded'
							)}
				</ClayAlert>
			)}

			{!collection.error && !collection.items.length && (
				<p className="mb-0 text-secondary">
					{i18n.translate('no-records')}
				</p>
			)}

			{Boolean(collection.items.length) && (
				<InspectorToolbar
					columns={allColumns.map(({label}) => ({
						label,
						visible: !hiddenColumns.has(label),
					}))}
					filter={filter}
					filterOptions={filterOptions}
					onChange={onFilterChange}
					onToggleColumn={onToggleColumn}
					showFlaggedOnly={Boolean(flaggedIds.size)}
				/>
			)}

			{Boolean(collection.items.length) && !entries.length && (
				<p className="mb-0 text-secondary">
					{i18n.translate('no-matching-records')}
				</p>
			)}

			{Boolean(entries.length) && (
				<InspectedCollectionTable
					account={account}
					collectionKey={collectionKey}
					columns={columns}
					entries={entries.slice(
						(currentPage - 1) * pageSize,
						currentPage * pageSize
					)}
					flaggedIds={flaggedIds}
					focusedId={focusedId}
				/>
			)}

			{entries.length > PAGE_SIZES[0] && (
				<ClayPaginationBarWithBasicItems
					activeDelta={pageSize}
					activePage={currentPage}
					deltas={PAGE_SIZES.map((label) => ({label}))}
					ellipsisBuffer={1}
					onDeltaChange={(nextPageSize) => {
						setPageSize(nextPageSize);
						setPage(1);
					}}
					onPageChange={setPage}
					size="sm"
					totalItems={entries.length}
				/>
			)}
		</InspectorSection>
	);
}
