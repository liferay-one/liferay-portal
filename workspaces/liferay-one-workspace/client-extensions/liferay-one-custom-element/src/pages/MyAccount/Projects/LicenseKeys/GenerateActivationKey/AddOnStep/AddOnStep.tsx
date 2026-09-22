/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayCheckbox} from '@clayui/form';
import {ClayTooltipProvider} from '@clayui/tooltip';
import classNames from 'classnames';
import {UseFormReturn} from 'react-hook-form';
import {translate} from '~/i18n';
import {
	GenerateForm,
	GenerateFormBundleProduct,
} from '~/services/spring-boot/LicenseKeys';

import WizardFooter from '../../../CloudAppInstall/WizardFooter/WizardFooter';
import {GenerateActivationKeyForm} from '../types';

type AddOnStepProps = {
	form: UseFormReturn<GenerateActivationKeyForm>;
	generateForm: GenerateForm;
	onClickBack: () => void;
	onClickCancel: () => void;
	onClickContinue: () => void;
	renewing?: boolean;
};

export default function AddOnStep({
	form,
	generateForm,
	onClickBack,
	onClickCancel,
	onClickContinue,
	renewing,
}: AddOnStepProps) {
	const {setValue, watch} = form;

	const bundleEntitlementIds = watch('bundleEntitlementIds');
	const productExternalReferenceCode = watch('productExternalReferenceCode');

	function isRequired(bundleProduct: GenerateFormBundleProduct) {
		return (
			bundleProduct.externalReferenceCode === productExternalReferenceCode
		);
	}

	function toggle(entitlementId: number) {
		setValue(
			'bundleEntitlementIds',
			bundleEntitlementIds.includes(entitlementId)
				? bundleEntitlementIds.filter(
						(current) => current !== entitlementId
					)
				: [...bundleEntitlementIds, entitlementId]
		);
	}

	return (
		<>
			<div className="generate-activation-key-add-ons">
				{generateForm.bundleProducts.map((bundleProduct) => {
					const available =
						renewing || bundleProduct.availableCount > 0;
					const checked = bundleEntitlementIds.includes(
						bundleProduct.entitlementId
					);
					const required = isRequired(bundleProduct);

					let unavailableReason = '';

					if (!bundleProduct.licensable) {
						unavailableReason = translate(
							'no-license-is-available-for-this-product'
						);
					}
					else if (!available) {
						unavailableReason = translate(
							'no-key-activations-are-available-for-this-product'
						);
					}

					return (
						<ClayTooltipProvider key={bundleProduct.entitlementId}>
							<div
								className={classNames(
									'generate-activation-key-add-on',
									{
										'generate-activation-key-add-on-required':
											checked && required,
										'generate-activation-key-add-on-selected':
											checked && !required,
										'generate-activation-key-add-on-unavailable':
											unavailableReason,
									}
								)}
								data-tooltip-align="top"
								title={unavailableReason || undefined}
							>
								<ClayCheckbox
									checked={checked && !unavailableReason}
									disabled={
										Boolean(unavailableReason) || required
									}
									label={bundleProduct.name}
									onChange={() =>
										toggle(bundleProduct.entitlementId)
									}
								/>
							</div>
						</ClayTooltipProvider>
					);
				})}
			</div>

			<WizardFooter
				backButtonProps={{onClick: onClickBack}}
				cancelButtonProps={{onClick: onClickCancel}}
				continueButtonProps={{
					children: translate('next'),
					disabled: !bundleEntitlementIds.length,
					onClick: onClickContinue,
				}}
			/>
		</>
	);
}
