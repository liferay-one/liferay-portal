/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayDropDown from '@clayui/drop-down';
import ClayForm, {ClayCheckbox} from '@clayui/form';
import ClayIcon from '@clayui/icon';
import {zodResolver} from '@hookform/resolvers/zod';
import {useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {Navigate} from 'react-router-dom';
import {Input} from '~/components/Input/Input';
import Select from '~/components/Select/Select';
import i18n from '~/i18n';
import LicenseTermsCheckbox from '~/pages/ProductPurchase/components/LicenseTermsCheckbox/LicenseTermsCheckbox';
import {useProductPurchaseLayoutContext} from '~/pages/ProductPurchase/components/ProductPurchaseLayout/ProductPurchaseLayout';
import ProductPurchaseShell from '~/pages/ProductPurchase/components/ProductPurchaseShell/ProductPurchaseShell';
import useCommerceRegions from '~/pages/ProductPurchase/hooks/useCommerceRegions';
import commerceSchemas from '~/schema/commerceSchemas';
import ProductPurchaseDXPFree from '~/services/commerce/ProductPurchaseDXPFree';
import FetcherError from '~/services/fetcher/FetcherError';
import {Liferay} from '~/services/liferay/liferay';
import LicenseKeys from '~/services/spring-boot/LicenseKeys';
import phones from '~/utils/phones';

import type {ActivationKeyFormData} from '~/services/commerce/ProductPurchaseDXPFree';

const SET_VALUE_OPTIONS = {
	shouldDirty: true,
	shouldValidate: true,
};

const PURPOSE_OPTIONS = [
	{key: 'personal-learning-education', name: 'Personal Learning / Education'},
	{key: 'proof-of-concept', name: 'Proof of Concept (POC)'},
	{key: 'development-and-testing', name: 'Development & Testing'},
	{key: 'internal-side-project', name: 'Internal Side Project'},
	{key: 'small-business-production', name: 'Small Business Production Use'},
];

const ActivationKeyForm = () => {
	const {
		actions: {previousStep},
		handlePurchase,
		product,
		selectedAccount,
	} = useProductPurchaseLayoutContext();

	const [currentPhone, setCurrentPhone] = useState({
		code: '+1',
		flag: 'en-us',
	});

	const {data: regionsResponse} = useCommerceRegions();

	const countries = regionsResponse?.items ?? [];

	const {
		control,
		formState: {errors, isValid},
		handleSubmit,
		register,
		setError,
		setValue,
		watch,
	} = useForm<ActivationKeyFormData>({
		defaultValues: {
			businessEmailAddress: Liferay.ThemeDisplay.getUserEmailAddress(),
			companyName: '',
			country: '',
			domain: '',
			extension: '',
			fullName: '',
			intlCode: {code: '+1', flag: 'en-us'},
			jobTitle: '',
			notifyMeAboutProducts: false,
			phoneNumber: '',
			purpose: '',
			termsAndConditions: false,
			userAgreement: false,
		},
		mode: 'onChange',
		resolver: zodResolver(commerceSchemas.activationKey),
	});

	if (!selectedAccount?.id) {
		return <Navigate replace to="/" />;
	}

	const acceptedTerms =
		Boolean(watch('termsAndConditions')) && Boolean(watch('userAgreement'));

	const onSubmit = async (formFields: ActivationKeyFormData) => {
		const owner = formFields.businessEmailAddress;

		try {
			await LicenseKeys.licenseKeyTypeFreeDomainsCheck({
				domains: formFields.domain,
				owner,
			});
		}
		catch (error) {
			if (error instanceof FetcherError && error.status === 409) {
				setError('domain', {
					message: i18n.translate(
						'an-activation-key-for-the-entered-domain-already-exists'
					),
				});

				return;
			}

			throw error;
		}

		await handlePurchase(
			new ProductPurchaseDXPFree(selectedAccount, product, formFields)
		);
	};

	return (
		<ProductPurchaseShell
			footerProps={{
				backButtonProps: {
					onClick: () => previousStep(),
				},
				continueButtonProps: {
					children: i18n.translate('get-activation-key'),
					disabled: !isValid,
					onClick: () => handleSubmit(onSubmit)(),
				},
			}}
			title={i18n.translate('activation-key-creation')}
		>
			<Input
				{...register('fullName')}
				errorMessage={errors.fullName?.message}
				label={i18n.translate('full-name')}
				required
			/>

			<Input
				{...register('businessEmailAddress')}
				errorMessage={errors.businessEmailAddress?.message}
				label={i18n.translate('business-email-address')}
				required
			/>

			<Input
				{...register('companyName')}
				errorMessage={errors.companyName?.message}
				label={i18n.translate('company-name')}
			/>

			<Input
				{...register('jobTitle')}
				errorMessage={errors.jobTitle?.message}
				label={i18n.translate('job-title')}
			/>

			<Select
				defaultOptionLabel={i18n.translate('select-an-option')}
				errors={errors as {[key: string]: {message?: string}}}
				label={i18n.translate('country')}
				name="country"
				onChange={({target: {value}}) =>
					setValue('country', value, SET_VALUE_OPTIONS)
				}
				options={countries.map((country) => ({
					key: country.title_i18n?.en_US,
					name: country.title_i18n?.en_US,
				}))}
				required
				value={watch('country')}
			/>

			<p className="h4 mt-4">{i18n.translate('phone')}</p>

			<ClayForm.Group>
				<div className="d-flex justify-content-between purchased-solutions-phone">
					<div className="col-3 p-0">
						<ClayDropDown
							closeOnClick
							tabIndex={0}
							trigger={
								<div className="align-items-center custom-input custom-select d-flex form-control p-2 rounded-xs">
									<ClayIcon
										className="mr-2"
										symbol={currentPhone.flag}
									/>

									{currentPhone.code}
								</div>
							}
						>
							<ClayDropDown.ItemList>
								{phones.map((phone, index) => (
									<ClayDropDown.Item
										key={index}
										onClick={() => {
											setCurrentPhone({
												code: phone.code,
												flag: phone.flag,
											});

											setValue(
												'intlCode',
												{
													code: phone.code,
													flag: phone.flag,
												},
												SET_VALUE_OPTIONS
											);
										}}
									>
										<ClayIcon
											className="mr-2"
											symbol={phone.flag}
										/>

										{phone.code}
									</ClayDropDown.Item>
								))}
							</ClayDropDown.ItemList>
						</ClayDropDown>

						<div className="form-feedback-group">
							<div className="form-text">
								{i18n.translate('intl-code')}
							</div>
						</div>
					</div>

					<div className="col-6">
						<Input
							{...register('phoneNumber')}
							className="w-100"
							errorMessage={errors.phoneNumber?.message}
							helpMessage={i18n.translate('phone-number')}
							id="phoneNumber"
							placeholder="___-___-____"
						/>
					</div>

					<div className="col-3 p-0">
						<Input
							{...register('extension')}
							className="text-nowrap w-100"
							errorMessage={errors.extension?.message}
							helpMessage={i18n.translate('extension')}
							id="extension"
							placeholder={i18n.translate('enter-ext')}
						/>
					</div>
				</div>
			</ClayForm.Group>

			<Select
				defaultOptionLabel={i18n.translate('select-an-option')}
				errors={errors as {[key: string]: {message?: string}}}
				label={i18n.translate('purpose')}
				name="purpose"
				onChange={({target: {value}}) =>
					setValue('purpose', value, {shouldValidate: true})
				}
				options={PURPOSE_OPTIONS}
				required
				value={watch('purpose')}
			/>

			<Input
				{...register('domain')}
				errorMessage={errors.domain?.message}
				helpMessage={i18n.translate(
					'input-one-domain-name-per-instance'
				)}
				label={i18n.translate('domain')}
				required
			/>

			<Controller
				control={control}
				name="notifyMeAboutProducts"
				render={({field}) => (
					<ClayCheckbox
						checked={Boolean(field.value)}
						className="mt-3"
						label={i18n.translate(
							'notify-me-about-products-services-and-events'
						)}
						onChange={() => field.onChange(!field.value)}
					/>
				)}
			/>

			<LicenseTermsCheckbox
				checked={acceptedTerms}
				onChange={() => {
					const value = !acceptedTerms;

					setValue('termsAndConditions', value, {
						shouldValidate: true,
					});
					setValue('userAgreement', value, {shouldValidate: true});
				}}
				product={product}
			/>
		</ProductPurchaseShell>
	);
};

export default ActivationKeyForm;
