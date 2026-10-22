/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {format} from 'date-fns';
import {Fragment} from 'react';
import i18n, {Word} from '~/i18n';

import {DetailsRow} from '../components/DetailsCard/DetailsCard';
import {DetailsSection} from '../components/SectionedDetailsCard/SectionedDetailsCard';

import type {EnvironmentEntitlement} from '~/hooks/useProductEnvironmentEntitlements';
import type {ProjectContract} from '~/hooks/useProjectCommerce';
import type {ProjectContact} from '~/hooks/useProjectContacts';

import type {DetailsProfile} from './resolveDetailsProfile';

type DetailsContext = {
	accountName: string;
	contract?: ProjectContract;
	environmentEntitlements?: EnvironmentEntitlement[];
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

const ENVIRONMENTS: Word[] = ['production', 'non-production'];

function formatDate(value?: string): string {
	if (!value) {
		return '';
	}

	const date = new Date(value);

	return format(
		new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
		'MMM d, yyyy'
	);
}

function getStatus(startDate: string, endDate: string): Word {
	const now = new Date();

	if (startDate && now < new Date(startDate)) {
		return 'not-activated';
	}

	if (endDate && now > new Date(endDate)) {
		return 'expired';
	}

	return 'active';
}

function summarizeEnvironments(
	environmentEntitlements: EnvironmentEntitlement[]
): EnvironmentEntitlement[] {
	const environmentSummaries = new Map<string, EnvironmentEntitlement>();

	for (const environmentEntitlement of environmentEntitlements) {
		const {environment} = environmentEntitlement;

		if (environment && !ENVIRONMENTS.includes(environment as Word)) {
			continue;
		}

		const environmentSummary = environmentSummaries.get(environment);

		if (!environmentSummary) {
			environmentSummaries.set(environment, {...environmentEntitlement});

			continue;
		}

		environmentSummary.provisionedCount +=
			environmentEntitlement.provisionedCount;
		environmentSummary.quantity += environmentEntitlement.quantity;

		if (environmentEntitlement.startDate < environmentSummary.startDate) {
			environmentSummary.startDate = environmentEntitlement.startDate;
		}

		if (environmentEntitlement.endDate > environmentSummary.endDate) {
			environmentSummary.endDate = environmentEntitlement.endDate;
		}
	}

	return [...environmentSummaries.values()].sort(
		(environmentSummary1, environmentSummary2) =>
			ENVIRONMENTS.indexOf(environmentSummary1.environment as Word) -
			ENVIRONMENTS.indexOf(environmentSummary2.environment as Word)
	);
}

function environmentSections(
	context: DetailsContext,
	toRows: (environmentSummary: EnvironmentEntitlement) => DetailsRow[]
): DetailsSection[] {
	const environmentSummaries = summarizeEnvironments(
		context.environmentEntitlements ?? []
	);

	if (!environmentSummaries.length) {
		return [
			{rows: [...orderRows(context), ...contractRows(context.contract)]},
		];
	}

	return environmentSummaries.map((environmentSummary) => ({
		id: environmentSummary.environment,
		rows: toRows(environmentSummary),
		title: environmentSummary.environment
			? i18n.translate(environmentSummary.environment as Word)
			: undefined,
	}));
}

function environmentDateRows(
	environmentSummary: EnvironmentEntitlement
): DetailsRow[] {
	const {endDate, startDate} = environmentSummary;

	return [
		{label: i18n.translate('start-date'), value: formatDate(startDate)},
		{label: i18n.translate('expiration-date'), value: formatDate(endDate)},
		{
			label: i18n.translate('status'),
			value: i18n.translate(getStatus(startDate, endDate)),
		},
	];
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
	'env-commerce': (context) =>
		environmentSections(context, (environmentSummary) => [
			{
				label: i18n.translate('purchased'),
				value: String(environmentSummary.quantity),
			},
			...environmentDateRows(environmentSummary),
		]),
	'env-instance': (context) =>
		environmentSections(context, (environmentSummary) => [
			{
				label: i18n.translate('keys-provisioned'),
				value: i18n.sub('x-of-x', [
					String(environmentSummary.provisionedCount),
					String(environmentSummary.quantity),
				]),
			},
			...environmentDateRows(environmentSummary),
		]),
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
