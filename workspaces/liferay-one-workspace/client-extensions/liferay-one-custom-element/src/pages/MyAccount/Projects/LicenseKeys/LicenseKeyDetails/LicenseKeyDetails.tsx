/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import {ClayToggle} from '@clayui/form';
import {useParams} from 'react-router-dom';
import BackLink from '~/components/BackLink/BackLink';
import Loading from '~/components/Loading/Loading';
import {useProject} from '~/context/ProjectContext';
import {
	ActivationKeyLicenseKey,
	useActivationKeyLicenseKeys,
} from '~/hooks/useActivationKeyLicenseKeys';
import {
	ProjectActivationKey,
	useProjectActivationKeys,
} from '~/hooks/useProjectActivationKeys';
import {translate} from '~/i18n';
import DetailsCard, {
	DetailsRow,
} from '~/pages/MyAccount/Projects/components/DetailsCard/DetailsCard';
import {useHasLicenseKeyPermission} from '~/pages/MyAccount/Projects/hooks/useHasActivationPermission';
import {getKeyType} from '~/pages/MyAccount/Projects/utils/getKeyType';
import {getStatusColor} from '~/pages/MyAccount/Projects/utils/getStatusColor';
import {isPermanentKey} from '~/pages/MyAccount/Projects/utils/isPermanentKey';
import {isRenewableKey} from '~/pages/MyAccount/Projects/utils/isRenewableKey';

import useActivationKeyActions from '../hooks/useActivationKeyActions';
import useActivationKeySubscription from '../hooks/useActivationKeySubscription';

export default function LicenseKeyDetails() {
	const {licenseKeyERC = ''} = useParams();
	const {projectId} = useProject();

	const {activationKeys, loading, revalidate} = useProjectActivationKeys();
	const {hasActivationPermission} = useHasLicenseKeyPermission(projectId);

	const {handleDeactivate, handleDownload, handleReactivate, handleRenew} =
		useActivationKeyActions({generatePath: '../generate', revalidate});

	const activationKey = activationKeys.find(
		(key) => key.id === licenseKeyERC
	);

	const {licenseKeys} = useActivationKeyLicenseKeys(
		activationKey?.activationKeyId
	);

	return (
		<div className="w-100">
			<BackLink path="..">{translate('activation-keys')}</BackLink>

			{loading ? (
				<Loading.Page />
			) : activationKey ? (
				<LicenseKeyDetailsContent
					activationKey={activationKey}
					hasActivationPermission={hasActivationPermission}
					licenseKeys={licenseKeys}
					onDeactivate={() => handleDeactivate(activationKey)}
					onDownload={() => handleDownload(activationKey)}
					onReactivate={() => handleReactivate(activationKey)}
					onRenew={() => handleRenew(activationKey)}
				/>
			) : (
				<div className="p-4 text-neutral-7">
					{translate('no-results-found')}
				</div>
			)}
		</div>
	);
}

type LicenseKeyDetailsContentProps = {
	activationKey: ProjectActivationKey;
	hasActivationPermission: boolean;
	licenseKeys: ActivationKeyLicenseKey[];
	onDeactivate: () => void;
	onDownload: () => void;
	onReactivate: () => void;
	onRenew: () => void;
};

function getProducts(licenseKeys: ActivationKeyLicenseKey[]) {
	const products = new Map<string, ActivationKeyLicenseKey>();

	for (const licenseKey of licenseKeys) {
		const key =
			licenseKey.productExternalReferenceCode || licenseKey.productName;

		if (key && !products.has(key)) {
			products.set(key, licenseKey);
		}
	}

	return [...products.entries()];
}

function getServers(licenseKeys: ActivationKeyLicenseKey[]) {
	const servers = new Map<string, ActivationKeyLicenseKey>();

	for (const licenseKey of licenseKeys) {
		const key = [
			licenseKey.hostName,
			licenseKey.ipAddresses,
			licenseKey.macAddresses,
		].join('|');

		if (!servers.has(key)) {
			servers.set(key, licenseKey);
		}
	}

	return [...servers.entries()];
}

