/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayDropDown from '@clayui/drop-down';
import {ClayTooltipProvider} from '@clayui/tooltip';
import {format} from 'date-fns';
import {MouseEvent, useEffect, useMemo, useRef} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import Button from '~/components/Button/Button';
import Page from '~/components/Page/Page';
import {useProject} from '~/context/ProjectContext';
import {
	ProjectActivationKey,
	useProjectActivationKeys,
} from '~/hooks/useProjectActivationKeys';
import {useProjectEnvironments} from '~/hooks/useProjectEnvironments';
import i18n, {Word, translate} from '~/i18n';
import {filterEnvironmentsByProject} from '~/pages/MyAccount/Projects/utils/filterEnvironmentsByProject';
import {getStatusColor} from '~/pages/MyAccount/Projects/utils/getStatusColor';
import {isRenewableKey} from '~/pages/MyAccount/Projects/utils/isRenewableKey';

import FilterableListCard, {
	FilterOption,
	ListColumn,
	ListFilter,
} from '../components/FilterableListCard/FilterableListCard';
import {useHasLicenseKeyPermission} from '../hooks/useHasActivationPermission';
import {useHasAdminPermission} from '../hooks/useHasAdminPermission';
import {useGenerateActivationKeyForm} from './GenerateActivationKey/hooks/useGenerateActivationKeyForm';
import {
	ACTIVATION_STATUS_ACTIVE,
	CLOUD_NATIVE_PRODUCT_EXTERNAL_REFERENCE_CODE,
	getLeadingProductLabel,
	isGeneratable,
} from './GenerateActivationKey/utils';
import useActivationKeyActions from './hooks/useActivationKeyActions';

import './LicenseKeys.css';

import type {ProjectEnvironment} from '~/hooks/useProjectEnvironments';
import type {
	GenerateForm,
	GenerateFormSubscription,
} from '~/services/spring-boot/ActivationKeys';

const ACTIVATION_MODE_OFFLINE = 'offline';

const CLOUD_NATIVE_OFFERING = 'Cloud Native';

const PRODUCTION_ENVIRONMENT_TYPE = 'production';

function getCloudNativeSubscription(
	generateForm?: GenerateForm,
	type?: string
): GenerateFormSubscription | undefined {
	const product = generateForm?.products.find(
		(current) =>
			current.externalReferenceCode ===
			CLOUD_NATIVE_PRODUCT_EXTERNAL_REFERENCE_CODE
	);

	const keyType =
		product?.keyTypes.find((current) => current.key === type) ??
		product?.keyTypes[0];

	return keyType?.subscriptions[0];
}

function toActivationKeyDate(value?: string): string {
	return value ? format(new Date(value), 'MMM d, yyyy') : '';
}

function toActivationKeyDateValue(value?: string): string {
	return value ? format(new Date(value), 'yyyy-MM-dd') : '';
}

function toCloudNativeActivationKey(
	environment: ProjectEnvironment,
	generateForm?: GenerateForm
): ProjectActivationKey {
	const subscription = getCloudNativeSubscription(
		generateForm,
		environment.type
	);

	return {
		activationKeyId: '',
		active: true,
		cloudNative: true,
		complimentary: false,
		description: '',
		environmentId: environment.externalReferenceCode,
		environmentType:
			environment.type === PRODUCTION_ENVIRONMENT_TYPE
				? 'production'
				: 'non-production',
		expirationDate: toActivationKeyDate(subscription?.endDate),
		expirationDateValue: toActivationKeyDateValue(subscription?.endDate),
		id: environment.externalReferenceCode,
		name: environment.name,
		offlineActivated:
			environment.activationMode === ACTIVATION_MODE_OFFLINE,
		productName: getLeadingProductLabel(
			CLOUD_NATIVE_PRODUCT_EXTERNAL_REFERENCE_CODE
		),
		productVersion: '',
		startDate: toActivationKeyDate(subscription?.startDate),
		startDateValue: toActivationKeyDateValue(subscription?.startDate),
		status: 'active',
		type: environment.type,
	};
}

function getRowKind(row: ProjectActivationKey): Word {
	if (row.cloudNative) {
		return row.offlineActivated ? 'offline' : 'online';
	}

	if (row.unaggregated) {
		return 'license';
	}

	return 'aggregate';
}

function matchesSearch(row: ProjectActivationKey, search: string): boolean {
	return (
		row.name.toLowerCase().includes(search) ||
		row.description.toLowerCase().includes(search) ||
		row.productName.toLowerCase().includes(search)
	);
}

function formatDateBound(value: string): string {
	const bound = value.split(':')[0];
	const date = value.slice(bound.length + 1);

	return `${translate(bound === 'after' ? 'after' : 'before')} ${format(
		new Date(date),
		'MMM d, yyyy'
	)}`;
}

function getSubscriptionType(row: ProjectActivationKey): Word {
	return row.complimentary ? 'complimentary' : 'subscription';
}

