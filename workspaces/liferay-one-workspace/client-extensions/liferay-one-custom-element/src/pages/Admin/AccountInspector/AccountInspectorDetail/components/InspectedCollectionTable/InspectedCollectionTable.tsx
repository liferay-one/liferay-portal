/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayTable from '@clayui/table';
import classNames from 'classnames';
import {Fragment, useState} from 'react';
import i18n from '~/i18n';

import {formatInspectedValue} from '../../utils/inspectorFilterUtils';
import RecordActionsMenu from '../RecordActionsMenu/RecordActionsMenu';

import type {
	InspectedCollectionKey,
	InspectedEntry,
} from '~/types/accountInspection';
import type {Account} from '~/types/accounts';

import type {InspectedCollectionColumn} from '../../utils/inspectedCollectionConstants';

export function toRowId(collectionKey: string, recordId: number) {
	return `account-inspector-${collectionKey}-${recordId}`;
}

type InspectedCollectionTableProps = {
	account: Account;
	collectionKey: InspectedCollectionKey;
	columns: InspectedCollectionColumn[];
	entries: InspectedEntry[];
	flaggedIds: Set<number | string>;
	focusedId?: number;
};

export default function InspectedCollectionTable({
	account,
	collectionKey,
	columns,
	entries,
	flaggedIds,
	focusedId,
}: InspectedCollectionTableProps) {
	const [expandedId, setExpandedId] = useState<number | null>(null);

	return (
		<ClayTable
			borderless
			className="account-inspector-table"
			hover
			striped={false}
		>
			<ClayTable.Head>
				<ClayTable.Row>
					{columns.map(({label}) => (
						<ClayTable.Cell headingCell key={label}>
							{i18n.translate(label)}
						</ClayTable.Cell>
					))}

					<ClayTable.Cell
						className="account-inspector-actions-cell"
						headingCell
					/>
				</ClayTable.Row>
			</ClayTable.Head>

			<ClayTable.Body>
				{entries.map((entry) => (
					<Fragment key={entry.id}>
						<ClayTable.Row
							className={classNames({
								'account-inspector-flagged-row': flaggedIds.has(
									entry.id
								),
								'account-inspector-focused-row':
									focusedId === entry.id,
							})}
							id={toRowId(collectionKey, entry.id)}
						>
							{columns.map(({label, value}) => {
								const text = formatInspectedValue(
									value(entry, account.id)
								);

								return (
									<ClayTable.Cell key={label} title={text}>
										{text}
									</ClayTable.Cell>
								);
							})}

							<ClayTable.Cell
								align="right"
								className="account-inspector-actions-cell"
							>
								<RecordActionsMenu
									account={account}
									collection={collectionKey}
									entry={entry}
									jsonVisible={expandedId === entry.id}
									onToggleJSON={() =>
										setExpandedId(
											expandedId === entry.id
												? null
												: entry.id
										)
									}
								/>
							</ClayTable.Cell>
						</ClayTable.Row>

						{expandedId === entry.id && (
							<ClayTable.Row>
								<ClayTable.Cell
									className="account-inspector-json-cell"
									colSpan={columns.length + 1}
								>
									<pre className="account-inspector-json mb-0">
										{JSON.stringify(entry, null, 2)}
									</pre>
								</ClayTable.Cell>
							</ClayTable.Row>
						)}
					</Fragment>
				))}
			</ClayTable.Body>
		</ClayTable>
	);
}
