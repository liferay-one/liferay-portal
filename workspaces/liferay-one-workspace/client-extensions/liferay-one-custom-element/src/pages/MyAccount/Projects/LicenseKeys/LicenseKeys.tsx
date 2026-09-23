/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayDropDown from '@clayui/drop-down';
import {ClayTooltipProvider} from '@clayui/tooltip';
import {format} from 'date-fns';
import {MouseEvent, useEffect, useRef} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import Button from '~/components/Button/Button';
import Page from '~/components/Page/Page';
import {useProject} from '~/context/ProjectContext';
import {
	ProjectActivationKey,
	useProjectActivationKeys,
} from '~/hooks/useProjectActivationKeys';
import i18n, {Word, translate} from '~/i18n';
import {getKeyType} from '~/pages/MyAccount/Projects/utils/getKeyType';
import {getStatusColor} from '~/pages/MyAccount/Projects/utils/getStatusColor';
import {isRenewableKey} from '~/pages/MyAccount/Projects/utils/isRenewableKey';

import FilterableListCard, {
	FilterOption,
	ListColumn,
	ListFilter,
} from '../components/FilterableListCard/FilterableListCard';
import {useHasLicenseKeyPermission} from '../hooks/useHasActivationPermission';
import useActivationKeyActions from './hooks/useActivationKeyActions';

import './LicenseKeys.css';

function matchesSearch(row: ProjectActivationKey, search: string): boolean {
	return (
		row.name.toLowerCase().includes(search) ||
		row.domain.toLowerCase().includes(search) ||
		row.description.toLowerCase().includes(search)
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
	hasActivationPermission: boolean;
	onDeactivate: () => void;
	onDownload: () => void;
	onReactivate: () => void;
	onRenew: () => void;
	onView: () => void;
	row: ProjectActivationKey;
};

function KebabActions({
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

				{hasActivationPermission && isRenewableKey(row) && (
					<ClayDropDown.Item onClick={stopAnd(onRenew)}>
						{translate('renew')}
					</ClayDropDown.Item>
				)}

				{hasActivationPermission &&
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

export default function LicenseKeys() {
	const {projectId} = useProject();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();

	const {activationKeys, loading, revalidate} = useProjectActivationKeys();
	const {hasActivationPermission} = useHasLicenseKeyPermission(projectId);

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
			heading: 'environment-name',
			key: 'environment-name',
			render: (row) => (
				<span className="d-flex flex-column">
					<span className="license-keys-environment-name">
						{row.name}
					</span>

					<span className="list-card-subtext">
						{row.domain || '-'}
					</span>
				</span>
			),
			width: '25%',
		},
		{
			heading: 'environment-type',
			key: 'environment-type',
			render: (row) => (
				<span className="d-flex flex-column">
					<span>{row.keyType || '-'}</span>

					<span className="list-card-subtext">
						{translate(getSubscriptionType(row))}
					</span>
				</span>
			),
			width: '25%',
		},
		{
			heading: 'key-type',
			key: 'key-type',
			render: (row) => {
				const keyType = getKeyType(row.licenseType);

				return <span>{translate(keyType)}</span>;
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

					<span>{`${row.startDate} - ${row.expirationDate}`}</span>
				</span>
			),
		},
		{
			key: 'action',
			render: (row) => (
				<KebabActions
					hasActivationPermission={hasActivationPermission}
					onDeactivate={() => handleDeactivate(row)}
					onDownload={() => handleDownload(row)}
					onReactivate={() => handleReactivate(row)}
					onRenew={() => handleRenew(row)}
					onView={() => navigate(row.id)}
					row={row}
				/>
			),
			width: '1%',
		},
	];

	const filters: ListFilter<ProjectActivationKey>[] = [
		{
			key: 'keyType',
			label: 'key-type',
			matches: (row, values) =>
				values.includes(getKeyType(row.licenseType)),
			options: toOptions(
				activationKeys.map((row) => getKeyType(row.licenseType)),
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
					activationKeys.map((row) => row.environmentType),
					(value) => translate(value as Word)
				),
				...toOptions(activationKeys.map(getSubscriptionType), (value) =>
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
				activationKeys.map((row) => row.status),
				(value) => translate(value as Word)
			),
		},
		{
			key: 'productVersion',
			label: 'product-version',
			matches: (row, values) => values.includes(row.productVersion),
			options: toOptions(activationKeys.map((row) => row.productVersion)),
		},
	];

	return (
		<Page
			description={i18n.translate(
				'manage-the-activation-within-your-project'
			)}
			title={i18n.translate('activation')}
		>
			<FilterableListCard
				action={
					hasActivationPermission ? (
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
				items={activationKeys}
				loading={loading}
				matchesSearch={matchesSearch}
				onItemClick={(row) => navigate(row.id)}
				rowKey={(row) => row.id}
			/>
		</Page>
	);
}
