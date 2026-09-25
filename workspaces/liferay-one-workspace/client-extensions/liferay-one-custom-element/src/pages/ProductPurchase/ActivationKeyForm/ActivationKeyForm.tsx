/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import ClayDropDown, {Align} from '@clayui/drop-down';
import ClayForm, {ClayCheckbox, ClayInput} from '@clayui/form';
import ClayIcon from '@clayui/icon';
import ClayLoadingIndicator from '@clayui/loading-indicator';
import {zodResolver} from '@hookform/resolvers/zod';
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {Navigate} from 'react-router-dom';
import {RequiredMask} from '~/components/FieldBase/FieldBase';
import {Input} from '~/components/Input/Input';
import Select from '~/components/Select/Select';
import {useOneContext} from '~/context/OneContextProvider';
import useMarketoForm from '~/hooks/useMarketoForm';
import i18n from '~/i18n';
import {useProductPurchaseLayoutContext} from '~/pages/ProductPurchase/components/ProductPurchaseLayout/ProductPurchaseLayout';
import ProductPurchaseShell from '~/pages/ProductPurchase/components/ProductPurchaseShell/ProductPurchaseShell';
import useCommerceRegions from '~/pages/ProductPurchase/hooks/useCommerceRegions';
import commerceSchemas from '~/schema/commerceSchemas';
import ProductPurchaseDXPFree from '~/services/commerce/ProductPurchaseDXPFree';
import FetcherError from '~/services/fetcher/FetcherError';
import {Liferay} from '~/services/liferay/liferay';
import LicenseKeys from '~/services/spring-boot/LicenseKeys';
import phones from '~/utils/phones';
import {productAgreements} from '~/utils/productAgreements';

import './ActivationKeyForm.css';

import type {ActivationKeyFormData} from '~/services/commerce/ProductPurchaseDXPFree';

const DATA_PROTECTION_EMAIL_ADDRESS = 'dataprotection@liferay.com';

const PURPOSE_OPTIONS = [
	{
		subtitle: 'For students or individuals upskilling.',
		title: 'Personal Learning / Education',
		value: 'personal-learning-education',
	},
	{
		subtitle: 'Testing for a specific project at work.',
		title: 'Proof of Concept (POC)',
		value: 'proof-of-concept',
	},
	{
		subtitle: 'Developers building or debugging integrations.',
		title: 'Development & Testing',
		value: 'development-and-testing',
	},
	{
		subtitle: 'For non-production hobbyist tools within a company.',
		title: 'Internal Side Project',
		value: 'internal-side-project',
	},
	{
		subtitle: 'For professional firms or small companies.',
		title: 'Small Business Production Use',
		value: 'small-business-production',
	},
];

const SET_VALUE_OPTIONS = {
	shouldDirty: true,
	shouldValidate: true,
};

