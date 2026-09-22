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
} from '~/services/spring-boot/LicenseKeys';
import {formatDate} from '~/utils/dateUtils';

import WizardFooter from '../../../CloudAppInstall/WizardFooter/WizardFooter';
import SelectField from '../components/SelectField/SelectField';
import {GenerateActivationKeyForm} from '../types';
import {isDeveloperKeyType} from '../utils';

type SubscriptionStepProps = {
	form: UseFormReturn<GenerateActivationKeyForm>;
	generateForm: GenerateForm;
	onClickCancel: () => void;
	onClickContinue: () => void;
	onClickDownload: () => void;
	renewing?: boolean;
	submitting: boolean;
	subscriptionHelp?: Word;
};

export default function SubscriptionStep({
	form,
	generateForm,
	onClickCancel,
	onClickContinue,
	onClickDownload,
	renewing,
	submitting,
	subscriptionHelp,
}: SubscriptionStepProps) {
	const {register, setValue, watch} = form;

	const keyType = watch('keyType');
	const productExternalReferenceCode = watch('productExternalReferenceCode');
	const subscriptionEntitlementId = watch('subscriptionEntitlementId');
	const version = watch('version');

	const product: GenerateFormProduct | undefined = useMemo(
		() =>
			generateForm.products.find(
				(current) =>
					current.externalReferenceCode ===
					productExternalReferenceCode
			),
		[generateForm.products, productExternalReferenceCode]
	);

	const developer = isDeveloperKeyType(keyType);

	const versions = useMemo(() => {
		if (developer) {
			return product?.developerVersions ?? [];
		}

		return product?.versions ?? [];
	}, [developer, product?.developerVersions, product?.versions]);

	const keyTypes = useMemo(() => product?.keyTypes ?? [], [product]);

	useEffect(() => {
		const [firstKeyType] = keyTypes;

		if (
			(!renewing || !keyType) &&
			firstKeyType &&
			!keyTypes.some((current) => current.label === keyType)
		) {
			setValue('keyType', firstKeyType.label);
		}
	}, [keyType, keyTypes, renewing, setValue]);

	useEffect(() => {
		const [firstVersion] = versions;

		if (
			(!renewing || !version) &&
			firstVersion &&
			!versions.includes(version)
		) {
			setValue('version', firstVersion);
		}
	}, [renewing, setValue, version, versions]);

	const subscriptions = product?.subscriptions ?? [];

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

	const canContinue = Boolean(
		productExternalReferenceCode &&
			keyType &&
			version &&
			(developer || subscriptionEntitlementId)
	);

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
										key={current.externalReferenceCode}
										label={current.name}
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
										label={keyType}
										value={keyType}
									/>
								) : (
									keyTypes.map((current) => (
										<ClaySelect.Option
											key={current.label}
											label={current.label}
											value={current.label}
										/>
									))
								)}
							</ClaySelect>
						</SelectField>
					</div>
				</div>
			</div>

			<div className="form-group">
				<label className="ml-0" htmlFor="generateKeyVersion">
					{translate('version')}
				</label>

				<SelectField
					id="generateKeyVersion"
					single={
						(renewing && Boolean(version)) || versions.length <= 1
					}
				>
					<ClaySelect
						disabled={
							(renewing && Boolean(version)) ||
							versions.length <= 1
						}
						id="generateKeyVersion"
						{...register('version')}
					>
						{renewing && version ? (
							<ClaySelect.Option
								label={version}
								value={version}
							/>
						) : (
							versions.map((current) => (
								<ClaySelect.Option
									key={current}
									label={current}
									value={current}
								/>
							))
						)}
					</ClaySelect>
				</SelectField>
			</div>

			{!developer && (
				<div className="form-group">
					<label className="ml-0">{translate('subscription')}</label>

					{subscriptionHelp ? (
						<p className="generate-activation-key-subscription-help">
							{translate(subscriptionHelp)}
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

					{selectedSubscription && (
						<ClayAlert
							className="generate-activation-key-subscription-alert"
							displayType="info"
							role={null}
							spritemap={getIconSpriteMap()}
							symbol="info-circle"
						>
							{translate('activation-keys-will-be-valid')}{' '}
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
				cancelButtonProps={{
					disabled: submitting,
					onClick: onClickCancel,
				}}
				continueButtonProps={{
					children: developer
						? translate('download')
						: translate('next'),
					disabled: !canContinue || submitting,
					onClick: developer ? onClickDownload : onClickContinue,
				}}
			/>
		</>
	);
}
