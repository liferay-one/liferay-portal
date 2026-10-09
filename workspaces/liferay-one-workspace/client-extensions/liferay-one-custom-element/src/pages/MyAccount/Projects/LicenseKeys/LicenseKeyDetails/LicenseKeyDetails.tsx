/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import {ClayToggle} from '@clayui/form';
import {useParams} from 'react-router';
import BackLink from '~/components/BackLink/BackLink';
import Loading from '~/components/Loading/Loading';
import {useProject} from '~/context/ProjectContext';
import {
	ActivationKeyLicenseKey,
	useActivationKeyLicenseKeys,
	useUnaggregatedLicenseKey,
} from '~/hooks/useActivationKeyLicenseKeys';
import {
	ProjectActivationKey,
	useProjectActivationKeys,
} from '~/hooks/useProjectActivationKeys';
import {Word, translate} from '~/i18n';
import DetailsCard, {
	DetailsRow,
} from '~/pages/MyAccount/Projects/components/DetailsCard/DetailsCard';
import {useHasLicenseKeyPermission} from '~/pages/MyAccount/Projects/hooks/useHasActivationPermission';
import {useHasAdminPermission} from '~/pages/MyAccount/Projects/hooks/useHasAdminPermission';
import {getStatusColor} from '~/pages/MyAccount/Projects/utils/getStatusColor';
import {isPermanentKey} from '~/pages/MyAccount/Projects/utils/isPermanentKey';
import {isRenewableKey} from '~/pages/MyAccount/Projects/utils/isRenewableKey';

import useActivationKeyActions from '../hooks/useActivationKeyActions';
import useActivationKeySubscription from '../hooks/useActivationKeySubscription';
import LicenseKeyList from './LicenseKeyList/LicenseKeyList';

export default function LicenseKeyDetails() {
	const {licenseKeyERC = ''} = useParams();
	const {projectId} = useProject();

	const {activationKeys, loading, revalidate} = useProjectActivationKeys();
	const {hasActivationPermission} = useHasLicenseKeyPermission(projectId);
	const admin = useHasAdminPermission();

	const {handleDeactivate, handleDownload, handleReactivate, handleRenew} =
		useActivationKeyActions({generatePath: '../generate', revalidate});

	const activationKey = activationKeys.find(
		(key) => key.id === licenseKeyERC
	);

	const {licenseKeys} = useActivationKeyLicenseKeys(
		activationKey?.unaggregated ? undefined : activationKey?.activationKeyId
	);

	const {licenseKey: unaggregatedLicenseKey} = useUnaggregatedLicenseKey(
		activationKey?.unaggregated ? licenseKeyERC : undefined
	);

	return (
		<div className="w-100">
			<BackLink path="..">{translate('activation')}</BackLink>

			{loading ? (
				<Loading.Page />
			) : activationKey ? (
				<LicenseKeyDetailsContent
					activationKey={activationKey}
					admin={admin}
					hasActivationPermission={hasActivationPermission}
					licenseKeys={
						unaggregatedLicenseKey
							? [unaggregatedLicenseKey]
							: licenseKeys
					}
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
	admin: boolean;
	hasActivationPermission: boolean;
	licenseKeys: ActivationKeyLicenseKey[];
	onDeactivate: () => void;
	onDownload: () => void;
	onReactivate: () => void;
	onRenew: () => void;
};

function LicenseKeyDetailsContent({
	activationKey,
	admin,
	hasActivationPermission,
	licenseKeys,
	onDeactivate,
	onDownload,
	onReactivate,
	onRenew,
}: LicenseKeyDetailsContentProps) {
	const detailsRows: DetailsRow[] = [
		{
			label: translate('type'),
			value: activationKey.type
				? translate(activationKey.type as Word)
				: '-',
		},
		{label: translate('start-date'), value: activationKey.startDate || '-'},
		{
			label: translate('end-date'),
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
							!activationKey.complimentary &&
							isRenewableKey(activationKey, admin) && (
								<ClayButton
									displayType="secondary"
									onClick={onRenew}
								>
									{translate('renew')}
								</ClayButton>
							)}

						{activationKey.complimentary
							? admin &&
								activationKey.active && (
									<ClayButton
										displayType="danger"
										onClick={onDeactivate}
									>
										{translate('deactivate')}
									</ClayButton>
								)
							: hasActivationPermission &&
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
				title={
					activationKey.unaggregated
						? 'license-key-details'
						: 'activation-key-details'
				}
			/>

			<LicenseKeyList licenseKeys={licenseKeys} />

			{!activationKey.unaggregated && (
				<ExpirationNotifications
					activationKeyId={activationKey.activationKeyId}
				/>
			)}
		</>
	);
}

type ExpirationNotificationsProps = {
	activationKeyId: string;
};

function ExpirationNotifications({
	activationKeyId,
}: ExpirationNotificationsProps) {
	const {subscribed, toggleSubscription} =
		useActivationKeySubscription(activationKeyId);

	return (
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
	);
}