function matchesDateBound(dateValue: string, values: string[]): boolean {
	return values.every((value) => {
		const bound = value.split(':')[0];
		const date = value.slice(bound.length + 1);

		if (!dateValue) {
			return false;
		}

		return bound === 'after' ? dateValue >= date : dateValue <= date;
	});
}

function toOptions(
	values: string[],
	getLabel: (value: string) => string = (value) => value
): FilterOption[] {
	return [...new Set(values.filter(Boolean))]
		.map((value) => ({label: getLabel(value), value}))
		.sort((option1, option2) =>
			option1.label.localeCompare(option2.label, undefined, {
				numeric: true,
			})
		);
}

function stopAnd(callback: () => void) {
	return (event: MouseEvent) => {
		event.stopPropagation();

		callback();
	};
}

type KebabActionsProps = {
	admin: boolean;
	hasActivationPermission: boolean;
	onDeactivate: () => void;
	onDownload: () => void;
	onReactivate: () => void;
	onRenew: () => void;
	onView: () => void;
	row: ProjectActivationKey;
};

function KebabActions({
	admin,
	hasActivationPermission,
	onDeactivate,
	onDownload,
	onReactivate,
	onRenew,
	onView,
	row,
}: KebabActionsProps) {
	return (
		<ClayDropDown
			trigger={
				<Button
					borderless
					className="text-neutral-7"
					displayType="unstyled"
					onClick={(event) => event.stopPropagation()}
					prependIcon="ellipsis-v"
				/>
			}
		>
			<ClayDropDown.ItemList>
				<ClayDropDown.Item onClick={stopAnd(onView)}>
					{translate('view')}
				</ClayDropDown.Item>

				<ClayDropDown.Item
					disabled={!row.active}
					onClick={stopAnd(onDownload)}
				>
					{translate('download')}
				</ClayDropDown.Item>

				{hasActivationPermission &&
					!row.complimentary &&
					isRenewableKey(row, admin) && (
						<ClayDropDown.Item onClick={stopAnd(onRenew)}>
							{translate('renew')}
						</ClayDropDown.Item>
					)}

				{row.complimentary
					? admin &&
						row.active && (
							<ClayDropDown.Item
								className="text-danger"
								onClick={stopAnd(onDeactivate)}
							>
								{translate('deactivate')}
							</ClayDropDown.Item>
						)
					: hasActivationPermission &&
						(row.active ? (
							<ClayDropDown.Item
								className="text-danger"
								onClick={stopAnd(onDeactivate)}
							>
								{translate('deactivate')}
							</ClayDropDown.Item>
						) : (
							<ClayDropDown.Item onClick={stopAnd(onReactivate)}>
								{translate('reactivate')}
							</ClayDropDown.Item>
						))}
			</ClayDropDown.ItemList>
		</ClayDropDown>
	);
}

type CloudNativeKebabActionsProps = {
	onModify: () => void;
};

function CloudNativeKebabActions({onModify}: CloudNativeKebabActionsProps) {
	return (
		<ClayDropDown
			trigger={
				<Button
					borderless
					className="text-neutral-7"
					displayType="unstyled"
					onClick={(event) => event.stopPropagation()}
					prependIcon="ellipsis-v"
				/>
			}
		>
			<ClayDropDown.ItemList>
				<ClayDropDown.Item
					onClick={(event) => {
						event.stopPropagation();

						onModify();
					}}
				>
					{translate('modify')}
				</ClayDropDown.Item>
			</ClayDropDown.ItemList>
		</ClayDropDown>
	);
}

