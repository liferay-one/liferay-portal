/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {format} from 'date-fns';
import {Fragment} from 'react';
import i18n, {Word} from '~/i18n';

import {DetailsRow} from '../components/DetailsCard/DetailsCard';
import {DetailsSection} from '../components/SectionedDetailsCard/SectionedDetailsCard';

import type {ProjectContract} from '~/hooks/useProjectCommerce';
import type {ProjectContact} from '~/hooks/useProjectContacts';

import type {DetailsProfile} from './resolveDetailsProfile';

type DetailsContext = {
	accountName: string;
	contract?: ProjectContract;
	orderInfo: {
		itemName: string;
		orderDate: string;
		orderId: string;
		purchaseNumber: string;
		purchasedBy: string;
		quantity: string;
	};
	productName: string;
	securityIncidentContacts?: ProjectContact[];
};

function formatDate(value?: string): string {
	return value ? format(new Date(value), 'MMM d, yyyy') : '';
}

function orderRows(context: DetailsContext): DetailsRow[] {
	const {accountName, orderInfo} = context;

	return [
		{label: i18n.translate('order-id'), value: orderInfo.orderId},
		{label: i18n.translate('order-date'), value: orderInfo.orderDate},
		{
			label: i18n.translate('purchase-number'),
			value: orderInfo.purchaseNumber,
		},
		{label: i18n.translate('customer-account'), value: accountName},
		{label: i18n.translate('purchased-by'), value: orderInfo.purchasedBy},
	];
}

function contractRows(contract?: ProjectContract): DetailsRow[] {
	return [
		{
			label: i18n.translate('start-date'),
			value: formatDate(contract?.startDate),
		},
		{
			label: i18n.translate('expiration-date'),
			value: formatDate(contract?.endDate),
		},
		{
			label: i18n.translate('status'),
			value: contract?.status
				? i18n.translate(contract.status as Word)
				: '',
		},
	];
}

function purchasedRow(context: DetailsContext): DetailsRow {
	return {
		label: i18n.translate('purchased'),
		value: context.orderInfo.quantity,
	};
}

function securityIncidentContactRow(context: DetailsContext): DetailsRow {
	return {
		label: i18n.translate('security-incident-contact'),
		value: (context.securityIncidentContacts ?? []).map(
			({emailAddress, name}, index) => (
				<Fragment key={emailAddress}>
					{index > 0 && ', '}

					<a href={`mailto:${emailAddress}`}>{name}</a>
				</Fragment>
			)
		),
	};
}

function tierRow(context: DetailsContext): DetailsRow {
	const {orderInfo, productName} = context;

	return {
		label: i18n.translate('tier-name'),
		value: orderInfo.itemName || productName,
	};
}

const DETAILS_SECTIONS_BY_PROFILE: Record<
	DetailsProfile,
	(context: DetailsContext) => DetailsSection[]
> = {
	'analytics': (context) => [
		{
			rows: [
				tierRow(context),
				purchasedRow(context),
				...contractRows(context.contract),
			],
		},
	],
	'basic': (context) => [{rows: orderRows(context)}],
	'basic-incident': (context) => [
		{
			rows: [...orderRows(context), securityIncidentContactRow(context)],
		},
	],
	'dates-status': (context) => [{rows: contractRows(context.contract)}],
	'env-commerce': (context) => [
		{rows: [...orderRows(context), ...contractRows(context.contract)]},
	],
	'env-instance': (context) => [
		{rows: [...orderRows(context), ...contractRows(context.contract)]},
	],
	'paas': (context) => [
		{rows: [tierRow(context), ...contractRows(context.contract)]},
	],
	'saas': (context) => [
		{rows: [tierRow(context), ...contractRows(context.contract)]},
	],
};

export function buildDetailsSections(
	profile: DetailsProfile,
	context: DetailsContext
): DetailsSection[] {
	return (
		DETAILS_SECTIONS_BY_PROFILE[profile] ??
		DETAILS_SECTIONS_BY_PROFILE.basic
	)(context);
}

export default buildDetailsSections;
