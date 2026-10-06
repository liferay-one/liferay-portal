/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayCheckbox} from '@clayui/form';
import {ClayTooltipProvider} from '@clayui/tooltip';
import classNames from 'classnames';
import {useEffect} from 'react';
import {UseFormReturn} from 'react-hook-form';
import {translate} from '~/i18n';
import {
	GenerateForm,
	GenerateFormBundleProduct,
} from '~/services/spring-boot/ActivationKeys';

import WizardFooter from '../../../CloudAppInstall/WizardFooter/WizardFooter';
import SelectionButtons from '../components/SelectionButtons/SelectionButtons';
import VersionField from '../components/VersionField/VersionField';
import {GenerateActivationKeyForm} from '../types';
import {getBundleProducts, isLicensedForVersion} from '../utils';

type AddOnStepProps = {
	developer: boolean;
	form: UseFormReturn<GenerateActivationKeyForm>;
	generateForm: GenerateForm;
	onClickBack: () => void;
	onClickCancel: () => void;
	onClickContinue: () => void;
	renewing?: boolean;
	submitting: boolean;
	versions: string[];
};

export default function AddOnStep({
	developer,
	form,
	generateForm,
	onClickBack,
	onClickCancel,
	onClickContinue,
	renewing,
	submitting,
	versions,
}: AddOnStepProps) {
	const {setValue, watch} = form;

	const bundleEntitlementIds = watch('bundleEntitlementIds');
	const productExternalReferenceCode = watch('productExternalReferenceCode');
	const version = watch('version');

	const bundleProducts = getBundleProducts(
		generateForm,
		productExternalReferenceCode
	);

	function getUnavailableReason(bundleProduct: GenerateFormBundleProduct) {
		if (!bundleProduct.licensable) {
			return translate('no-license-is-available-for-this-product');
		}

		if (!developer && !renewing && bundleProduct.availableCount <= 0) {
			return translate(
				'no-key-activations-are-available-for-this-product'
			);
		}

		if (!isLicensedForVersion(bundleProduct, version)) {
			return translate(
				'this-product-is-not-available-for-the-selected-version'
			);
		}

		return '';
	}

	const unavailableEntitlementIds = bundleProducts
		.filter((bundleProduct) => getUnavailableReason(bundleProduct))
		.map((bundleProduct) => bundleProduct.entitlementId);

	useEffect(() => {
		const selectableEntitlementIds = bundleEntitlementIds.filter(
			(entitlementId) =>
				!unavailableEntitlementIds.includes(entitlementId)
		);

		if (selectableEntitlementIds.length !== bundleEntitlementIds.length) {
			setValue('bundleEntitlementIds', selectableEntitlementIds);
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [bundleEntitlementIds.join(), unavailableEntitlementIds.join()]);

	function isRequired(bundleProduct: GenerateFormBundleProduct) {
		return (
			bundleProduct.externalReferenceCode === productExternalReferenceCode
		);
	}

	const selectableEntitlementIds = bundleProducts
		.filter(
			(bundleProduct) =>
				!unavailableEntitlementIds.includes(bundleProduct.entitlementId)
		)
		.map((bundleProduct) => bundleProduct.entitlementId);

	const requiredEntitlementIds = bundleProducts
		.filter(
			(bundleProduct) =>
				isRequired(bundleProduct) &&
				!unavailableEntitlementIds.includes(bundleProduct.entitlementId)
		)
		.map((bundleProduct) => bundleProduct.entitlementId);

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
			<VersionField form={form} renewing={renewing} versions={versions} />

			<SelectionButtons
				onClickDeselectAll={() =>
					setValue('bundleEntitlementIds', requiredEntitlementIds)
				}
				onClickSelectAll={() =>
					setValue('bundleEntitlementIds', selectableEntitlementIds)
				}
			/>

			<div className="generate-activation-key-add-ons">
				{bundleProducts.map((bundleProduct) => {
					const checked = bundleEntitlementIds.includes(
						bundleProduct.entitlementId
					);
					const required = isRequired(bundleProduct);
					const unavailableReason =
						getUnavailableReason(bundleProduct);

					return (
						<ClayTooltipProvider key={bundleProduct.entitlementId}>
							<div
								className={classNames(
									'generate-activation-key-add-on',
									{
										'generate-activation-key-add-on-required':
											required,
										'generate-activation-key-add-on-selected':
											checked,
										'generate-activation-key-add-on-unavailable':
											unavailableReason,
									}
								)}
								data-tooltip-align="top"
								title={unavailableReason || undefined}
							>
								<ClayCheckbox
									checked={checked}
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
				backButtonProps={{disabled: submitting, onClick: onClickBack}}
				cancelButtonProps={{
					disabled: submitting,
					onClick: onClickCancel,
				}}
				continueButtonProps={{
					children: translate(developer ? 'download' : 'next'),
					disabled:
						!bundleEntitlementIds.length || !version || submitting,
					onClick: onClickContinue,
				}}
			/>
		</>
	);
}
