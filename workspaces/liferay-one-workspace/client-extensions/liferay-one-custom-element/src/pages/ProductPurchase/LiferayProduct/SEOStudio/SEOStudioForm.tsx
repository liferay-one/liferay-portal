/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import ClayDropDown, {Align} from '@clayui/drop-down';
import ClayForm, {ClayCheckbox, ClayInput} from '@clayui/form';
import ClayIcon from '@clayui/icon';
import ClayLoadingIndicator from '@clayui/loading-indicator';
import {zodResolver} from '@hookform/resolvers/zod';
import classNames from 'classnames';
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {Navigate} from 'react-router-dom';

import {RequiredMask} from '~/components/FieldBase/FieldBase';
import {Input} from '~/components/Input/Input';
import ProductPurchase from '~/components/ProductPurchase/ProductPurchase';
import Select from '~/components/Select/Select';
import SearchBuilder from '~/utils/SearchBuilder';
import {OrderTypes} from '~/types/orders';
import useCommerceRegions from '~/pages/ProductPurchase/hooks/useCommerceRegions';
import i18n from '~/i18n';
import {Liferay} from '~/services/liferay/liferay';
import zodSchema, {z} from '~/schema/zodSchema';
import HeadlessCommerceDeliveryOrder from '~/services/headless/HeadlessCommerceDeliveryOrder';
import {productAgreements} from '~/utils/productAgreements';
import phones from '~/utils/phones';
import {useProductPurchaseLayoutContext as useProductPurchaseOutletContext} from '~/pages/ProductPurchase/components/ProductPurchaseLayout/ProductPurchaseLayout';
import {ProductPurchaseSEOStudio} from '~/services/commerce/ProductPurchaseSEOStudio';
import {useAppPurchaseContext} from '~/pages/ProductPurchase/context/AppPurchaseContext';
import {PURPOSE_OPTIONS} from '~/pages/ProductPurchase/LiferayProduct/AIHub/AIHubForm/AIHubForm';
import SEOStudioNotEligible from './SEOStudioNotEligible';

import './SEOStudioForm.css';

import '../LiferayProduct.css';

const setValuesOptions = {
	shouldDirty: true,
	shouldValidate: true,
};

