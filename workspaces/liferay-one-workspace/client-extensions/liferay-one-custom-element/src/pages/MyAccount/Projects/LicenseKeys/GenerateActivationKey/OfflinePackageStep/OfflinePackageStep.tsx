/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayAlert from '@clayui/alert';
import {ClayCheckbox} from '@clayui/form';
import {useEffect, useState} from 'react';
import {UseFormReturn} from 'react-hook-form';
import Button from '~/components/Button/Button';
import Loading from '~/components/Loading/Loading';
import {translate} from '~/i18n';
import {getIconSpriteMap} from '~/services/liferay/liferay';

import WizardFooter from '../../../CloudAppInstall/WizardFooter/WizardFooter';
import SelectionButtons from '../components/SelectionButtons/SelectionButtons';
import VersionField from '../components/VersionField/VersionField';
import useEnvironmentSubscriptions from '../hooks/useEnvironmentSubscriptions';
import {GenerateActivationKeyForm} from '../types';

const COLLAPSED_COUNT = 6;

type OfflinePackageStepProps = {
	form: UseFormReturn<GenerateActivationKeyForm>;
	onClickBack: () => void;
	onClickCancel: () => void;
	onClickDownload: () => void;
	submitting: boolean;
	versions: string[];
};

export default function OfflinePackageStep({
	form,
	onClickBack,
	onClickCancel,
	onClickDownload,
	submitting,
	versions,
}: OfflinePackageStepProps) {
	const {setValue, watch} = form;

	const [expanded, setExpanded] = useState(false);

	const offlineEnvironment = watch('offlineEnvironment');
	const offlineModifying = watch('offlineModifying');
	const offlineSubscriptionIds = watch('offlineSubscriptionIds');

	const {error, loading, subscriptions} = useEnvironmentSubscriptions(
		offlineEnvironment?.environmentId
	);

	const bundledEntitlementIds = offlineEnvironment?.bundledEntitlementIds;

	useEffect(() => {
		if (loading) {
			return;
		}

		const entitlementIds = subscriptions.map(
			(subscription) => subscription.entitlementId
		);

		setValue(
			'offlineSubscriptionIds',
			offlineModifying && bundledEntitlementIds?.length
				? entitlementIds.filter((entitlementId) =>
						bundledEntitlementIds.includes(entitlementId)
					)
				: entitlementIds
		);
	}, [
		bundledEntitlementIds,
		loading,
		offlineModifying,
		setValue,
		subscriptions,
	]);

	const visibleSubscriptions = expanded
		? subscriptions
		: subscriptions.slice(0, COLLAPSED_COUNT);

	function toggle(entitlementId: number) {
		setValue(
			'offlineSubscriptionIds',
			offlineSubscriptionIds.includes(entitlementId)
				? offlineSubscriptionIds.filter(
						(current) => current !== entitlementId
					)
				: [...offlineSubscriptionIds, entitlementId]
		);
	}

	if (loading) {
		return <Loading />;
	}

	if (error) {
		return (
			<>
				<ClayAlert
					className="mb-3"
					displayType="danger"
					spritemap={getIconSpriteMap()}
					title={translate('error')}
				>
					{translate('an-unexpected-error-occurred')}
				</ClayAlert>

				<WizardFooter
					backButtonProps={{onClick: onClickBack}}
					cancelButtonProps={{onClick: onClickCancel}}
					continueButtonProps={{
						children: translate('download-package'),
						disabled: true,
						onClick: onClickDownload,
					}}
				/>
			</>
		);
	}

	return (
		<>
			<VersionField form={form} versions={versions} />

			<SelectionButtons
				onClickDeselectAll={() =>
					setValue('offlineSubscriptionIds', [])
				}
				onClickSelectAll={() =>
					setValue(
						'offlineSubscriptionIds',
						subscriptions.map(
							(subscription) => subscription.entitlementId
						)
					)
				}
			/>

			{subscriptions.length ? (
				<div className="generate-activation-key-subscriptions">
					{visibleSubscriptions.map((subscription) => (
						<div
							className="generate-activation-key-subscription"
							key={subscription.entitlementId}
						>
							<ClayCheckbox
								checked={offlineSubscriptionIds.includes(
									subscription.entitlementId
								)}
								label={subscription.name}
								onChange={() =>
									toggle(subscription.entitlementId)
								}
							/>
						</div>
					))}
				</div>
			) : (
				<p className="text-neutral-7">
					{translate(
						'there-are-no-subscriptions-entitled-to-this-environment'
					)}
				</p>
			)}

			{subscriptions.length > COLLAPSED_COUNT && (
				<Button
					displayType="unstyled"
					onClick={() => setExpanded(!expanded)}
				>
					{expanded ? translate('view-less') : translate('view-more')}
				</Button>
			)}

			<WizardFooter
				backButtonProps={{disabled: submitting, onClick: onClickBack}}
				cancelButtonProps={{
					disabled: submitting,
					onClick: onClickCancel,
				}}
				continueButtonProps={{
					children: translate('download-package'),
					disabled: submitting || !offlineSubscriptionIds.length,
					onClick: onClickDownload,
				}}
			/>
		</>
	);
}
