/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayCheckbox} from '@clayui/form';
import {zodResolver} from '@hookform/resolvers/zod';
import {Controller, useForm} from 'react-hook-form';
import {Navigate} from 'react-router-dom';
import {z} from 'zod';
import {Input} from '~/components/Input/Input';
import Select from '~/components/Select/Select';
import {useOneContext} from '~/context/OneContextProvider';
import useMarketoForm from '~/hooks/useMarketoForm';
import i18n from '~/i18n';
import LicenseTermsCheckbox from '~/pages/ProductPurchase/components/LicenseTermsCheckbox/LicenseTermsCheckbox';
import {useProductPurchaseLayoutContext} from '~/pages/ProductPurchase/components/ProductPurchaseLayout/ProductPurchaseLayout';
import ProductPurchaseShell from '~/pages/ProductPurchase/components/ProductPurchaseShell/ProductPurchaseShell';
import useCommerceRegions from '~/pages/ProductPurchase/hooks/useCommerceRegions';
import commerceSchemas from '~/schema/commerceSchemas';
import ProductPurchaseSelfServiceTrial from '~/services/commerce/ProductPurchaseSelfServiceTrial';
import {Liferay} from '~/services/liferay/liferay';

export type SelfServiceTrialFormData = z.infer<
	typeof commerceSchemas.selfServiceTrial
>;

const SelfServiceTrialForm = () => {
	const {
		actions: {previousStep},
		handlePurchase,
		product,
		selectedAccount,
	} = useProductPurchaseLayoutContext();

	const {properties} = useOneContext();

	const {data: countriesResponse} = useCommerceRegions();

	const {
		control,
		formState: {errors, isValid},
		handleSubmit,
		register,
		setValue,
		watch,
	} = useForm<SelfServiceTrialFormData>({
		defaultValues: {
			businessEmailAddress: Liferay.ThemeDisplay.getUserEmailAddress(),
			companyName: '',
			country: '',
			fullName: Liferay.ThemeDisplay.getUserName(),
			jobTitle: '',
			notifyMeAboutProducts: false,
			phoneNumber: '',
			termsAndConditions: false,
		},
		mode: 'onChange',
		resolver: zodResolver(commerceSchemas.selfServiceTrial),
	});

	const marketoFormId = properties.marketoFormIdDefault;

	const {triggerSubmit} = useMarketoForm({formId: marketoFormId});

	if (!selectedAccount?.id) {
		return <Navigate replace to="/" />;
	}

	const countries = countriesResponse?.items ?? [];

	const onSubmit = async (formFields: SelfServiceTrialFormData) => {
		const [firstName, ...lastName] = formFields.fullName.split(' ');

		await triggerSubmit({
			Company: formFields.companyName,
			Country: formFields.country,
			Email: formFields.businessEmailAddress,
			FirstName: firstName,
			LastName: lastName.join(' '),
			Phone: formFields.phoneNumber,
			Share_with_Partners__c: formFields.notifyMeAboutProducts,
			Title: formFields.jobTitle,
		});

		await handlePurchase(
			new ProductPurchaseSelfServiceTrial(selectedAccount, product)
		);
	};

	return (
		<ProductPurchaseShell
			footerProps={{
				backButtonProps: {
					onClick: () => previousStep(),
				},
				continueButtonProps: {
					children: i18n.translate('start-trial'),
					disabled: !isValid,
					onClick: () => handleSubmit(onSubmit)(),
				},
			}}
			title={i18n.translate('start-your-free-trial')}
		>
			<p className="text-muted">
				{i18n.translate(
					'tell-us-a-bit-about-yourself-to-activate-your-90-day-trial'
				)}
			</p>

			<form aria-hidden="true" hidden id={`mktoForm_${marketoFormId}`} />

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
				required
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
					setValue('country', value, {shouldValidate: true})
				}
				options={countries.map(({name}) => ({key: name, name}))}
				required
				value={watch('country')}
			/>

			<Input
				{...register('phoneNumber')}
				errorMessage={errors.phoneNumber?.message}
				label={i18n.translate('phone-number')}
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
				checked={Boolean(watch('termsAndConditions'))}
				onChange={() =>
					setValue(
						'termsAndConditions',
						!watch('termsAndConditions'),
						{shouldValidate: true}
					)
				}
				product={product}
			/>
		</ProductPurchaseShell>
	);
};

export default SelfServiceTrialForm;
