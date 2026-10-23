/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {format, startOfToday} from 'date-fns';
import {Fragment} from 'react';
import {ENVIRONMENTS} from '~/hooks/useProductEnvironmentEntitlements';
import i18n, {Word} from '~/i18n';
import {toUTCCalendarDate} from '~/utils/dateUtils';

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
	orderDate?: string;
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

const ENVIRONMENT_ORDER: Word[] = [...ENVIRONMENTS, 'backup', 'limited'];

const ENTITLEMENT_STATUSES: Word[] = [
	'active',
	'not-activated',
	'suspended',
	'expired',
	'terminated',
];

type EnvironmentSummary = {
	endDate: string;
	environment: string;
	instanceSizes: string[];
	provisionedCount?: number;
	quantity: number;
	startDate: string;
	status: Word;
};

function formatDate(value?: string): string {
	return value ? format(toUTCCalendarDate(value), 'MMM d, yyyy') : '';
}

function getStatus({
	endDate,
	startDate,
	terminationStatus,
}: EnvironmentEntitlement): Word {
	if (
		terminationStatus === 'suspended' ||
		terminationStatus === 'terminated'
	) {
		return terminationStatus;
	}

	const today = startOfToday();

	if (startDate && today < toUTCCalendarDate(startDate)) {
		return 'not-activated';
	}

	if (endDate && today >= toUTCCalendarDate(endDate)) {
		return 'expired';
	}

	return 'active';
}

function sortDates(values: string[]): string[] {
	return values
		.filter(Boolean)
		.sort(
			(value1, value2) =>
				new Date(value1).getTime() - new Date(value2).getTime()
		);
}

function selectTerm(environmentEntitlements: EnvironmentEntitlement[]) {
	const statuses = environmentEntitlements.map(getStatus);

	const status =
		ENTITLEMENT_STATUSES.find((entitlementStatus) =>
			statuses.includes(entitlementStatus)
		) ?? 'active';

	const term = environmentEntitlements.filter(
		(environmentEntitlement, index) => statuses[index] === status
	);

	if (status === 'active') {
		return {status, term};
	}

	if (status === 'not-activated') {
		const [startDate] = sortDates(term.map(({startDate}) => startDate));

		return {
			status,
			term: term.filter(
				(environmentEntitlement) =>
					environmentEntitlement.startDate === startDate
			),
		};
	}

	const endDate = sortDates(term.map(({endDate}) => endDate)).at(-1);

	return {
		status,
		term: term.filter(
			(environmentEntitlement) =>
				environmentEntitlement.endDate === endDate
		),
	};
}

function summarizeEnvironment(
	environment: string,
	environmentEntitlements: EnvironmentEntitlement[]
): EnvironmentSummary {
	const {status, term} = selectTerm(environmentEntitlements);

	const provisionedCounted = term.every(
		({provisionedCount}) => provisionedCount !== undefined
	);

	return {
		endDate: sortDates(term.map(({endDate}) => endDate)).at(-1) ?? '',
		environment,
		instanceSizes: [
			...new Set(term.map(({instanceSize}) => instanceSize)),
		].filter(Boolean),
		provisionedCount: provisionedCounted
			? term.reduce(
					(total, {provisionedCount}) =>
						total + (provisionedCount ?? 0),
					0
				)
			: undefined,
		quantity: term.reduce((total, {quantity}) => total + quantity, 0),
		startDate: sortDates(term.map(({startDate}) => startDate))[0] ?? '',
		status,
	};
}

function getEnvironmentRank(environment: string): number {
	const index = ENVIRONMENT_ORDER.indexOf(environment as Word);

	return index === -1 ? ENVIRONMENT_ORDER.length : index;
}

function summarizeEnvironments(
	environmentEntitlements: EnvironmentEntitlement[]
): EnvironmentSummary[] {
	const entitlementsByEnvironment = new Map<
		string,
		EnvironmentEntitlement[]
	>();

	for (const environmentEntitlement of environmentEntitlements) {
		const {environment} = environmentEntitlement;

		entitlementsByEnvironment.set(environment, [
			...(entitlementsByEnvironment.get(environment) ?? []),
			environmentEntitlement,
		]);
	}

	return [...entitlementsByEnvironment]
		.map(([environment, entitlements]) =>
			summarizeEnvironment(environment, entitlements)
		)
		.sort(
			(environmentSummary1, environmentSummary2) =>
				getEnvironmentRank(environmentSummary1.environment) -
				getEnvironmentRank(environmentSummary2.environment)
		);
}

function environmentSections(
	context: DetailsContext,
	toRows: (environmentSummary: EnvironmentSummary) => DetailsRow[]
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
	environmentSummary: EnvironmentSummary
): DetailsRow[] {
	const {endDate, startDate, status} = environmentSummary;

	return [
		{label: i18n.translate('start-date'), value: formatDate(startDate)},
		{label: i18n.translate('expiration-date'), value: formatDate(endDate)},
		{label: i18n.translate('status'), value: i18n.translate(status)},
	];
}

function instanceSizeRow(environmentSummary: EnvironmentSummary): DetailsRow {
	return {
		label: i18n.translate('instance-size'),
		value: environmentSummary.instanceSizes.join(', ') || '-',
	};
}

function keysProvisioned(environmentSummary: EnvironmentSummary): string {
	const {provisionedCount, quantity} = environmentSummary;

	if (provisionedCount === undefined) {
		return '-';
	}

	return i18n.sub('x-of-x', [String(provisionedCount), String(quantity)]);
}

function orderRows(context: DetailsContext): DetailsRow[] {
	const {accountName, orderDate, orderInfo} = context;

	return [
		{label: i18n.translate('order-id'), value: orderInfo.orderId},
		{
			label: i18n.translate('order-date'),
			value: orderDate ? formatDate(orderDate) : orderInfo.orderDate,
		},
		{
			label: i18n.translate('purchase-number'),
			value: orderInfo.purchaseNumber,
		},
		{label: i18n.translate('customer-account'), value: accountName},
		...(orderInfo.purchasedBy
			? [
					{
						label: i18n.translate('purchased-by'),
						value: orderInfo.purchasedBy,
					},
				]
			: []),
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
			instanceSizeRow(environmentSummary),
			{
				label: i18n.translate('keys-provisioned'),
				value: keysProvisioned(environmentSummary),
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
