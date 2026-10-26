/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayManagementToolbar from '@clayui/management-toolbar';
import {ReactElement, useContext} from 'react';
import ColumnsDropDown, {
	ColumnOption,
} from '~/components/ColumnsDropDown/ColumnsDropDown';
import {FieldOptions} from '~/components/FormRenderer/FormRenderer';
import {ListViewContext} from '~/components/ListView/context/ListViewContextProvider';
import ManagementToolbarFilter from '~/components/ManagementToolbarFilters/ManagementToolbarFilters';
import ManagementToolbarResultsBar from '~/components/ManagementToolbarResultsBar/ManagementToolbarResultsBar';
import ManagementToolbarSearch from '~/components/ManagementToolbarSearch/ManagementToolbarSearch';
import {
	FilterSchemaOption,
	filterSchema as filterSchemas,
} from '~/types/filters';

export type ManagementToolbarProps = {
	actionButton?: (
		filter: Record<string, unknown>,
		filterSchema?: FilterSchemaOption
	) => ReactElement;

	availableFilterOptions?: FieldOptions;
	columns?: ColumnOption[];
	filterIconOnly?: boolean;
	filterSchema?: FilterSchemaOption;
	onToggleColumn?: (id: string) => void;
	searchVisible?: boolean;
};

const ManagementToolbar: React.FC<ManagementToolbarProps> = ({
	actionButton,
	availableFilterOptions,
	columns,
	filterIconOnly = false,
	filterSchema,
	onToggleColumn,
	searchVisible = false,
}) => {
	const [{filters}] = useContext(ListViewContext);

	return (
		<>
			<ClayManagementToolbar>
				<div className="d-flex justify-content-between w-100">
					{filterSchema && (
						<ManagementToolbarFilter
							availableOptions={availableFilterOptions}
							filterSchema={
								filterSchemas[
									filterSchema as FilterSchemaOption
								]
							}
							iconOnly={filterIconOnly}
						/>
					)}

					{columns && onToggleColumn && (
						<div className="align-items-center d-flex">
							<ColumnsDropDown
								className="mr-2"
								columns={columns}
								onToggle={onToggleColumn}
							/>
						</div>
					)}

					{!!searchVisible && (
						<div className="d-flex w-100">
							<ManagementToolbarSearch />
							{actionButton &&
								actionButton(filters.filter, filterSchema)}
						</div>
					)}
				</div>

				{!!filters.entries?.filter(({value}) => value).length && (
					<ManagementToolbarResultsBar />
				)}
			</ClayManagementToolbar>
		</>
	);
};

export default ManagementToolbar;
