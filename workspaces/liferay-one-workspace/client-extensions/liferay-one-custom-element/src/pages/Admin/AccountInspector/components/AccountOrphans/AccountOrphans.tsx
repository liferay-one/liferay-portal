/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Link} from 'react-router';
import i18n from '~/i18n';
import InspectorTable from '~/pages/Admin/components/InspectorTable/InspectorTable';

import getAccountPath from '../../utils/getAccountPath';

import type {Word} from '~/i18n';
import type {InspectorTableColumn} from '~/pages/Admin/components/InspectorTable/InspectorTable';
import type {
	AccountOrphanKey,
	AccountOrphans as AccountOrphanLists,
} from '~/services/queries/accountOrphansQuery';
import type {InspectedEntry} from '~/types/accountInspection';

type Column = InspectorTableColumn<InspectedEntry>;

function field(label: Word, fieldName: string): Column {
	return {
		label,
		sortable: true,
		value: (entry) => entry[fieldName],
	};
}

function accountColumn(externalReferenceCodeFieldName: string): Column {
	return {
		label: 'account',
		render: (entry) =>
			entry[externalReferenceCodeFieldName] ? (
				<Link
					to={getAccountPath(
						String(entry[externalReferenceCodeFieldName])
					)}
				>
					{String(entry[externalReferenceCodeFieldName])}
				</Link>
			) : (
				'-'
			),
		sortable: true,
		value: (entry) => entry[externalReferenceCodeFieldName],
	};
}

const ID_COLUMN = field('id', 'id');

const ERC_COLUMN = field('external-reference-code', 'externalReferenceCode');

const ACCOUNT_ORPHAN_SECTIONS: {
	columns: Column[];
	key: AccountOrphanKey;
	title: Word;
}[] = [
	{
		columns: [
			{
				label: 'name',
				render: ({externalReferenceCode, name}) => (
					<Link to={getAccountPath(String(externalReferenceCode))}>
						<b>{String(name)}</b>
					</Link>
				),
				sortable: true,
				value: ({name}) => name,
			},
			ID_COLUMN,
			ERC_COLUMN,
			field('type', 'type'),
		],
		key: 'accountsWithoutUsers',
		title: 'accounts-without-users',
	},
	{
		columns: [
			ID_COLUMN,
			accountColumn('r_accountEntryToProjectMembership_accountEntryERC'),
			field('project', 'r_projectToProjectMembership_c_projectERC'),
			field('user', 'r_userToProjectMembership_userERC'),
		],
		key: 'projectMembershipsOutsideAccount',
		title: 'project-memberships-whose-user-is-not-in-the-account',
	},
	{
		columns: [ID_COLUMN, field('name', 'name'), ERC_COLUMN],
		key: 'projectsWithoutAccount',
		title: 'projects-without-an-account',
	},
	{
		columns: [
			ID_COLUMN,
			field('name', 'name'),
			ERC_COLUMN,
			field('project', 'r_projectToContract_c_projectERC'),
		],
		key: 'contractsWithoutAccount',
		title: 'contracts-without-an-account',
	},
	{
		columns: [
			ID_COLUMN,
			field('name', 'name'),
			field('sku', 'skuExternalReferenceCode'),
			field(
				'entitlement-definition',
				'r_entitlementDefinitionToEntitlement_c_entitlementDefinitionERC'
			),
			ERC_COLUMN,
		],
		key: 'entitlementsWithoutAccount',
		title: 'entitlements-without-an-account',
	},
	{
		columns: [
			ID_COLUMN,
			field('name', 'name'),
			field('sku', 'skuExternalReferenceCode'),
			accountColumn('r_accountEntryToEntitlement_accountEntryERC'),
			ERC_COLUMN,
		],
		key: 'entitlementsWithoutDefinition',
		title: 'entitlements-without-an-entitlement-definition',
	},
	{
		columns: [
			ID_COLUMN,
			ERC_COLUMN,
			field('project', 'r_projectToLicenseKey_c_projectERC'),
			field('entitlement', 'r_entitlementToLicenseKey_c_entitlementERC'),
		],
		key: 'licenseKeysWithoutAccount',
		title: 'license-keys-without-an-account',
	},
	{
		columns: [ID_COLUMN, ERC_COLUMN],
		key: 'activationKeysWithoutAccount',
		title: 'activation-keys-without-an-account',
	},
];

type AccountOrphansProps = {
	orphans: AccountOrphanLists;
};

export default function AccountOrphans({orphans}: AccountOrphansProps) {
	return (
		<div className="account-inspector">
			<h3 className="mb-3 mt-4">{i18n.translate('orphans')}</h3>

			{ACCOUNT_ORPHAN_SECTIONS.map(({columns, key, title}) => (
				<InspectorTable
					columns={columns}
					entries={orphans[key].items}
					error={orphans[key].error}
					id={`account-inspector-orphans-${key}`}
					key={key}
					title={i18n.translate(title)}
					totalCount={orphans[key].totalCount}
					truncated={orphans[key].truncated}
				/>
			))}
		</div>
	);
}