const SEOStudioForm = () => {
	const {handlePurchase, product, selectedAccount} =
		useProductPurchaseOutletContext();

	const {salesforceProject} = useAppPurchaseContext();

	const [active, setActive] = useState(false);
	const [isNotEligible, setIsNotEligible] = useState(false);
	const [loading, setLoading] = useState(false);

	const {
		formState: {errors, isValid},
		handleSubmit,
		register,
		setValue,
		watch,
	} = useForm<z.infer<typeof zodSchema.seoStudioForm>>({
		defaultValues: {
			administratorEmailAddress:
				Liferay.ThemeDisplay.getUserEmailAddress(),
			businessEmailAddress: Liferay.ThemeDisplay.getUserEmailAddress(),
			companyName: '',
			country: '',
			extension: '',
			fullName: Liferay.ThemeDisplay.getUserName(),
			intlCode: {
				code: '+1',
				flag: 'en-us',
			},
			jobTitle: '',
			phoneNumber: '',
			purpose: '',
			seoStudioAccountName: '',
			termsAndConditions: false,
			userAgreement: false,
		},
		mode: 'all',
		reValidateMode: 'onChange',
		resolver: zodResolver(zodSchema.seoStudioForm),
	});

	const watchedValues = watch();

	const {intlCode, purpose, termsAndConditions, userAgreement} =
		watchedValues;

	const {data: regionsResponse} = useCommerceRegions();

	const countries = regionsResponse?.items ?? [];

	const onSubmit = async (form: z.infer<typeof zodSchema.seoStudioForm>) => {
		setLoading(true);

		try {
			const {items: aiHubOrders} =
				await HeadlessCommerceDeliveryOrder.getPlacedOrders(
					Liferay.CommerceContext.commerceChannelId,
					selectedAccount.id,
					new URLSearchParams({
						filter: SearchBuilder.eq(
							'orderTypeExternalReferenceCode',
							OrderTypes.AI_HUB
						),
						pageSize: '1',
					})
				);

			if (!aiHubOrders?.length) {
				setIsNotEligible(true);
				setLoading(false);

				return;
			}

			const productPurchase = new ProductPurchaseSEOStudio(
				selectedAccount,
				product
			);

			productPurchase.setForm({
				...form,
				salesforceProjectId: String(
					salesforceProject?.externalReferenceCode
				),
			});

			await handlePurchase(productPurchase);
		}
		catch (error) {
			console.error(error);
		}

		setLoading(false);
	};

	if (isNotEligible) {
		return <SEOStudioNotEligible />;
	}

	if (!salesforceProject) {
		return <Navigate replace to="/" />;
	}

	return (
		<ProductPurchase.Shell
			className="liferay-seo-studio-form"
			title={i18n.translate('request-access-to-seo-studio-beta' as any)}
		>
			<p className="mb-6 text-black-50">
				{i18n.translate(
					'submit-your-request-to-join-the-beta-program-all-submissions-will-be-reviewed-and-youll-receive-an-email-with-the-outcome' as any
				)}
			</p>

			<p className="h4 mb-0">{i18n.translate('personal-information')}</p>

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

					<ClayInput.GroupItem
						style={{position: 'relative', top: '-2px'}}
					>
						<Select
							className="custom-input"
							{...register('country')}
							label={i18n.translate('country')}
							name="country"
							options={countries.map((country: any) => ({
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
								<ClayDropDown.ItemList items={phones as any}>
									{(item) => {
										const phone = item as any;

										return (
											<ClayDropDown.Item
												onClick={() => {
													setValue(
														'intlCode',
														{
															code: phone.code,
															flag: phone.flag,
														},
														setValuesOptions
													);
												}}
											>
												<ClayIcon
													className="mr-2"
													symbol={phone.flag}
												/>

												{phone.code}
											</ClayDropDown.Item>
										);
									}}
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
								placeholder="___–___–____"
							/>
						</div>

						<div className="col-3 p-0">
							<Input
								{...register('extension')}
								className="text-nowrap w-100"
								helpMessage={`${i18n.translate('extension')} (optional)`}
								id="extension"
								placeholder="Enter +ext"
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
					className="w-100"
					menuElementAttrs={{className: 'dropdown-menu-purpose'}}
					onActiveChange={setActive}
					trigger={
						<ClayButton
							className="align-items-center d-flex justify-content-between liferay-seo-studio-form-select-input rounded-lg w-100"
							displayType="secondary"
							onClick={() => setActive(!active)}
						>
							<div className="align-items-center d-flex justify-content-between w-100">
								<span>
									{
										PURPOSE_OPTIONS.find(
											(item: any) => item.value === purpose
										)?.title
									}
								</span>

								<ClayIcon symbol="caret-bottom" />
							</div>
						</ClayButton>
					}
				>
					<ClayDropDown.ItemList>
						{PURPOSE_OPTIONS.map((option: any, index: number) => (
							<ClayDropDown.Item
								className="d-flex flex-column"
								key={index}
								onClick={() => {
									setActive(false);

									setValue(
										'purpose',
										option.value,
										setValuesOptions
									);
								}}
							>
								<strong>{option.title}</strong>
								<span>{option.subtitle}</span>
							</ClayDropDown.Item>
						))}
					</ClayDropDown.ItemList>
				</ClayDropDown>

				<p className="h4 mt-6">
					{i18n.translate('seo-studio-information' as any)}
				</p>

				<hr className="mb-5 mt-3" />
				<ClayInput.Group>
					<ClayInput.GroupItem>
						<Input
							{...register('seoStudioAccountName')}
							className="w-100"
							errorMessage={errors.seoStudioAccountName?.message}
							id="seoStudioAccountName"
							label={i18n.translate('seo-studio-account-name' as any)}
							placeholder={i18n.translate('account-name')}
							required
						/>
					</ClayInput.GroupItem>

					<ClayInput.GroupItem>
						<Input
							{...register('administratorEmailAddress')}
							className="w-100"
							errorMessage={
								errors.administratorEmailAddress?.message
							}
							helpMessage={i18n.translate(
								'this-is-the-email-address-that-will-receive-the-ai-hub-account-management-invite'
							)}
							id="administratorEmailAddress"
							label={i18n.translate('administration-email')}
							placeholder={i18n.translate('email-address')}
							required
						/>
					</ClayInput.GroupItem>
				</ClayInput.Group>

				<p className="liferay-seo-studio-form-aggreements-text text-justify">
					<span>Please read</span>

					<a
						className="mx-1"
						href={productAgreements.links.seoStudio.agreement}
						target="_blank"
					>
						this agreement
					</a>

					<span>
						carefully before accessing or in any way using the SEO
						Studio beta experience.
					</span>
				</p>

				<div className="d-flex flex-row mb-3 text-justify">
					<ClayCheckbox
						checked={termsAndConditions}
						className="liferay-seo-studio-form-fail"
						id="terms-and-conditions"
						onChange={(event) => {
							setValue(
								'termsAndConditions',
								event.target.checked,
								setValuesOptions
							);
						}}
						required
					/>

					<label
						className={classNames('font-weight-normal px-1', {
							'text-red': isValid && !termsAndConditions,
						})}
						htmlFor="terms-and-conditions"
					>
						I signify my assent to and acceptance of this agreement
						and acknowledge that I have read and I understand the
						terms. If I am an individual acting on behalf of an
						entity, I represent that I have the authority to enter
						into this agreement on behalf of that entity.
						<RequiredMask />
					</label>
				</div>

				<div className="d-flex flex-row text-justify">
					<ClayCheckbox
						checked={userAgreement}
						id="user-agreement"
						onChange={(event) => {
							setValue(
								'userAgreement',
								event.target.checked,
								setValuesOptions
							);
						}}
						required
					/>

					<label
						className={classNames('font-weight-normal px-1', {
							'text-red': isValid && !userAgreement,
						})}
						htmlFor="user-agreement"
					>
						<span>
							{i18n.translate(
								'i-agree-to-the-processing-of-my-personal-data-for-the-purpose-of-evaluating-my-beta-access-request-in-accordance-with'
							)}
							<a
								className="ml-1"
								href={productAgreements.links.privacyPolicy}
								target="_blank"
							>
								{i18n.translate('liferay-s-privacy-policy')}
							</a>
						</span>
						<RequiredMask />
					</label>
				</div>
			</ClayForm.Group>

			<p className="liferay-seo-studio-form-aggreements-text text-justify">
				<span>
					You can stop receiving marketing emails by clicking the
					unsubscribe link in each email or withdraw your consent at
					any time by either using opt-out functionality accessible
					through the messages you receive or via email to
				</span>

				<a className="ml-1" href="mailto:dataprotection@liferay.com">
					dataprotection@liferay.com
				</a>

				<span className="ml-1">See</span>

				<a
					className="ml-1"
					href={productAgreements.links.privacyPolicy}
					target="_blank"
				>
					privacy policy
				</a>

				<span className="ml-1">for details.</span>
			</p>

			<ClayButton
				className="w-100"
				disabled={loading || !isValid}
				onClick={handleSubmit(onSubmit)}
			>
				<div className="align-items-center d-flex justify-content-center">
					<span>{i18n.translate('send-request')}</span>

					<span className="ml-3">
						{loading && <ClayLoadingIndicator />}
					</span>
				</div>
			</ClayButton>
		</ProductPurchase.Shell>
	);
};

export default SEOStudioForm;