const ActivationKeyForm = () => {
	const {
		actions: {previousStep},
		handlePurchase,
		product,
		selectedAccount,
	} = useProductPurchaseLayoutContext();

	const {properties} = useOneContext();

	const [active, setActive] = useState(false);

	const {data: regionsResponse} = useCommerceRegions();

	const {
		formState: {errors, isSubmitting, isValid},
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
			fullName: Liferay.ThemeDisplay.getUserName(),
			intlCode: {code: '+1', flag: 'en-us'},
			jobTitle: '',
			notifyMeAboutProducts: false,
			phoneNumber: '',
			purpose: '',
			termsAndConditions: false,
			userAgreement: false,
		},
		mode: 'all',
		reValidateMode: 'onChange',
		resolver: zodResolver(commerceSchemas.activationKey),
	});

	const countries = regionsResponse?.items ?? [];

	const {triggerSubmit} = useMarketoForm({
		formId: properties.marketoFormIdLiferayProduct,
		submitText: i18n.translate('submit'),
	});

	const {
		intlCode,
		notifyMeAboutProducts,
		purpose,
		termsAndConditions,
		userAgreement,
	} = watch();

	if (!selectedAccount?.id) {
		return <Navigate replace to="/" />;
	}

	const submitMarketoForm = async (formFields: ActivationKeyFormData) => {
		const [firstName, ...lastName] = formFields.fullName.split(' ');

		await triggerSubmit({
			Company: formFields.companyName,
			Country: formFields.country,
			Email: formFields.businessEmailAddress,
			FirstName: firstName,
			Industry__c: 'Software',
			LastName: lastName.join(' '),
			Phone: `${formFields.intlCode?.code} ${formFields.phoneNumber} ${formFields.extension}`,
			Purpose_of_Download__c: PURPOSE_OPTIONS.find(
				(purposeOption) => purposeOption.value === formFields.purpose
			)?.title,
			Share_with_Partners__c: formFields.termsAndConditions,
			Title: formFields.jobTitle,
			temp_boolean_02: formFields.userAgreement,
		});
	};

	const onSubmit = async (formFields: ActivationKeyFormData) => {
		try {
			await LicenseKeys.licenseKeyTypeFreeDomainsCheck({
				domains: formFields.domain,
				owner: formFields.businessEmailAddress,
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

		await submitMarketoForm(formFields);

		await handlePurchase(
			new ProductPurchaseDXPFree(selectedAccount, product, formFields)
		);
	};

	return (
		<ProductPurchaseShell
			className="activation-key-form"
			footerProps={{
				backButtonProps: {
					onClick: () => previousStep(),
				},
				continueButtonProps: {className: 'd-none'},
			}}
			title={i18n.translate('activation-key-creation')}
		>
			<form
				aria-hidden="true"
				className="d-none"
				id={`mktoForm_${properties.marketoFormIdLiferayProduct}`}
			/>

			<p className="mb-6 text-black-50">
				{i18n.translate(
					'to-generate-your-unique-activation-key-file-and-access-the-download-please-complete-your-profile-details-below-tell-us-a-bit-about-your-intended-use-to-help-us-support-your-experience'
				)}
			</p>

			<p className="h4 mb-0">
				{i18n.translate('personal-information-purpose')}
			</p>

			<hr className="mb-5 mt-3" />

			<ClayForm.Group>
				<Input
					{...register('fullName')}
					className="w-100"
					errorMessage={errors.fullName?.message}
					label={i18n.translate('full-name')}
					placeholder={i18n.translate('enter-your-full-name')}
					required
				/>

				<ClayInput.Group>
					<ClayInput.GroupItem>
						<Input
							{...register('businessEmailAddress')}
							className="w-100"
							errorMessage={errors.businessEmailAddress?.message}
							id="businessEmailAddress"
							label={i18n.translate('business-email-address')}
							required
						/>
					</ClayInput.GroupItem>

					<ClayInput.GroupItem>
						<Select
							className="custom-input"
							{...register('country')}
							errors={
								errors as Record<string, {message?: string}>
							}
							label={i18n.translate('country')}
							options={countries.map((country) => ({
								key: country.title_i18n?.en_US,
								name: country.title_i18n?.en_US,
							}))}
							required
						/>
					</ClayInput.GroupItem>
				</ClayInput.Group>

				<ClayInput.Group>
					<ClayInput.GroupItem>
						<Input
							{...register('jobTitle')}
							className="w-100"
							errorMessage={errors.jobTitle?.message}
							id="jobTitle"
							label={i18n.translate('job-title')}
							placeholder={i18n.translate('enter-your-job-title')}
						/>
					</ClayInput.GroupItem>

					<ClayInput.GroupItem>
						<Input
							{...register('companyName')}
							className="w-100"
							errorMessage={errors.companyName?.message}
							id="companyName"
							label={i18n.translate('company-name')}
							placeholder={i18n.translate(
								'enter-your-company-name'
							)}
							required
						/>
					</ClayInput.GroupItem>
				</ClayInput.Group>

				<p className="h4">{i18n.translate('phone')}</p>

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
											symbol={intlCode?.flag as string}
										/>

										{intlCode?.code}
									</div>
								}
							>
								<ClayDropDown.ItemList>
									{phones.map((phone, index) => (
										<ClayDropDown.Item
											key={index}
											onClick={() => {
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
								helpMessage={i18n.translate('phone-number')}
								id="phoneNumber"
								placeholder="___-___-____"
							/>
						</div>

						<div className="col-3 p-0">
							<Input
								{...register('extension')}
								className="text-nowrap w-100"
								helpMessage={i18n.translate('extension')}
								id="extension"
								placeholder={i18n.translate('enter-ext')}
							/>
						</div>
					</div>
				</ClayForm.Group>

				<p className="h4">
					{i18n.translate('purpose')} <RequiredMask />
				</p>

				<ClayDropDown
					active={active}
					alignmentPosition={Align.BottomLeft}
					menuElementAttrs={{className: 'dropdown-menu-purpose'}}
					onActiveChange={setActive}
					trigger={
						<ClayButton
							className="activation-key-form-select-input align-items-center app-type-dropdown custom-input d-flex justify-content-between rounded w-100"
							displayType="secondary"
							onClick={() => setActive(!active)}
						>
							<div className="align-items-center d-flex justify-content-between w-100">
								<span>
									{
										PURPOSE_OPTIONS.find(
											(purposeOption) =>
												purposeOption.value === purpose
										)?.title
									}
								</span>

								<ClayIcon symbol="caret-bottom" />
							</div>
						</ClayButton>
					}
				>
					<ClayDropDown.ItemList className="app-type-list-unstyled">
						{PURPOSE_OPTIONS.map((purposeOption, index) => (
							<ClayDropDown.Item
								className="d-flex flex-column"
								key={index}
								onClick={() => {
									setActive(false);

									setValue(
										'purpose',
										purposeOption.value,
										SET_VALUE_OPTIONS
									);
								}}
							>
								<strong>{purposeOption.title}</strong>

								<span>{purposeOption.subtitle}</span>
							</ClayDropDown.Item>
						))}
					</ClayDropDown.ItemList>
				</ClayDropDown>

				<div className="align-items-center d-flex mt-2">
					<ClayCheckbox
						checked={Boolean(notifyMeAboutProducts)}
						id="notifyMeAboutProducts"
						onChange={(event) =>
							setValue(
								'notifyMeAboutProducts',
								event.target.checked
							)
						}
					/>

					<label
						className="activation-key-form-label-check-box cursor-pointer font-weight-normal ml-2"
						htmlFor="notifyMeAboutProducts"
					>
						{i18n.translate(
							'notify-me-about-products-services-and-events'
						)}
					</label>
				</div>

				<p className="activation-key-form-purpose-helper-text mb-6">
					{i18n.translate(
						'you-can-stop-receiving-marketing-emails-by-clicking-the-unsubscribe-link-in-each-email-or-withdraw-your-consent-at-any-time-by-either-using-opt-out-functionality-accessible-through-the-messages-you-receive-or-via-email-to'
					)}

					<a
						className="ml-1"
						href={`mailto:${DATA_PROTECTION_EMAIL_ADDRESS}`}
					>
						{DATA_PROTECTION_EMAIL_ADDRESS}
					</a>

					{'. '}

					<a
						href={productAgreements.links.privacyPolicy}
						rel="noopener noreferrer"
						target="_blank"
					>
						{i18n.translate('see-the-privacy-policy-for-details')}
					</a>
				</p>

				<p className="h4">
					{i18n.translate('activation-key-server-details')}
				</p>

				<hr className="mb-5 mt-3" />

				<ClayInput.Group>
					<ClayInput.GroupItem>
						<Input
							{...register('domain')}
							className="w-100"
							errorMessage={errors.domain?.message}
							helpMessage={i18n.translate(
								'input-one-domain-name-per-instance'
							)}
							label={i18n.translate('domain')}
							placeholder={i18n.translate('enter-domain-here')}
							required
						/>
					</ClayInput.GroupItem>
				</ClayInput.Group>

				<p className="activation-key-form-agreements-text">
					<span>
						{i18n.translate(
							'your-use-of-liferay-dxp-is-subject-to-these-terms-and-the-liferay-end-user-license-agreement-set-forth-at'
						)}
					</span>

					<a
						className="ml-1"
						href={productAgreements.links.eula}
						rel="noopener noreferrer"
						target="_blank"
					>
						{`${window.location.origin}${productAgreements.links.eula}`}
					</a>

					<span className="ml-1">{productAgreements.agreement}</span>
				</p>

				<div className="d-flex flex-row">
					<ClayCheckbox
						checked={Boolean(termsAndConditions)}
						className="activation-key-form-fail"
						id="terms-and-conditions"
						onChange={(event) =>
							setValue(
								'termsAndConditions',
								event.target.checked,
								SET_VALUE_OPTIONS
							)
						}
						required
					/>

					<label
						className="font-weight-normal px-1"
						htmlFor="terms-and-conditions"
					>
						{i18n.translate(
							'i-have-read-and-agree-to-the-terms-and-conditions-above'
						)}

						<RequiredMask />
					</label>
				</div>

				<div className="d-flex flex-row">
					<ClayCheckbox
						checked={Boolean(userAgreement)}
						id="user-agreement"
						onChange={(event) =>
							setValue(
								'userAgreement',
								event.target.checked,
								SET_VALUE_OPTIONS
							)
						}
						required
					/>

					<label
						className="font-weight-normal px-1"
						htmlFor="user-agreement"
					>
						{i18n.translate('i-have-read-and-agree-to-the')}{' '}
						<a
							href={productAgreements.links.userAgreement}
							onClick={(event) => event.stopPropagation()}
							rel="noopener noreferrer"
							target="_blank"
						>
							{i18n.translate('liferay-end-user-agreement')}
						</a>
						<RequiredMask />
					</label>
				</div>
			</ClayForm.Group>

			<ClayButton
				className="w-100"
				disabled={isSubmitting || !isValid}
				onClick={handleSubmit(onSubmit)}
			>
				<div className="align-items-center d-flex justify-content-center">
					<span>{i18n.translate('get-activation-key')}</span>

					<span className="ml-3">
						{isSubmitting && <ClayLoadingIndicator />}
					</span>
				</div>
			</ClayButton>
		</ProductPurchaseShell>
	);
};

export default ActivationKeyForm;
