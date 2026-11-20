/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayButtonWithIcon} from '@clayui/button';
import ClayDropDown from '@clayui/drop-down';
import {ClayTooltipProvider} from '@clayui/tooltip';
import {MouseEvent, useEffect, useMemo, useRef} from 'react';
import {useNavigate, useSearchParams} from 'react-router';
import Button from '~/components/Button/Button';
import Page from '~/components/Page/Page';
import {useProject} from '~/context/ProjectContext';
import {useConfirmationModal} from '~/hooks/useConfirmationModal';
import {
	ProjectActivationKey,
	useProjectActivationKeys,
} from '~/hooks/useProjectActivationKeys';
import {useProjectEnvironments} from '~/hooks/useProjectEnvironments';
import i18n, {Word, sub, translate} from '~/i18n';
import {filterEnvironmentsByProject} from '~/pages/MyAccount/Projects/utils/filterEnvironmentsByProject';
import {getStatusColor} from '~/pages/MyAccount/Projects/utils/getStatusColor';
import {isDownloadableKey} from '~/pages/MyAccount/Projects/utils/isDownloadableKey';
import {isFreeAccountKey} from '~/pages/MyAccount/Projects/utils/isFreeAccountKey';
import {
	RenewableKeyOptions,
	isRenewableKey,
} from '~/pages/MyAccount/Projects/utils/isRenewableKey';
import {isUnassignedProject} from '~/pages/MyAccount/Projects/utils/isUnassignedProject';
import {Liferay, getIconSpriteMap} from '~/services/liferay/liferay';
import Projects from '~/services/spring-boot/Projects';

import FilterableListCard, {
	FilterOption,
	ListColumn,
	ListFilter,
} from '../components/FilterableListCard/FilterableListCard';
import {useHasLicenseKeyPermission} from '../hooks/useHasActivationPermission';
import {useHasAdminPermission} from '../hooks/useHasAdminPermission';
import {useRenewableKeyOptions} from '../hooks/useRenewableKeyOptions';
import useDXPActivationCodes from './GenerateActivationKey/hooks/useDXPActivationCodes';
import {
	ACTIVATION_STATUS_ACTIVE,
	ACTIVATION_STATUS_INACTIVE,
	ACTIVATION_STATUS_PENDING,
	CLOUD_NATIVE_LICENSE_KEY_FAMILY,
	DXP_LICENSE_KEY_FAMILY,
	getLicenseKeyFamilyLabel,
} from './GenerateActivationKey/utils';
import useActivationKeyActions from './hooks/useActivationKeyActions';
import {useActivationKeyScope} from './hooks/useActivationKeyScope';
import {useActivationKeySummary} from './hooks/useActivationKeySummary';

import './LicenseKeys.css';

import {
	formatDateTime,
	formatUTCShortDate,
	toUTCDateString,
} from '~/utils/dateUtils';

import type {ProjectEnvironment} from '~/hooks/useProjectEnvironments';
import type {ActivationKeySummaryKeyType} from '~/services/spring-boot/ActivationKeys';
import type {
	DXPActivationCode,
	DXPActivationCodeType,
} from '~/services/spring-boot/Projects';

const ACTIVATION_MODE_OFFLINE = 'offline';

const CLOUD_NATIVE_OFFERING = 'Cloud Native';

const DXP_ACTIVATION_STATUSES = [
	ACTIVATION_STATUS_ACTIVE,
	ACTIVATION_STATUS_INACTIVE,
	ACTIVATION_STATUS_PENDING,
];

function getCloudNativeKeyType(
	cloudNativeKeyTypes: ActivationKeySummaryKeyType[],
	type?: string
): ActivationKeySummaryKeyType | undefined {
	return (
		cloudNativeKeyTypes.find((current) => current.key === type) ??
		cloudNativeKeyTypes[0]
	);
}

function toActivationKeyDate(value?: string): string {
	return formatUTCShortDate(value);
}

