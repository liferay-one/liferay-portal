/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayAlert from '@clayui/alert';
import {ClayButtonWithIcon} from '@clayui/button';
import ClayIcon from '@clayui/icon';
import ClayLabel from '@clayui/label';
import {ClayPaginationBarWithBasicItems} from '@clayui/pagination-bar';
import ClayTable from '@clayui/table';
import classNames from 'classnames';
import {Fragment, ReactNode, useMemo, useState} from 'react';
import RowActionsMenu from '~/components/RowActionsMenu/RowActionsMenu';
import i18n from '~/i18n';
import InspectorSection from '~/pages/Admin/AccountInspector/AccountInspectorDetail/components/InspectorSection/InspectorSection';
import InspectorToolbar from '~/pages/Admin/AccountInspector/AccountInspectorDetail/components/InspectorToolbar/InspectorToolbar';
import {
	EMPTY_FILTER,
	filterInspectedEntries,
	formatInspectedValue,
	getFilterOptions,
} from '~/pages/Admin/AccountInspector/AccountInspectorDetail/utils/inspectorFilterUtils';
import sortInspectorEntries from '~/pages/Admin/utils/sortInspectorEntries';

import type {RowAction} from '~/components/RowActionsMenu/RowActionsMenu';
import type {Word} from '~/i18n';
import type {InspectedCollectionColumn} from '~/pages/Admin/AccountInspector/AccountInspectorDetail/utils/inspectedCollectionConstants';
import type {InspectorFilter} from '~/pages/Admin/AccountInspector/AccountInspectorDetail/utils/inspectorFilterUtils';
import type {SortDirection} from '~/pages/Admin/utils/sortInspectorEntries';
import type {InspectedEntry} from '~/types/accountInspection';

const NO_ACCOUNT_ID = 0;

const NO_FLAGGED_IDS = new Set<number | string>();

const PAGE_SIZES = [10, 20, 50, 100];

export type InspectorTableColumn<Entry> = InspectedCollectionColumn<Entry> & {
	render?: (entry: Entry) => ReactNode;
	sortable?: boolean;
};

type InspectorTableSort = {
	direction: SortDirection;
	label: Word;
};

type InspectorTableProps<Entry extends InspectedEntry> = {
	bare?: boolean;
	columns: InspectorTableColumn<Entry>[];
	defaultExpanded?: boolean;
	defaultPageSize?: number;
	entries: Entry[];
	error?: string;
	flaggedIds?: Set<number | string>;
	getRowActions?: (entry: Entry) => RowAction[];
	id: string;
	title: string;
	totalCount?: number;
	truncated?: boolean;
};

