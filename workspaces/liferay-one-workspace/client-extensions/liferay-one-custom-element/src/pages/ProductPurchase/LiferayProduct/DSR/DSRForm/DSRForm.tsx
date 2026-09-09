/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayCheckbox} from '@clayui/form';
import {zodResolver} from '@hookform/resolvers/zod';
import classNames from 'classnames';
import {Controller, useForm} from 'react-hook-form';
import {Navigate} from 'react-router-dom';
import {RequiredMask} from '~/components/FieldBase/FieldBase';
import {Input} from '~/components/Input/Input';
import Loading from '~/components/Loading/Loading';
import Select from '~/components/Select/Select';
import useListTypeDefinition from '~/hooks/useListTypeDefinition';
import i18n from '~/i18n';
import {useProductPurchaseLayoutContext} from '~/pages/ProductPurchase/components/ProductPurchaseLayout/ProductPurchaseLayout';
import ProductPurchaseShell from '~/pages/ProductPurchase/components/ProductPurchaseShell/ProductPurchaseShell';
import adminSchemas from '~/schema/adminSchemas';
import ProductPurchaseDSR, {
	DSRFormData,
} from '~/services/commerce/ProductPurchaseDSR';
import {Liferay} from '~/services/liferay/liferay';

const AC_REGIONS_EXTERNAL_REFERENCE_CODE = 'AC-REGIONS';

const EULA_URL = 'https://www.liferay.com/legal';

const DSRForm = () => {
	const {
		actions: {previousStep},
		handlePurchase,
		product,
		selectedAccount,
		setForm,
	} = useProductPurchaseLayoutContext();

	const {data: acRegions, isLoading} = useListTypeDefinition(
		AC_REGIONS_EXTERNAL_REFERENCE_CODE
	);

	const {
		control,
		formState: {errors, isValid},
		handleSubmit,
		register,
	} = useForm<DSRFormData>({
		defaultValues: {
			acceptTermsAndConditions: false,
			dataCenterLocation: '',
			hostname: '',
			ipAddress: '',
			macAddress: '',
			workspaceName: '',
			workspaceOwnerEmail: Liferay.ThemeDisplay.getUserEmailAddress(),
		},
		mode: 'all',
		resolver: zodResolver(adminSchemas.dsrLicenseKey),
	});

	if (!selectedAccount?.id) {
		return <Navigate replace to="/" />;
	}

	if (isLoading) {
		return (
			<div className="d-flex justify-content-center my-7">
				<Loading />
			</div>
		);
	}

	const onSubmit = async (formFields: DSRFormData) => {
		setForm((currentForm) => ({...currentForm, ...formFields}));

		await handlePurchase(
			new ProductPurchaseDSR(selectedAccount, product, formFields)
		);
	};

	return (
		<ProductPurchaseShell
			footerProps={{
				backButtonProps: {
					onClick: () => previousStep(),
				},
				continueButtonProps: {
					children: i18n.translate('get-digital-sales-room'),
					disabled: !isValid,
					onClick: () => handleSubmit(onSubmit)(),
				},
			}}
			title={i18n.translate('digital-sales-room-setup')}
		>
			<p className="mb-6 text-black-50">
				{i18n.translate(
					'name-the-workspace-your-digital-sales-room-runs-in-and-give-us-the-server-details-we-need-to-issue-its-activation-key'
				)}
			</p>

			<div className="h4">{i18n.translate('environment-details')}</div>

			<hr className="mt-2" />

			<Input
				{...register('workspaceName')}
				errorMessage={errors.workspaceName?.message}
				label={i18n.translate('workspace-name')}
				required
			/>

			<Input
				{...register('workspaceOwnerEmail')}
				errorMessage={errors.workspaceOwnerEmail?.message}
				label={i18n.translate('workspace-owner-email')}
				required
			/>

			<Select
				className="custom-input"
				{...register('dataCenterLocation')}
				boldLabel
				helpText={i18n.translate(
					'select-a-server-to-store-your-data-this-could-have-implications-to-your-organizations-policy-on-user-data-storage'
				)}
				label={i18n.translate('data-center-location')}
				options={(acRegions?.listTypeEntries ?? []).map(
					({externalReferenceCode, name}) => ({
						key: externalReferenceCode,
						name,
					})
				)}
				required
			/>

			<p className="h4 mt-7">
				{i18n.translate('activation-key-server-details')}
			</p>

			<small>
				{i18n.translate(
					'please-complete-at-least-one-of-the-following-fields-to-proceed'
				)}
			</small>

			<hr className="mt-2" />

			<Input
				{...register('hostname')}
				errorMessage={errors.hostname?.message}
				helpMessage={i18n.translate('input-one-host-name-per-instance')}
				label={i18n.translate('host-name')}
				placeholder="HOST-DSR-01"
			/>

			<Input
				{...register('ipAddress')}
				component="textarea"
				errorMessage={errors.ipAddress?.message}
				helpMessage={i18n.translate(
					'add-one-ip-address-per-line-ipv-six-addresses-are-not-supported'
				)}
				label={i18n.translate('ip-addresses')}
				placeholder={'1.1.1.1\n2.2.2.2'}
			/>

			<Input
				{...register('macAddress')}
				component="textarea"
				errorMessage={errors.macAddress?.message}
				helpMessage={i18n.translate('add-one-mac-address-per-line')}
				label={i18n.translate('mac-addresses')}
				placeholder={'XX-XX-XX-XX-XX-XX\nXX-XX-XX-XX-XX-XX'}
			/>

			<p className="mt-4 text-black-50">
				{i18n.translate('liferay-dsr-eula-disclaimer-prefix')}{' '}
				<a href={EULA_URL} rel="noopener noreferrer" target="_blank">
					{i18n.translate('legal-liferay')}
				</a>{' '}
				{i18n.translate('liferay-dsr-eula-disclaimer-suffix')}
			</p>

			<div className="align-items-center d-flex flex-row">
				<Controller
					control={control}
					name="acceptTermsAndConditions"
					render={({field: {onChange, value}}) => (
						<ClayCheckbox
							checked={Boolean(value)}
							id="acceptTermsAndConditions"
							onChange={(event) => onChange(event.target.checked)}
						/>
					)}
				/>

				<label
					className={classNames('mb-1 ml-2', {
						'text-danger': Boolean(errors.acceptTermsAndConditions),
					})}
					htmlFor="acceptTermsAndConditions"
				>
					{i18n.translate(
						'i-have-read-and-agree-to-the-terms-and-conditions-above'
					)}

					<RequiredMask />
				</label>
			</div>
		</ProductPurchaseShell>
	);
};

export default DSRForm;
