/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton, {ClayButtonWithIcon} from '@clayui/button';
import ClayDropDown from '@clayui/drop-down';
import {ClayCheckbox, ClayInput} from '@clayui/form';
import ClayIcon from '@clayui/icon';
import {ClayPaginationBarWithBasicItems} from '@clayui/pagination-bar';
import ClayTable from '@clayui/table';
import classNames from 'classnames';
import {
	ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import {useLocation, useSearchParams} from 'react-router';
import Button from '~/components/Button/Button';
import {Word, translate} from '~/i18n';
import MarketplaceStorage, {
	STORAGE_KEYS,
} from '~/services/liferay/MarketplaceStorage';

import './FilterableListCard.css';

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

const DATE_BOUND_PATTERN = /^(after|before):\d{4}-\d{2}-\d{2}$/;

const FILTER_SEARCH_MIN_OPTIONS = 10;

const PAGE_PARAMETER = 'page';

const PAGE_SIZE_PARAMETER = 'pageSize';

export const RESET_LIST_STATE = {resetList: true};

const SEARCH_PARAMETER = 'search';

const SORT_PARAMETER = 'sort';

export type FilterOption = {label: string; value: string};

export type ListFilter<T> = {
	formatValue?: (value: string) => string;
	key: string;
	label: Word;
	matches: (item: T, values: string[]) => boolean;
	options?: FilterOption[];
	variant?: 'checkbox' | 'date-range';
};

export type ListColumn<T> = {
	expanded?: boolean;
	heading?: Word;
	key: string;
	noWrap?: boolean;
	render: (item: T) => ReactNode;
	sortValue?: (item: T) => number | string;
	width?: string;
};

type ListSort = {
	ascending: boolean;
	key: string;
};

type FilterableListCardProps<T> = {
	action?: ReactNode;
	className?: string;
	columns: ListColumn<T>[];
	defaultPageSize?: number;
	emptyLabel: Word;
	filterIconOnly?: boolean;
	filters?: ListFilter<T>[];
	hideToolbar?: boolean;
	items: T[];
	loading?: boolean;
	matchesSearch?: (item: T, search: string) => boolean;
	onItemClick?: (item: T) => void;
	persistKey?: string;
	rowKey: (item: T) => string;
	title?: Word;
};

type FilterSubPanelProps = {
	onApply: (values: string[]) => void;
	onBack: () => void;
	options: FilterOption[];
	selectedValues: string[];
	title: string;
	variant: 'checkbox' | 'date-range';
};

function compareSortValues(
	first: number | string,
	second: number | string
): number {
	if (typeof first === 'number' && typeof second === 'number') {
		return first - second;
	}

	return String(first).localeCompare(String(second), undefined, {
		numeric: true,
		sensitivity: 'base',
	});
}

function getBoundValue(values: string[], bound: string): string {
	const match = values.find((value) => value.startsWith(`${bound}:`));

	return match ? match.slice(bound.length + 1) : '';
}

function getOwnedSearchParams(
	ownedKeys: string[],
	searchParams: URLSearchParams
): URLSearchParams {
	const ownedSearchParams = new URLSearchParams();

	searchParams.forEach((value, key) => {
		if (ownedKeys.includes(key)) {
			ownedSearchParams.append(key, value);
		}
	});

	return ownedSearchParams;
}

function getPage(searchParams: URLSearchParams): number {
	const page = Number(searchParams.get(PAGE_PARAMETER));

	return Number.isInteger(page) && page > 0 ? page : 1;
}

function getPageSize(
	defaultPageSize: number,
	searchParams: URLSearchParams
): number {
	const pageSize = Number(searchParams.get(PAGE_SIZE_PARAMETER));

	return PAGE_SIZE_OPTIONS.includes(pageSize) ? pageSize : defaultPageSize;
}

function getSort<T>(
	columns: ListColumn<T>[],
	searchParams: URLSearchParams
): ListSort | null {
	const [key, direction] = (searchParams.get(SORT_PARAMETER) ?? '').split(
		':'
	);

	if (
		(direction !== 'asc' && direction !== 'desc') ||
		!columns.some((column) => column.key === key && column.sortValue)
	) {
		return null;
	}

	return {ascending: direction === 'asc', key};
}

function getStorageKey(pathname: string, persistKey: string): STORAGE_KEYS {
	return `${STORAGE_KEYS.FILTERABLE_LIST_CARD}${persistKey}:${pathname}` as STORAGE_KEYS;
}

function isResetListState(state: unknown): boolean {
	return Boolean(
		state &&
			typeof state === 'object' &&
			(state as {resetList?: boolean}).resetList
	);
}

function readStoredSearch(storageKey: STORAGE_KEYS): string | null {
	try {
		return (
			MarketplaceStorage.getInstance()
				.getStorage('temporary')
				.getItem(storageKey) || null
		);
	}
	catch {
		return null;
	}
}

function writeStoredSearch(search: string, storageKey: STORAGE_KEYS) {
	try {
		const storage =
			MarketplaceStorage.getInstance().getStorage('temporary');

		if (search) {
			storage.setItem(storageKey, search);
		}
		else {
			storage.removeItem(storageKey);
		}
	}
	catch {}
}

function FilterSubPanel({
	onApply,
	onBack,
	options,
	selectedValues,
	title,
	variant,
}: FilterSubPanelProps) {
	const [keywords, setKeywords] = useState('');
	const [draftValues, setDraftValues] = useState<string[]>(selectedValues);
	const [after, setAfter] = useState(() =>
		getBoundValue(selectedValues, 'after')
	);
	const [before, setBefore] = useState(() =>
		getBoundValue(selectedValues, 'before')
	);

	const filteredOptions = options.filter(({label}) =>
		label.toLowerCase().includes(keywords.trim().toLowerCase())
	);

	const toggleValue = (value: string) =>
		setDraftValues((previous) =>
			previous.includes(value)
				? previous.filter((current) => current !== value)
				: [...previous, value]
		);

	const applyDateRange = () =>
		onApply(
			[
				after ? `after:${after}` : '',
				before ? `before:${before}` : '',
			].filter(Boolean)
		);

	return (
		<div className="list-card-filter-panel">
			<button
				className="list-card-filter-back"
				onClick={onBack}
				type="button"
			>
				<ClayIcon symbol="angle-left" />

				<span className="list-card-filter-title">{title}</span>
			</button>

			{variant === 'date-range' ? (
				<>
					<div className="list-card-filter-options mt-3">
						<label>
							{translate('after')}

							<ClayInput
								onChange={(event) =>
									setAfter(event.target.value)
								}
								type="date"
								value={after}
							/>
						</label>

						<label className="mt-2">
							{translate('before')}

							<ClayInput
								onChange={(event) =>
									setBefore(event.target.value)
								}
								type="date"
								value={before}
							/>
						</label>
					</div>

					<ClayButton
						className="list-card-filter-apply w-100"
						onClick={applyDateRange}
					>
						{translate('add-filter')}
					</ClayButton>
				</>
			) : (
				<>
					{options.length > FILTER_SEARCH_MIN_OPTIONS && (
						<ClayInput
							className="list-card-filter-search mt-3"
							onChange={(event) =>
								setKeywords(event.target.value)
							}
							placeholder={translate('search')}
							type="text"
							value={keywords}
						/>
					)}

					<div className="list-card-filter-options mt-3">
						{filteredOptions.map(({label, value}) => (
							<ClayCheckbox
								checked={draftValues.includes(value)}
								key={value}
								label={label}
								onChange={() => toggleValue(value)}
							/>
						))}
					</div>

					<ClayButton
						className="list-card-filter-apply w-100"
						onClick={() => onApply(draftValues)}
					>
						{translate('add-filter')}
					</ClayButton>
				</>
			)}
		</div>
	);
}

function FilterableListCardContent<T>({
	action,
	className,
	columns,
	defaultPageSize = PAGE_SIZE_OPTIONS[0],
	emptyLabel,
	filterIconOnly = false,
	filters = [],
	hideToolbar = false,
	items,
	loading = false,
	matchesSearch,
	onItemClick,
	persistKey,
	rowKey,
	title,
}: FilterableListCardProps<T>) {
	const {pathname} = useLocation();
	const [searchParams, setSearchParams] = useSearchParams();
	const [filterActive, setFilterActive] = useState(false);
	const [activeFilterKey, setActiveFilterKey] = useState<string | null>(null);

	const [keywords, setKeywords] = useState(
		() => searchParams.get(SEARCH_PARAMETER) ?? ''
	);

	const page = getPage(searchParams);
	const pageSize = getPageSize(defaultPageSize, searchParams);

	const sort = useMemo(
		() => getSort(columns, searchParams),
		[columns, searchParams]
	);

	const ownedKeys = useMemo(
		() => [
			PAGE_PARAMETER,
			PAGE_SIZE_PARAMETER,
			SEARCH_PARAMETER,
			SORT_PARAMETER,
			...filters.map((filter) => filter.key),
		],
		[filters]
	);

	const ownedSearch = useMemo(
		() => getOwnedSearchParams(ownedKeys, searchParams).toString(),
		[ownedKeys, searchParams]
	);

	const [initialOwnedSearch] = useState(ownedSearch);
	const ownedSearchChangedRef = useRef(false);

	useEffect(() => {
		if (ownedSearch !== initialOwnedSearch) {
			ownedSearchChangedRef.current = true;
		}

		if (
			!persistKey ||
			(!ownedSearchChangedRef.current && (loading || !ownedSearch))
		) {
			return;
		}

		writeStoredSearch(ownedSearch, getStorageKey(pathname, persistKey));
	}, [initialOwnedSearch, loading, ownedSearch, pathname, persistKey]);

	const selectedFilters = useMemo(
		() =>
			Object.fromEntries(
				filters.map((filter) => [
					filter.key,
					searchParams
						.getAll(filter.key)
						.filter(
							(value) =>
								filter.variant !== 'date-range' ||
								DATE_BOUND_PATTERN.test(value)
						),
				])
			),
		[filters, searchParams]
	);

	const updateParameters = useCallback(
		(parameters: Record<string, string[]>) => {
			setSearchParams(
				(previousSearchParams) => {
					const nextSearchParams = new URLSearchParams(
						previousSearchParams
					);

					Object.entries(parameters).forEach(([key, values]) => {
						nextSearchParams.delete(key);

						values.forEach((value) =>
							nextSearchParams.append(key, value)
						);
					});

					return nextSearchParams;
				},
				{replace: true}
			);
		},
		[setSearchParams]
	);

	const setParameterValues = useCallback(
		(key: string, values: string[]) => {
			updateParameters({[PAGE_PARAMETER]: [], [key]: values});
		},
		[updateParameters]
	);

	const filteredItems = useMemo(() => {
		const search = keywords.trim().toLowerCase();

		return items.filter((item) => {
			if (search && matchesSearch && !matchesSearch(item, search)) {
				return false;
			}

			return filters.every((filter) => {
				const values = selectedFilters[filter.key] ?? [];

				return !values.length || filter.matches(item, values);
			});
		});
	}, [filters, items, keywords, matchesSearch, selectedFilters]);

	const sortedItems = useMemo(() => {
		const sortValue = columns.find(({key}) => key === sort?.key)?.sortValue;

		if (!sort || !sortValue) {
			return filteredItems;
		}

		return [...filteredItems].sort((first, second) => {
			const result = compareSortValues(
				sortValue(first),
				sortValue(second)
			);

			return sort.ascending ? result : -result;
		});
	}, [columns, filteredItems, sort]);

	const activePage = Math.min(
		page,
		Math.max(1, Math.ceil(sortedItems.length / pageSize))
	);

	const paginatedItems = useMemo(() => {
		const start = (activePage - 1) * pageSize;

		return sortedItems.slice(start, start + pageSize);
	}, [activePage, pageSize, sortedItems]);

	const activeFilters = useMemo(() => {
		const active: {
			label: string;
			onRemove: () => void;
			value: string;
		}[] = [];

		const hasMultipleCategories = filters.length > 1;

		filters.forEach((filter) => {
			const values = selectedFilters[filter.key] ?? [];

			values.forEach((value) => {
				const option = (filter.options ?? []).find(
					(current) => current.value === value
				);

				const optionLabel = filter.formatValue
					? filter.formatValue(value)
					: option?.label ?? value;

				active.push({
					label: hasMultipleCategories
						? `${translate(filter.label)}: ${optionLabel}`
						: optionLabel,
					onRemove: () =>
						setParameterValues(
							filter.key,
							values.filter((current) => current !== value)
						),
					value: `${filter.key}-${value}`,
				});
			});
		});

		return active;
	}, [filters, selectedFilters, setParameterValues]);

	const closeFilter = () => {
		setFilterActive(false);
		setActiveFilterKey(null);
	};

	const menuFilters = filters.filter(
		(filter) => filter.variant || filter.options?.length
	);

	const activeFilter = filters.find(
		(filter) => filter.key === activeFilterKey
	);

	const changeSort = (key: string) => {
		const ascending = sort?.key === key ? !sort.ascending : true;

		updateParameters({
			[PAGE_PARAMETER]: [],
			[SORT_PARAMETER]: [`${key}:${ascending ? 'asc' : 'desc'}`],
		});
	};

	const getSortSymbol = (key: string) => {
		if (sort?.key !== key) {
			return 'caret-double-l';
		}

		return sort.ascending ? 'caret-top-l' : 'caret-bottom-l';
	};

	const renderHead = () => (
		<ClayTable.Head>
			<ClayTable.Row>
				{columns.map((column) => (
					<ClayTable.Cell
						expanded={column.expanded}
						headingCell
						key={column.key}
						style={{
							whiteSpace: column.noWrap ? 'nowrap' : undefined,
							width: column.width,
						}}
					>
						{column.heading && column.sortValue ? (
							<button
								className="align-items-center d-flex list-card-sort-button"
								onClick={() => changeSort(column.key)}
								type="button"
							>
								{translate(column.heading)}

								<ClayIcon
									className="ml-1"
									symbol={getSortSymbol(column.key)}
								/>
							</button>
						) : column.heading ? (
							translate(column.heading)
						) : null}
					</ClayTable.Cell>
				))}
			</ClayTable.Row>
		</ClayTable.Head>
	);

	return (
		<div className={classNames('list-card mt-3', className)}>
			{title && (
				<div className="list-card-header">{translate(title)}</div>
			)}

			{!hideToolbar && (
				<div className="align-items-center d-flex list-card-toolbar">
					<ClayDropDown
						active={filterActive}
						className="list-card-filter-dropdown"
						menuElementAttrs={{className: 'list-card-filter-menu'}}
						onActiveChange={(active) => {
							setFilterActive(active);

							if (!active) {
								setActiveFilterKey(null);
							}
						}}
						trigger={
							filterIconOnly ? (
								<ClayButtonWithIcon
									aria-label={translate('filter')}
									displayType="secondary"
									symbol="filter"
									title={translate('filter')}
								/>
							) : (
								<Button
									appendIcon="caret-bottom"
									className="list-card-filter-button"
									displayType="secondary"
									prependIcon="filter"
								>
									{translate('filter')}
								</Button>
							)
						}
					>
						{activeFilter ? (
							<FilterSubPanel
								onApply={(values) => {
									setParameterValues(
										activeFilter.key,
										values
									);
									closeFilter();
								}}
								onBack={() => setActiveFilterKey(null)}
								options={activeFilter.options ?? []}
								selectedValues={
									selectedFilters[activeFilter.key] ?? []
								}
								title={translate(activeFilter.label)}
								variant={activeFilter.variant ?? 'checkbox'}
							/>
						) : (
							<div className="list-card-filter-panel">
								<div className="list-card-filter-heading">
									{translate('filters')}
								</div>

								{menuFilters.map((filter) => (
									<button
										className="align-items-center d-flex justify-content-between list-card-filter-category"
										key={filter.key}
										onClick={() =>
											setActiveFilterKey(filter.key)
										}
										type="button"
									>
										<span>{translate(filter.label)}</span>

										<ClayIcon symbol="angle-right" />
									</button>
								))}
							</div>
						)}
					</ClayDropDown>

					<ClayInput.Group className="list-card-search">
						<ClayInput.GroupItem>
							<ClayInput
								className="input-group-inset input-group-inset-after"
								onChange={(event) => {
									setKeywords(event.target.value);
									setParameterValues(
										SEARCH_PARAMETER,
										event.target.value
											? [event.target.value]
											: []
									);
								}}
								placeholder={translate('search')}
								type="text"
								value={keywords}
							/>

							<ClayInput.GroupInsetItem after tag="span">
								<ClayIcon
									className="text-neutral-7"
									symbol="search"
								/>
							</ClayInput.GroupInsetItem>
						</ClayInput.GroupItem>
					</ClayInput.Group>

					{action && (
						<div className="list-card-toolbar-action">{action}</div>
					)}
				</div>
			)}

			{!!activeFilters.length && (
				<div className="list-card-active-filters">
					{activeFilters.map(({label, onRemove, value}) => (
						<span className="list-card-filter-tag" key={value}>
							{label}

							<button
								className="list-card-filter-tag-close"
								onClick={onRemove}
								type="button"
							>
								<ClayIcon symbol="times" />
							</button>
						</span>
					))}
				</div>
			)}

			{loading ? (
				<ClayTable borderless className="list-card-table">
					{renderHead()}

					<ClayTable.Body>
						{Array.from({length: defaultPageSize}, (_, row) => (
							<ClayTable.Row key={row}>
								{columns.map((column) => (
									<ClayTable.Cell
										expanded={column.expanded}
										key={column.key}
										style={{width: column.width}}
									>
										{column.expanded ? (
											<span className="list-card-name-text w-100">
												<span className="list-card-skeleton list-card-skeleton-label" />

												<span className="list-card-skeleton list-card-skeleton-subtext" />
											</span>
										) : (
											<span className="list-card-skeleton" />
										)}
									</ClayTable.Cell>
								))}
							</ClayTable.Row>
						))}
					</ClayTable.Body>
				</ClayTable>
			) : paginatedItems.length ? (
				<>
					<ClayTable
						borderless
						className={
							onItemClick
								? 'list-card-table list-card-table-clickable'
								: 'list-card-table'
						}
					>
						{renderHead()}

						<ClayTable.Body>
							{paginatedItems.map((item) => (
								<ClayTable.Row
									key={rowKey(item)}
									onClick={
										onItemClick
											? () => onItemClick(item)
											: undefined
									}
								>
									{columns.map((column) => (
										<ClayTable.Cell
											expanded={column.expanded}
											key={column.key}
											style={{
												whiteSpace: column.noWrap
													? 'nowrap'
													: undefined,
												width: column.width,
											}}
										>
											{column.render(item)}
										</ClayTable.Cell>
									))}
								</ClayTable.Row>
							))}
						</ClayTable.Body>
					</ClayTable>

					<div className="list-card-pagination">
						<ClayPaginationBarWithBasicItems
							activeDelta={pageSize}
							activePage={activePage}
							deltas={PAGE_SIZE_OPTIONS.map((label) => ({
								label,
							}))}
							labels={{
								paginationResults: translate(
									'showing-x-to-x-of-x'
								),
								perPageItems: translate('x-items'),
								selectPerPageItems: translate('x-items'),
							}}
							onDeltaChange={(delta) =>
								updateParameters({
									[PAGE_PARAMETER]: [],
									[PAGE_SIZE_PARAMETER]:
										delta === defaultPageSize
											? []
											: [String(delta)],
								})
							}
							onPageChange={(nextPage) =>
								updateParameters({
									[PAGE_PARAMETER]:
										nextPage > 1 ? [String(nextPage)] : [],
								})
							}
							totalItems={sortedItems.length}
						/>
					</div>
				</>
			) : (
				<div className="p-4 text-neutral-7">
					{translate(emptyLabel)}
				</div>
			)}
		</div>
	);
}

export default function FilterableListCard<T>(
	props: FilterableListCardProps<T>
) {
	const {persistKey} = props;

	const {pathname, search, state} = useLocation();
	const [, setSearchParams] = useSearchParams();

	const resetList = isResetListState(state);

	const [storedSearch, setStoredSearch] = useState(() =>
		persistKey && !resetList && !search
			? readStoredSearch(getStorageKey(pathname, persistKey))
			: null
	);

	useEffect(() => {
		if (persistKey && resetList) {
			writeStoredSearch('', getStorageKey(pathname, persistKey));
		}
	}, [pathname, persistKey, resetList]);

	useEffect(() => {
		if (storedSearch === null) {
			return;
		}

		if (search) {
			setStoredSearch(null);

			return;
		}

		setSearchParams(new URLSearchParams(storedSearch), {replace: true});
	}, [search, setSearchParams, storedSearch]);

	if (storedSearch !== null) {
		return null;
	}

	return <FilterableListCardContent {...props} />;
}