function toActivationKeyDateValue(value?: string): string {
	return value ? toUTCDateString(new Date(value)) : '';
}

function toCloudNativeActivationKey(
	environment: ProjectEnvironment,
	cloudNativeKeyTypes: ActivationKeySummaryKeyType[]
): ProjectActivationKey {
	const keyType = getCloudNativeKeyType(
		cloudNativeKeyTypes,
		environment.type
	);

	return {
		activationKeyId: '',
		active: true,
		cloudNative: true,
		complimentary: false,
		description: '',
		environmentId: environment.externalReferenceCode,
		expirationDate: toActivationKeyDate(keyType?.endDate),
		expirationDateValue: toActivationKeyDateValue(keyType?.endDate),
		id: environment.externalReferenceCode,
		licenseKeyFamily: CLOUD_NATIVE_LICENSE_KEY_FAMILY,
		name: environment.name,
		offlineActivated:
			environment.activationMode === ACTIVATION_MODE_OFFLINE,
		productName: getLicenseKeyFamilyLabel(CLOUD_NATIVE_LICENSE_KEY_FAMILY),
		productVersion: '',
		startDate: toActivationKeyDate(keyType?.startDate),
		startDateValue: toActivationKeyDateValue(keyType?.startDate),
		status: 'active',
		type: environment.type,
	};
}

function toDXPActivationKey(
	activationCode: DXPActivationCode,
	environmentType: DXPActivationCodeType
): ProjectActivationKey {
	const {activationStatus} = activationCode;

	return {
		activationCode: activationCode.activationCode,
		activationKeyId: '',
		active: activationStatus === ACTIVATION_STATUS_ACTIVE,
		complimentary: false,
		description: '',
		dxp: true,
		dxpVersion: activationCode.dxpVersion,
		expirationDate: toActivationKeyDate(environmentType.endDate),
		expirationDateValue: toActivationKeyDateValue(environmentType.endDate),
		id: activationCode.environmentId,
		lastHeartbeatAt: activationCode.lastHeartbeatAt,
		licenseKeyFamily: DXP_LICENSE_KEY_FAMILY,
		name: activationCode.installationId,
		offlineActivated:
			activationCode.activationMode === ACTIVATION_MODE_OFFLINE,
		productName: getLicenseKeyFamilyLabel(DXP_LICENSE_KEY_FAMILY),
		productVersion: '',
		startDate: toActivationKeyDate(environmentType.startDate),
		startDateValue: toActivationKeyDateValue(environmentType.startDate),
		status: activationStatus as Word,
		type: environmentType.type,
	};
}

function isPendingDXPRow(row: ProjectActivationKey): boolean {
	return Boolean(row.dxp) && row.status === ACTIVATION_STATUS_PENDING;
}

function getCheckIn(row: ProjectActivationKey): string {
	const checkIn = [];

	if (row.dxpVersion) {
		checkIn.push(row.dxpVersion);
	}

	if (row.lastHeartbeatAt) {
		checkIn.push(
			sub('last-check-in-x', formatDateTime(row.lastHeartbeatAt))
		);
	}

	return checkIn.join(' · ');
}

function getRowKind(row: ProjectActivationKey): Word {
	if (isPendingDXPRow(row)) {
		return 'not-activated';
	}

	if (row.cloudNative || row.dxp) {
		return row.offlineActivated ? 'offline' : 'online';
	}

	if (row.unaggregated) {
		return 'license';
	}

	return 'aggregate';
}

function matchesSearch(row: ProjectActivationKey, search: string): boolean {
	return (
		(row.activationCode ?? '').toLowerCase().includes(search) ||
		row.name.toLowerCase().includes(search) ||
		row.description.toLowerCase().includes(search) ||
		row.productName.toLowerCase().includes(search)
	);
}

