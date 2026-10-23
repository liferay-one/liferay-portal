/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useState} from 'react';
import DetailTable from '~/components/DetailTable/DetailTable';
import i18n from '~/i18n';
import {formatDate} from '~/utils/dateUtils';

import {
	EMPTY_FILTER,
	EMPTY_VALUE,
	formatInspectedValue,
} from '../../utils/inspectorFilterUtils';
import InspectorSection from '../InspectorSection/InspectorSection';
import InspectorToolbar from '../InspectorToolbar/InspectorToolbar';

import type {AccountInspection} from '~/types/accountInspection';

import type {InspectorFilter} from '../../utils/inspectorFilterUtils';

type DetailItem = {
	title: string;
	value: string;
};

type AccountSummaryProps = {
	inspection: AccountInspection;
};

export default function AccountSummary({
	inspection: {account, postalAddresses},
}: AccountSummaryProps) {
	const [filter, setFilter] = useState<InspectorFilter>(EMPTY_FILTER);

	const matchesSearch = (items: DetailItem[]) => {
		const search = filter.search.trim().toLowerCase();

		return search
			? items.filter(({title, value}) =>
					`${title} ${value}`.toLowerCase().includes(search)
				)
			: items;
	};

	return (
		<InspectorSection
			id="account-inspector-account"
			title={i18n.translate('account-details')}
		>
			<InspectorToolbar
				filter={filter}
				onChange={setFilter}
				showFlaggedOnly={false}
			/>

			<DetailTable
				columns={2}
				items={matchesSearch([
					{
						title: i18n.translate('id'),
						value: formatInspectedValue(account.id),
					},
					{
						title: i18n.translate('external-reference-code'),
						value: formatInspectedValue(
							account.externalReferenceCode
						),
					},
					{
						title: i18n.translate('type'),
						value: formatInspectedValue(account.type),
					},
					{
						title: i18n.translate('status'),
						value: formatInspectedValue(account.status),
					},
					{
						title: i18n.translate('number-of-users'),
						value: formatInspectedValue(account.numberOfUsers),
					},
					{
						title: i18n.translate('tax-id'),
						value: formatInspectedValue(account.taxId),
					},
					{
						title: i18n.translate('date-created'),
						value: formatDate(account.dateCreated),
					},
					{
						title: i18n.translate('default-billing-address'),
						value: formatInspectedValue(
							account.defaultBillingAddressId
						),
					},
					...(account.customFields ?? []).map(
						({customValue, name}) => ({
							title: name,
							value: formatInspectedValue(customValue?.data),
						})
					),
				])}
			/>

			<h4 className="mb-3 mt-4">{i18n.translate('addresses')}</h4>

			{postalAddresses.error ? (
				<p className="text-danger">{postalAddresses.error}</p>
			) : (
				<DetailTable
					items={matchesSearch(
						postalAddresses.items.length
							? postalAddresses.items.map((address) => ({
									title: `${address.name || address.id}${
										address.primary
											? ` (${i18n.translate('primary')})`
											: ''
									}`,
									value: [
										address.streetAddressLine1,
										address.addressLocality,
										address.addressRegion,
										address.postalCode,
										address.addressCountry,
									]
										.filter(Boolean)
										.join(', '),
								}))
							: [
									{
										title: i18n.translate('addresses'),
										value: EMPTY_VALUE,
									},
								]
					)}
				/>
			)}
		</InspectorSection>
	);
}
