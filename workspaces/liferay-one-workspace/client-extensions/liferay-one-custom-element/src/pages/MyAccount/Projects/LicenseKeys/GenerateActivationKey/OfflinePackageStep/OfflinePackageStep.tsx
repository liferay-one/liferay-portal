/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayCheckbox} from '@clayui/form';
import {useState} from 'react';
import {UseFormReturn} from 'react-hook-form';
import Button from '~/components/Button/Button';
import {translate} from '~/i18n';
import {GenerateFormBundleProduct} from '~/services/spring-boot/ActivationKeys';

import WizardFooter from '../../../CloudAppInstall/WizardFooter/WizardFooter';
import {GenerateActivationKeyForm} from '../types';

const COLLAPSED_COUNT = 6;

type OfflinePackageStepProps = {
	bundleProducts: GenerateFormBundleProduct[];
	form: UseFormReturn<GenerateActivationKeyForm>;
	onClickBack: () => void;
	onClickCancel: () => void;
	onClickDownload: () => void;
	submitting: boolean;
};

export default function OfflinePackageStep({
	bundleProducts,
	form,
	onClickBack,
	onClickCancel,
	onClickDownload,
	submitting,
}: OfflinePackageStepProps) {
	const {setValue, watch} = form;

	const [expanded, setExpanded] = useState(false);

	const offlineSubscriptionIds = watch('offlineSubscriptionIds');

	const visibleBundleProducts = expanded
		? bundleProducts
		: bundleProducts.slice(0, COLLAPSED_COUNT);

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

	return (
		<>
			<div className="align-items-center d-flex mb-3">
				<label className="mb-0 mr-3">
					{translate('subscriptions-to-activate')}
				</label>

				<Button
					className="mr-2"
					displayType="unstyled"
					onClick={() =>
						setValue(
							'offlineSubscriptionIds',
							bundleProducts.map(
								(bundleProduct) => bundleProduct.entitlementId
							)
						)
					}
				>
					{translate('select-all')}
				</Button>

				<Button
					displayType="unstyled"
					onClick={() => setValue('offlineSubscriptionIds', [])}
				>
					{translate('deselect-all')}
				</Button>
			</div>

			<div className="generate-activation-key-subscriptions">
				{visibleBundleProducts.map((bundleProduct) => (
					<ClayCheckbox
						checked={offlineSubscriptionIds.includes(
							bundleProduct.entitlementId
						)}
						key={bundleProduct.entitlementId}
						label={bundleProduct.name}
						onChange={() => toggle(bundleProduct.entitlementId)}
					/>
				))}
			</div>

			{bundleProducts.length > COLLAPSED_COUNT && (
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