function formatDateBound(value: string): string {
	const bound = value.split(':')[0];
	const date = value.slice(bound.length + 1);

	return `${translate(bound === 'after' ? 'after' : 'before')} ${formatUTCShortDate(date)}`;
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
	renewableKeyOptions: RenewableKeyOptions;
	row: ProjectActivationKey;
	unassigned: boolean;
};

function KebabActions({
	admin,
	hasActivationPermission,
	onDeactivate,
	onDownload,
	onReactivate,
	onRenew,
	onView,
	renewableKeyOptions,
	row,
	unassigned,
}: KebabActionsProps) {
	const activationChangeable = isFreeAccountKey(row)
		? admin
		: hasActivationPermission;

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

				{isDownloadableKey(row) && (
					<ClayDropDown.Item onClick={stopAnd(onDownload)}>
						{translate('download')}
					</ClayDropDown.Item>
				)}

				{hasActivationPermission &&
					!row.complimentary &&
					isRenewableKey(row, {
						...renewableKeyOptions,
						unassigned,
					}) && (
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
					: activationChangeable &&
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

type DXPKebabActionsProps = {
	onCopy: () => void;
	onDeactivate: () => void;
	onOfflineActivation: () => void;
	pending: boolean;
};

function DXPKebabActions({
	onCopy,
	onDeactivate,
	onOfflineActivation,
	pending,
}: DXPKebabActionsProps) {
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
				{pending && (
					<>
						<ClayDropDown.Item onClick={stopAnd(onCopy)}>
							{translate('copy-activation-code')}
						</ClayDropDown.Item>

						<ClayDropDown.Item
							onClick={stopAnd(onOfflineActivation)}
						>
							{translate('offline-activation')}
						</ClayDropDown.Item>
					</>
				)}

				<ClayDropDown.Item
					className="text-danger"
					onClick={stopAnd(onDeactivate)}
				>
					{translate('deactivate')}
				</ClayDropDown.Item>
			</ClayDropDown.ItemList>
		</ClayDropDown>
	);
}

async function copyActivationCode(activationCode: string) {
	try {
		await navigator.clipboard.writeText(activationCode);
	}
	catch (error) {
		Liferay.Util.openToast({
			message: translate('an-unexpected-error-occurred'),
			type: 'danger',
		});

		return;
	}

	Liferay.Util.openToast({
		message: sub('copied-x-to-the-clipboard', 'activation code'),
	});
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
	const {hasActivationPermission, hasGeneratePermission} =
		useHasLicenseKeyPermission(projectId);
	const admin = useHasAdminPermission();
	const renewableKeyOptions = useRenewableKeyOptions(hasActivationPermission);
	const scope = useActivationKeyScope();
	const {
		error: summaryError,
		loading: loadingSummary,
		summary,
	} = useActivationKeySummary(scope, hasGeneratePermission);

	const cloudNativeKeyTypes = useMemo(
		() => summary?.cloudNativeKeyTypes ?? [],
		[summary]
	);

	const {
		environmentTypes: dxpEnvironmentTypes,
		mutate: mutateDXPActivationCodes,
	} = useDXPActivationCodes(isUnassignedProject(projectId) ? '' : projectId);
	const {openModal} = useConfirmationModal();

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
					toCloudNativeActivationKey(environment, cloudNativeKeyTypes)
				),
			...dxpEnvironmentTypes.flatMap((environmentType) =>
				environmentType.activationCodes
					.filter((activationCode) =>
						DXP_ACTIVATION_STATUSES.includes(
							activationCode.activationStatus
						)
					)
					.map((activationCode) =>
						toDXPActivationKey(activationCode, environmentType)
					)
			),
		],
		[
			activationKeys,
			cloudNativeKeyTypes,
			dxpEnvironmentTypes,
			environments,
			projectId,
		]
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

	function handleDeactivateDXPInstallation(row: ProjectActivationKey) {
		const pending = isPendingDXPRow(row);

		openModal({
			body: translate(
				pending
					? 'deactivate-activation-code-confirmation'
					: 'deactivate-dxp-installation-confirmation'
			),
			header: translate(
				pending
					? 'deactivate-activation-code'
					: 'deactivate-dxp-installation'
			),
			onConfirm: async () => {
				await Projects.patchDXPEnvironmentActive(
					projectId,
					row.id,
					false
				);

				await mutateDXPActivationCodes();
			},
			status: 'danger',
		});
	}

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
			render: (row) => {
				if (isPendingDXPRow(row)) {
					return (
						<span className="align-items-center d-flex">
							<span className="license-keys-activation-code">
								{row.activationCode}
							</span>

							<ClayButtonWithIcon
								aria-label={translate('copy-activation-code')}
								className="ml-2 text-neutral-7"
								displayType="unstyled"
								onClick={(event) => {
									event.stopPropagation();

									copyActivationCode(
										row.activationCode ?? ''
									);
								}}
								size="sm"
								spritemap={getIconSpriteMap()}
								symbol="copy"
								title={translate('copy-activation-code')}
							/>
						</span>
					);
				}

				if (row.dxp) {
					return (
						<span className="d-flex flex-column">
							<span>{row.name || '-'}</span>

							{!!row.activationCode && (
								<span className="license-keys-environment-id">
									{row.activationCode}
								</span>
							)}

							{admin && !!getCheckIn(row) && (
								<span className="license-keys-environment-id">
									{getCheckIn(row)}
								</span>
							)}
						</span>
					);
				}

				return (
					<span className="d-flex flex-column">
						<span>{row.name || '-'}</span>

						{!!row.environmentId && (
							<span className="license-keys-environment-id">
								{row.environmentId}
							</span>
						)}
					</span>
				);
			},
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
				if (row.dxp) {
					const pending = isPendingDXPRow(row);

					if (!hasActivationPermission || (!row.active && !pending)) {
						return null;
					}

					return (
						<DXPKebabActions
							onCopy={() =>
								copyActivationCode(row.activationCode ?? '')
							}
							onDeactivate={() =>
								handleDeactivateDXPInstallation(row)
							}
							onOfflineActivation={() =>
								navigate(
									`generate?dxpOffline=${encodeURIComponent(
										row.id
									)}`
								)
							}
							pending={pending}
						/>
					);
				}

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
						renewableKeyOptions={renewableKeyOptions}
						row={row}
						unassigned={isUnassignedProject(projectId)}
					/>
				);
			},
			width: '1%',
		},
	];

	const filters: ListFilter<ProjectActivationKey>[] = useMemo(
		() => [
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
		],
		[rows]
	);

	const visibleFilters = useMemo(
		() =>
			filters.filter(
				(filter) => filter.variant || filter.options?.length
			),
		[filters]
	);

	return (
		<Page
			description={i18n.translate(
				'manage-the-activation-keys-within-your-project'
			)}
			title={i18n.translate('activation')}
		>
			<FilterableListCard
				action={
					hasGeneratePermission && !summaryError ? (
						<ClayTooltipProvider>
							<span
								data-tooltip-align="top"
								title={
									!loadingSummary && !summary?.generatable
										? translate('no-licenses-available')
										: undefined
								}
							>
								<Button
									disabled={
										loadingSummary || !summary?.generatable
									}
									displayType="primary"
									isLoading={loadingSummary}
									onClick={() => handleNewKey()}
								>
									{translate('new-key')}
								</Button>
							</span>
						</ClayTooltipProvider>
					) : undefined
				}
				className="license-keys"
				columns={columns}
				emptyLabel="no-activation-keys"
				filterIconOnly
				filters={visibleFilters}
				items={rows}
				loading={loading || loadingEnvironments}
				matchesSearch={matchesSearch}
				rowKey={(row) => row.id}
			/>
		</Page>
	);
}