export default function InspectorTable<Entry extends InspectedEntry>({
	bare = false,
	columns: allColumns,
	defaultExpanded = false,
	defaultPageSize = PAGE_SIZES[0],
	entries: allEntries,
	error,
	flaggedIds = NO_FLAGGED_IDS,
	getRowActions,
	id,
	title,
	totalCount = allEntries.length,
	truncated,
}: InspectorTableProps<Entry>) {
	const [expandedId, setExpandedId] = useState<number | null>(null);
	const [filter, setFilter] = useState(EMPTY_FILTER);
	const [hiddenColumns, setHiddenColumns] = useState(
		() =>
			new Set(
				allColumns.filter(({hidden}) => hidden).map(({label}) => label)
			)
	);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(defaultPageSize);
	const [sort, setSort] = useState<InspectorTableSort | null>(null);

	const columns = allColumns.filter(({label}) => !hiddenColumns.has(label));

	const filterOptions = useMemo(
		() => getFilterOptions(allEntries, allColumns, NO_ACCOUNT_ID),
		[allColumns, allEntries]
	);

	const entries = useMemo(() => {
		const filteredEntries = filterInspectedEntries(
			allEntries,
			allColumns,
			filter,
			flaggedIds,
			NO_ACCOUNT_ID
		);

		const sortColumn =
			sort && allColumns.find(({label}) => label === sort.label);

		return sortColumn
			? sortInspectorEntries(filteredEntries, sortColumn, sort.direction)
			: filteredEntries;
	}, [allColumns, allEntries, filter, flaggedIds, sort]);

	const lastPage = Math.max(1, Math.ceil(entries.length / pageSize));

	const currentPage = Math.min(page, lastPage);

	const onFilterChange = (nextFilter: InspectorFilter) => {
		setFilter(nextFilter);
		setPage(1);
	};

	const onSort = (label: Word) => {
		setSort((previousSort) => ({
			direction:
				previousSort?.label === label &&
				previousSort.direction === 'asc'
					? 'desc'
					: 'asc',
			label,
		}));
		setPage(1);
	};

	const getSortSymbol = (label: Word) => {
		if (sort?.label !== label) {
			return 'caret-double-l';
		}

		return sort.direction === 'asc' ? 'caret-top-l' : 'caret-bottom-l';
	};

	const toggleSource = (entryId: number) =>
		setExpandedId(expandedId === entryId ? null : entryId);

	const onToggleColumn = (label: Word) =>
		setHiddenColumns((previousColumns) => {
			const nextColumns = new Set(previousColumns);

			if (!nextColumns.delete(label)) {
				nextColumns.add(label);
			}

			return nextColumns;
		});

	const content = (
		<>
			{error && <ClayAlert displayType="danger">{error}</ClayAlert>}

			{truncated && (
				<ClayAlert displayType="warning">
					{i18n.sub('only-x-of-x-records-could-be-loaded', [
						String(allEntries.length),
						String(totalCount),
					])}
				</ClayAlert>
			)}

			{!error && !allEntries.length && (
				<p className="mb-0 text-secondary">
					{i18n.translate('no-records')}
				</p>
			)}

			{Boolean(allEntries.length) && (
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

			{Boolean(allEntries.length) && !entries.length && (
				<p className="mb-0 text-secondary">
					{i18n.translate('no-matching-records')}
				</p>
			)}

			{Boolean(entries.length) && (
				<ClayTable
					borderless
					className="account-inspector-table"
					hover
					striped={false}
				>
					<ClayTable.Head>
						<ClayTable.Row>
							{columns.map(({label, sortable}) => (
								<ClayTable.Cell headingCell key={label}>
									{sortable ? (
										<button
											className="account-inspector-sort-button btn btn-unstyled font-weight-semi-bold"
											onClick={() => onSort(label)}
											type="button"
										>
											{i18n.translate(label)}

											<ClayIcon
												className="ml-1"
												symbol={getSortSymbol(label)}
											/>
										</button>
									) : (
										i18n.translate(label)
									)}
								</ClayTable.Cell>
							))}

							<ClayTable.Cell
								className="account-inspector-actions-cell"
								headingCell
							/>
						</ClayTable.Row>
					</ClayTable.Head>

					<ClayTable.Body>
						{entries
							.slice(
								(currentPage - 1) * pageSize,
								currentPage * pageSize
							)
							.map((entry) => (
								<Fragment key={entry.id}>
									<ClayTable.Row
										className={classNames({
											'account-inspector-flagged-row':
												flaggedIds.has(entry.id),
										})}
										id={`${id}-${entry.id}`}
									>
										{columns.map(
											({label, render, value}) => {
												const text =
													formatInspectedValue(
														value(
															entry,
															NO_ACCOUNT_ID
														)
													);

												return (
													<ClayTable.Cell
														key={label}
														title={text}
													>
														{render
															? render(entry)
															: text}
													</ClayTable.Cell>
												);
											}
										)}

										<ClayTable.Cell
											align="right"
											className="account-inspector-actions-cell"
										>
											{getRowActions ? (
												<RowActionsMenu
													actions={[
														{
															label:
																expandedId ===
																entry.id
																	? 'hide-source'
																	: 'view-source',
															onClick: () =>
																toggleSource(
																	entry.id
																),
														},
														...getRowActions(entry),
													]}
												/>
											) : (
												<ClayButtonWithIcon
													aria-label={i18n.translate(
														expandedId === entry.id
															? 'hide-json'
															: 'view-json'
													)}
													borderless
													displayType="secondary"
													onClick={() =>
														toggleSource(entry.id)
													}
													size="sm"
													symbol="code"
													title={i18n.translate(
														expandedId === entry.id
															? 'hide-json'
															: 'view-json'
													)}
												/>
											)}
										</ClayTable.Cell>
									</ClayTable.Row>

									{expandedId === entry.id && (
										<ClayTable.Row>
											<ClayTable.Cell
												className="account-inspector-json-cell"
												colSpan={columns.length + 1}
											>
												<pre className="account-inspector-json mb-0">
													{JSON.stringify(
														entry,
														null,
														2
													)}
												</pre>
											</ClayTable.Cell>
										</ClayTable.Row>
									)}
								</Fragment>
							))}
					</ClayTable.Body>
				</ClayTable>
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
		</>
	);

	if (bare) {
		return (
			<div className="border mb-4 px-3 py-2 rounded-lg" id={id}>
				{content}
			</div>
		);
	}

	return (
		<InspectorSection
			badges={
				<>
					<ClayLabel displayType="info">{totalCount}</ClayLabel>

					{error && (
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
			defaultExpanded={
				defaultExpanded ||
				Boolean(error || truncated || flaggedIds.size)
			}
			id={id}
			title={title}
		>
			{content}
		</InspectorSection>
	);
}
