/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayAlert from '@clayui/alert';
import {ClaySelect} from '@clayui/form';
import {useEffect, useMemo} from 'react';
import {UseFormReturn} from 'react-hook-form';
import RadioCardList from '~/components/RadioCardList/RadioCardList';
import {Word, sub, translate} from '~/i18n';
import {getIconSpriteMap} from '~/services/liferay/liferay';
import {
	GenerateForm,
	GenerateFormProduct,
	GenerateFormSubscription,
} from '~/services/spring-boot/ActivationKeys';
import {formatDate} from '~/utils/dateUtils';

import WizardFooter from '../../../CloudAppInstall/WizardFooter/WizardFooter';
import SelectField from '../components/SelectField/SelectField';
import {GenerateActivationKeyForm} from '../types';
import {
	COMPLIMENTARY_DURATION_DAYS,
	FREE_KEY_TYPE,
	getLeadingProductLabel,
	hasAvailableActivations,
	hasAvailableKeyType,
	isCloudNativeProduct,
	isComplimentaryKeyType,
	isDeveloperKeyType,
} from '../utils';

type SubscriptionStepProps = {
	contractTermHelp?: Word;
	form: UseFormReturn<GenerateActivationKeyForm>;
	generateForm: GenerateForm;
	onClickCancel: () => void;
	onClickContinue: () => void;
	renewing?: boolean;
};