export default function LicenseKeys() {
	const {projectId} = useProject();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();

	const {activationKeys, loading, revalidate} = useProjectActivationKeys();
	const {environments, loading: loadingEnvironments} =
		useProjectEnvironments();
	const {hasActivationPermission} = useHasLicenseKeyPermission(projectId);
	const admin = useHasAdminPermission();
	const {generateForm} = useGenerateActivationKeyForm(projectId);

	const rows = useMemo(
		() => [
			...activationKeys,
			...filterEnvironmentsByProject(projectId, environments)
				.filter(
					(environment) =>
						environment.offering === CLOUD_NATIVE_OFFERING &&
						environment.status === ACTIVATION_STATUS_ACTIVE
				)
				.map((environment) =>
					toCloudNativeActivationKey(environment, generateForm)
				),
		],
		[activationKeys, environments, generateForm, projectId]
	);

	const {
		handleDeactivate,
		handleDownload,
		handleNewKey,
		handleReactivate,
		handleRenew,
	} = useActivationKeyActions({generatePath: 'generate', revalidate});

	const newKeyExternalReferenceCode = searchParams.get('new');
	const openedNewKeyRef = useRef(false);

	useEffect(() => {
		if (!newKeyExternalReferenceCode || openedNewKeyRef.current) {
			return;
		}

		openedNewKeyRef.current = true;

		navigate(
			`generate?new=${encodeURIComponent(newKeyExternalReferenceCode)}`,
			{replace: true}
		);
	}, [navigate, newKeyExternalReferenceCode]);

	const columns: ListColumn<ProjectActivationKey>[] = [
		{
			heading: 'product',
			key: 'product',
			render: (row) => <span>{row.productName || '-'}</span>,
			width: '25%',
		},
		{
			heading: 'type',
			key: 'type',
			render: (row) => (
				<span className="d-flex flex-column">
					<span>{row.type ? translate(row.type as Word) : '-'}</span>

					<span className="license-keys-type-kind">
						{translate(getRowKind(row))}
					</span>
				</span>
			),
			width: '25%',
		},
		{
			heading: 'environment-name',
			key: 'environment-name',
			render: (row) => (
				<span className="d-flex flex-column">
					<span>{row.name || '-'}</span>

					{!!row.environmentId && (
						<span className="license-keys-environment-id">
							{row.environmentId}
						</span>
					)}
				</span>
			),
			width: '25%',
		},
		{
			heading: 'start-date-exp-date',
			key: 'start-date-exp-date',
			noWrap: true,
			render: (row) => (
				<span className="list-card-status">
					<ClayTooltipProvider>
						<span
							className="list-card-status-dot"
							data-tooltip-align="top"
							style={{
								backgroundColor: getStatusColor(row.status),
							}}
							title={translate(row.status)}
						/>
					</ClayTooltipProvider>

					<span>
						{row.startDate && row.expirationDate
							? `${row.startDate} - ${row.expirationDate}`
							: '-'}
					</span>
				</span>
			),
		},
		{
			key: 'action',
			render: (row) => {
				if (row.cloudNative) {
					if (!row.offlineActivated) {
						return null;
					}

					return (
						<CloudNativeKebabActions
							onModify={() =>
								navigate(
									`generate?modify=${encodeURIComponent(
										row.environmentId ?? ''
									)}`
								)
							}
						/>
					);
				}

				return (
					<KebabActions
						admin={admin}
						hasActivationPermission={hasActivationPermission}
						onDeactivate={() => handleDeactivate(row)}
						onDownload={() => handleDownload(row)}
						onReactivate={() => handleReactivate(row)}
						onRenew={() => handleRenew(row)}
						onView={() => navigate(row.id)}
						row={row}
					/>
				);
			},
			width: '1%',
		},
	];

	const filters: ListFilter<ProjectActivationKey>[] = [
		{
			key: 'product',
			label: 'product',
			matches: (row, values) => values.includes(row.productName),
			options: toOptions(rows.map((row) => row.productName)),
		},
		{
			key: 'type',
			label: 'type',
			matches: (row, values) => values.includes(row.type),
			options: toOptions(
				rows.map((row) => row.type),
				(value) => translate(value as Word)
			),
		},
		{
			key: 'environmentType',
			label: 'environment-type',
			matches: (row, values) =>
				values.includes(row.environmentType) ||
				values.includes(getSubscriptionType(row)),
			options: [
				...toOptions(
					rows.map((row) => row.environmentType),
					(value) => translate(value as Word)
				),
				...toOptions(rows.map(getSubscriptionType), (value) =>
					translate(value as Word)
				),
			],
		},
		{
			formatValue: formatDateBound,
			key: 'startDate',
			label: 'start-date',
			matches: (row, values) =>
				matchesDateBound(row.startDateValue, values),
			variant: 'date-range',
		},
		{
			formatValue: formatDateBound,
			key: 'expirationDate',
			label: 'expiration-date',
			matches: (row, values) =>
				matchesDateBound(row.expirationDateValue, values),
			variant: 'date-range',
		},
		{
			key: 'status',
			label: 'status',
			matches: (row, values) => values.includes(row.status),
			options: toOptions(
				rows.map((row) => row.status),
				(value) => translate(value as Word)
			),
		},
		{
			key: 'productVersion',
			label: 'product-version',
			matches: (row, values) => values.includes(row.productVersion),
			options: toOptions(rows.map((row) => row.productVersion)),
		},
	];

	return (
		<Page
			description={i18n.translate(
				'manage-the-activation-keys-within-your-project'
			)}
			title={i18n.translate('activation')}
		>
			<FilterableListCard
				action={
					hasActivationPermission && isGeneratable(generateForm) ? (
						<Button
							displayType="primary"
							onClick={() => handleNewKey()}
						>
							{translate('new-key')}
						</Button>
					) : undefined
				}
				className="license-keys"
				columns={columns}
				emptyLabel="no-activation-keys"
				filters={filters.filter(
					(filter) => filter.variant || filter.options?.length
				)}
				items={rows}
				loading={loading || loadingEnvironments}
				matchesSearch={matchesSearch}
				rowKey={(row) => row.id}
			/>
		</Page>
	);
}