function LicenseKeyDetailsContent({
	activationKey,
	hasActivationPermission,
	licenseKeys,
	onDeactivate,
	onDownload,
	onReactivate,
	onRenew,
}: LicenseKeyDetailsContentProps) {
	const {subscribed, toggleSubscription} = useActivationKeySubscription(
		activationKey.activationKeyId
	);

	const products = getProducts(licenseKeys);
	const servers = getServers(licenseKeys);

	const [, firstLicenseKey] = servers[0] ?? [];

	const detailsRows: DetailsRow[] = [
		{label: translate('environment-name'), value: activationKey.name},
		{
			label: translate('description'),
			value: activationKey.description || '-',
		},
		{
			label: translate('key-type'),
			value: activationKey.licenseType
				? translate(getKeyType(activationKey.licenseType))
				: '-',
		},
		{
			label: translate('host-name'),
			value: servers.length ? (
				<span className="d-flex flex-column">
					{servers.map(([key, server]) => (
						<span key={key}>{server.hostName || '-'}</span>
					))}
				</span>
			) : (
				'-'
			),
		},
		{
			label: translate('cluster-size'),
			value: firstLicenseKey?.clusterSize || '-',
		},
		{
			label: translate('version'),
			value: activationKey.productVersion || '-',
		},
		{
			label: translate('instance-size'),
			value: firstLicenseKey?.sizing || '-',
		},
		{
			label: translate('environment-type'),
			value: translate(activationKey.environmentType),
		},
		{
			label: translate('subscription-type'),
			value: translate(
				activationKey.complimentary ? 'complimentary' : 'subscription'
			),
		},
		{label: translate('domains'), value: activationKey.domain || '-'},
		{label: translate('start-date'), value: activationKey.startDate || '-'},
		{
			label: translate('expiration-date'),
			value: isPermanentKey(
				activationKey.expirationDateValue,
				activationKey.startDateValue
			)
				? translate('does-not-expire')
				: activationKey.expirationDate || '-',
		},
		{
			label: translate('status'),
			value: (
				<span className="align-items-center d-flex">
					<span
						className="list-card-status-dot"
						style={{
							backgroundColor: getStatusColor(
								activationKey.status
							),
						}}
					/>

					{translate(activationKey.status)}
				</span>
			),
		},
	];

	if (products.length) {
		detailsRows.push({
			label: translate('products'),
			value: (
				<span className="d-flex flex-column">
					{products.map(([key, product]) => (
						<span key={key}>
							{product.sizing
								? `${product.productName} (${product.sizing})`
								: product.productName}
						</span>
					))}
				</span>
			),
		});
	}

	return (
		<>
			<DetailsCard
				bodyClassName="mt-4"
				fullWidth
				headerActions={
					<div className="d-flex" style={{gap: 'var(--spacer-3)'}}>
						<ClayButton
							disabled={!activationKey.active}
							displayType="secondary"
							onClick={onDownload}
						>
							{translate('download')}
						</ClayButton>

						{hasActivationPermission &&
							isRenewableKey(activationKey) && (
								<ClayButton
									displayType="secondary"
									onClick={onRenew}
								>
									{translate('renew')}
								</ClayButton>
							)}

						{hasActivationPermission &&
							(activationKey.active ? (
								<ClayButton
									displayType="danger"
									onClick={onDeactivate}
								>
									{translate('deactivate')}
								</ClayButton>
							) : (
								<ClayButton onClick={onReactivate}>
									{translate('reactivate')}
								</ClayButton>
							))}
					</div>
				}
				icon="key-horizontal"
				iconPosition="right"
				rows={detailsRows}
				title="activation-key-details"
			/>

			<div className="detailed-card-container mt-3">
				<div
					className="align-items-center d-flex"
					style={{gap: 'var(--spacer-2)'}}
				>
					<ClayToggle
						aria-label={translate('expiration-notifications')}
						containerProps={{
							className: 'flex-shrink-0 mb-0',
							style: {width: 'fit-content'},
						}}
						onToggle={toggleSubscription}
						toggled={subscribed}
					/>

					<span
						style={{
							color: 'var(--color-neutral-10)',
							fontWeight: 600,
						}}
					>
						{translate('expiration-notifications')}
					</span>
				</div>

				<p className="mb-0 mt-3 text-neutral-7">
					{translate(
						'enable-notifications-through-email-when-this-activation-key-is-about-to-expire-30-days-before-15-days-before-and-on-the-day-of-expiration-you-can-unsubscribe-at-any-time'
					)}
				</p>
			</div>
		</>
	);
}