export default function SubscriptionStep({
	contractTermHelp,
	form,
	generateForm,
	onClickCancel,
	onClickContinue,
	renewing,
}: SubscriptionStepProps) {
	const {register, setValue, watch} = form;

	const keyType = watch('keyType');
	const productExternalReferenceCode = watch('productExternalReferenceCode');
	const subscriptionEntitlementId = watch('subscriptionEntitlementId');

	const product: GenerateFormProduct | undefined = useMemo(
		() =>
			generateForm.products.find(
				(current) =>
					current.externalReferenceCode ===
					productExternalReferenceCode
			),
		[generateForm.products, productExternalReferenceCode]
	);

	const cloudNative = isCloudNativeProduct(productExternalReferenceCode);
	const complimentary = isComplimentaryKeyType(keyType);
	const developer = isDeveloperKeyType(keyType);
	const free = keyType === FREE_KEY_TYPE;

	const requiresContractTerm =
		!cloudNative && !complimentary && !developer && !free;

	const keyTypes = useMemo(() => product?.keyTypes ?? [], [product]);

	const subscriptions = useMemo(() => {
		const selectedKeyType = keyTypes.find(
			(current) => current.key === keyType
		);

		return selectedKeyType?.subscriptions ?? [];
	}, [keyType, keyTypes]);

	useEffect(() => {
		const selectableKeyType =
			keyTypes.find(hasAvailableActivations) ?? keyTypes[0];

		if (
			(!renewing || !keyType) &&
			selectableKeyType &&
			!keyTypes.some((current) => current.key === keyType)
		) {
			setValue('keyType', selectableKeyType.key);
		}
	}, [keyType, keyTypes, renewing, setValue]);

	useEffect(() => {
		if (renewing || requiresContractTerm) {
			return;
		}

		const selectedKeyType = keyTypes.find(
			(current) => current.key === keyType
		);

		if (selectedKeyType) {
			setValue(
				'subscriptionEntitlementId',
				selectedKeyType.entitlementId
			);
		}
	}, [keyType, keyTypes, renewing, requiresContractTerm, setValue]);

	useEffect(() => {
		if (renewing || !subscriptionEntitlementId) {
			return;
		}

		const entitled = subscriptions.some(
			(subscription) =>
				subscription.entitlementId === subscriptionEntitlementId
		);

		if (!entitled) {
			setValue('subscriptionEntitlementId', 0);
		}
	}, [renewing, setValue, subscriptionEntitlementId, subscriptions]);

	const selectedSubscription = subscriptions.find(
		(subscription) =>
			subscription.entitlementId === subscriptionEntitlementId
	);

	function toContentListItem(subscription: GenerateFormSubscription) {
		const available = subscription.availableCount > 0;

		return {
			description: (
				<span className="d-flex flex-column">
					<span
						className={
							available
								? 'generate-activation-key-subscription-available'
								: 'generate-activation-key-subscription-unavailable'
						}
					>
						{sub('key-activations-available-x-of-x', [
							String(subscription.availableCount),
							String(subscription.totalCount),
						])}
					</span>

					<span className="generate-activation-key-subscription-size">
						{sub('instance-size-x', [
							String(subscription.instanceSize),
						])}
					</span>
				</span>
			),
			disabled: !available,
			id: subscription.entitlementId,
			selected: subscription.entitlementId === subscriptionEntitlementId,
			title: (
				<span className="generate-activation-key-subscription-title">
					{`${formatDate(subscription.startDate)} - ${formatDate(
						subscription.endDate
					)}`}
				</span>
			),
			value: subscription,
		};
	}

	const noActivationsAvailable =
		!developer &&
		Boolean(subscriptions.length) &&
		(selectedSubscription
			? selectedSubscription.availableCount <= 0
			: subscriptions.every(
					(subscription) => subscription.availableCount <= 0
				));

	const canContinue = Boolean(
		productExternalReferenceCode &&
			keyType &&
			(!requiresContractTerm || subscriptionEntitlementId) &&
			!noActivationsAvailable
	);

	if (!generateForm.products.length) {
		return (
			<>
				<ClayAlert
					className="generate-activation-key-subscription-alert"
					displayType="warning"
					role={null}
					spritemap={getIconSpriteMap()}
					symbol="warning-full"
				>
					{translate(
						'this-project-has-no-subscriptions-that-can-generate-activation-keys-contact-your-liferay-sales-representative'
					)}
				</ClayAlert>

				<WizardFooter cancelButtonProps={{onClick: onClickCancel}} />
			</>
		);
	}

	return (
		<>
			<div className="row">
				<div className="col-md-6">
					<div className="form-group">
						<label className="ml-0" htmlFor="generateKeyProduct">
							{translate('product')}
						</label>

						<SelectField
							id="generateKeyProduct"
							single={
								(renewing &&
									Boolean(productExternalReferenceCode)) ||
								generateForm.products.length <= 1
							}
						>
							<ClaySelect
								disabled={
									(renewing &&
										Boolean(
											productExternalReferenceCode
										)) ||
									generateForm.products.length <= 1
								}
								id="generateKeyProduct"
								{...register('productExternalReferenceCode')}
							>
								{generateForm.products.map((current) => (
									<ClaySelect.Option
										disabled={
											!renewing &&
											!hasAvailableKeyType(current)
										}
										key={current.externalReferenceCode}
										label={
											getLeadingProductLabel(
												current.externalReferenceCode
											) || current.label
										}
										value={current.externalReferenceCode}
									/>
								))}
							</ClaySelect>
						</SelectField>
					</div>
				</div>

				<div className="col-md-6">
					<div className="form-group">
						<label className="ml-0" htmlFor="generateKeyKeyType">
							{translate('key-type')}
						</label>

						<SelectField
							id="generateKeyKeyType"
							single={
								(renewing && Boolean(keyType)) ||
								keyTypes.length <= 1
							}
						>
							<ClaySelect
								disabled={
									(renewing && Boolean(keyType)) ||
									keyTypes.length <= 1
								}
								id="generateKeyKeyType"
								{...register('keyType')}
							>
								{renewing && keyType ? (
									<ClaySelect.Option
										label={translate(keyType as Word)}
										value={keyType}
									/>
								) : (
									keyTypes.map((current) => (
										<ClaySelect.Option
											disabled={
												!renewing &&
												!hasAvailableActivations(
													current
												)
											}
											key={current.key}
											label={translate(
												current.key as Word
											)}
											value={current.key}
										/>
									))
								)}
							</ClaySelect>
						</SelectField>
					</div>
				</div>
			</div>

			{complimentary && (
				<ClayAlert
					className="generate-activation-key-subscription-alert"
					displayType="warning"
					role={null}
					spritemap={getIconSpriteMap()}
					symbol="warning-full"
					title={translate('complimentary')}
				>
					<ul className="mb-0 pl-4">
						<li>{translate('this-key-can-be-generated-once')}</li>

						<li>
							{sub('this-key-expires-after-x-days', [
								String(COMPLIMENTARY_DURATION_DAYS),
							])}
						</li>

						<li>
							{translate(
								'this-key-is-not-tied-to-a-subscription-and-is-intended-for-temporary-access-only'
							)}
						</li>
					</ul>
				</ClayAlert>
			)}

			{requiresContractTerm && (
				<div className="form-group">
					<label className="ml-0">{translate('contract-term')}</label>

					{contractTermHelp ? (
						<p className="generate-activation-key-subscription-help">
							{translate(contractTermHelp)}
						</p>
					) : null}

					<RadioCardList
						contentList={subscriptions.map(toContentListItem)}
						leftRadio
						onSelect={({value}) =>
							setValue(
								'subscriptionEntitlementId',
								(value as GenerateFormSubscription)
									.entitlementId
							)
						}
					/>

					{noActivationsAvailable && (
						<ClayAlert
							className="generate-activation-key-subscription-alert"
							displayType="warning"
							role={null}
							spritemap={getIconSpriteMap()}
							symbol="warning-full"
						>
							{translate(
								'there-are-no-key-activations-available-deactivate-a-key-or-contact-the-provisioning-team'
							)}
						</ClayAlert>
					)}

					{selectedSubscription && !noActivationsAvailable && (
						<ClayAlert
							className="generate-activation-key-subscription-alert"
							displayType="info"
							role={null}
							spritemap={getIconSpriteMap()}
							symbol="info-circle"
						>
							{translate('activation-key-will-be-valid')}{' '}
							<strong>
								{`${formatDate(
									selectedSubscription.startDate
								)} - ${formatDate(
									selectedSubscription.endDate
								)}`}
							</strong>
						</ClayAlert>
					)}
				</div>
			)}

			<WizardFooter
				cancelButtonProps={{onClick: onClickCancel}}
				continueButtonProps={{
					children: translate('next'),
					disabled: !canContinue,
					onClick: onClickContinue,
				}}
			/>
		</>
	);
}
