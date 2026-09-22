/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayAlert from '@clayui/alert';
import {useEffect, useMemo, useState} from 'react';
import {useForm} from 'react-hook-form';
import {Navigate, useNavigate, useSearchParams} from 'react-router-dom';
import Loading from '~/components/Loading/Loading';
import ProductPurchase from '~/components/ProductPurchase/ProductPurchase';
import {useProject} from '~/context/ProjectContext';
import {Word, translate} from '~/i18n';
import FetcherError from '~/services/fetcher/FetcherError';
import {Liferay} from '~/services/liferay/liferay';
import LicenseKeys from '~/services/spring-boot/LicenseKeys';
import {scrollToTop} from '~/utils/browserUtils';

import useHasActivationPermission from '../../hooks/useHasActivationPermission';
import AddOnStep from './AddOnStep/AddOnStep';
import DSRStep from './DSRStep/DSRStep';
import EnvironmentStep from './EnvironmentStep/EnvironmentStep';
import SubscriptionStep from './SubscriptionStep/SubscriptionStep';
import useGenerateActivationKeyForm from './hooks/useGenerateActivationKeyForm';
import useHasWorkspace from './hooks/useHasWorkspace';
import useRenewSource from './hooks/useRenewSource';
import {GenerateActivationKeyForm, GenerateActivationKeyStep} from './types';
import {buildEmptyServer} from './utils';

import './GenerateActivationKey.css';

const DSR_PRODUCT_NAME = 'DSR';

export default function GenerateActivationKey() {
	const {projectId} = useProject();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();

	const renewExternalReferenceCode = searchParams.get('renew');

	const {error, generateForm, loading} =
		useGenerateActivationKeyForm(projectId);
	const {hasActivationPermission, loading: permissionLoading} =
		useHasActivationPermission(projectId);
	const {hasWorkspace} = useHasWorkspace(projectId);
	const {loading: renewLoading, renewSource} = useRenewSource(
		renewExternalReferenceCode,
		generateForm
	);

	const renewing = Boolean(renewExternalReferenceCode);

	const [step, setStep] = useState<GenerateActivationKeyStep>('subscription');
	const [submitError, setSubmitError] = useState('');
	const [submitting, setSubmitting] = useState(false);

	const form = useForm<GenerateActivationKeyForm>({
		defaultValues: {
			bundleEntitlementIds: [],
			dataCenterLocation: '',
			description: '',
			environmentName: '',
			keyType: '',
			notify: true,
			productExternalReferenceCode: '',
			servers: [buildEmptyServer()],
			subscriptionEntitlementId: 0,
			version: '',
			workspaceName: '',
			workspaceOwnerEmail: Liferay.ThemeDisplay.getUserEmailAddress(),
		},
	});

	const {getValues, setValue, watch} = form;

	const bundleEntitlementIds = watch('bundleEntitlementIds');
	const productExternalReferenceCode = watch('productExternalReferenceCode');

	const preselectedExternalReferenceCode = searchParams.get('new');

	useEffect(() => {
		if (!generateForm || bundleEntitlementIds.length) {
			return;
		}

		if (renewing) {
			if (renewSource) {
				setValue(
					'bundleEntitlementIds',
					renewSource.bundleEntitlementIds
				);
			}

			return;
		}

		setValue(
			'bundleEntitlementIds',
			generateForm.bundleProducts
				.filter(
					(bundleProduct) =>
						bundleProduct.licensable &&
						bundleProduct.availableCount > 0
				)
				.map((bundleProduct) => bundleProduct.entitlementId)
		);
	}, [
		bundleEntitlementIds.length,
		generateForm,
		renewSource,
		renewing,
		setValue,
	]);

	useEffect(() => {
		if (!renewSource) {
			return;
		}

		setValue('description', renewSource.description);
		setValue('environmentName', renewSource.environmentName);
		setValue('version', renewSource.version);

		if (renewSource.keyType) {
			setValue('keyType', renewSource.keyType);
		}

		if (renewSource.productExternalReferenceCode) {
			setValue(
				'productExternalReferenceCode',
				renewSource.productExternalReferenceCode
			);
		}

		if (renewSource.servers.length) {
			setValue('servers', renewSource.servers);
		}

		if (renewSource.subscriptionEntitlementId) {
			setValue(
				'subscriptionEntitlementId',
				renewSource.subscriptionEntitlementId
			);
		}
	}, [renewSource, setValue]);

	useEffect(() => {
		if (!generateForm || getValues('productExternalReferenceCode')) {
			return;
		}

		const product =
			generateForm.products.find(
				(current) =>
					current.externalReferenceCode ===
					preselectedExternalReferenceCode
			) ?? generateForm.products[0];

		if (product) {
			setValue(
				'productExternalReferenceCode',
				product.externalReferenceCode
			);
		}
	}, [
		generateForm,
		getValues,
		preselectedExternalReferenceCode,
		productExternalReferenceCode,
		setValue,
	]);

	const includesDSR = useMemo(() => {
		if (!generateForm) {
			return false;
		}

		return generateForm.bundleProducts.some(
			(bundleProduct) =>
				bundleEntitlementIds.includes(bundleProduct.entitlementId) &&
				bundleProduct.name.includes(DSR_PRODUCT_NAME)
		);
	}, [bundleEntitlementIds, generateForm]);

	const needsDSRStep = includesDSR && !hasWorkspace;

	function onClickCancel() {
		navigate('..');
	}

	function goTo(nextStep: GenerateActivationKeyStep) {
		scrollToTop();

		setStep(nextStep);
	}

	async function onClickDownload() {
		const values = getValues();

		setSubmitError('');
		setSubmitting(true);

		try {
			await LicenseKeys.downloadDeveloperKey({
				name: `activation-key-developer-${values.version}.xml`,
				productName: getProductName(
					values.productExternalReferenceCode
				),
				projectExternalReferenceCode: projectId,
				version: values.version,
			});

			navigate('..');
		}
		catch (error) {
			setSubmitError(_toSubmitError(error));
		}
		finally {
			setSubmitting(false);
		}
	}

	async function onClickGenerate() {
		const values = getValues();

		setSubmitError('');
		setSubmitting(true);

		try {
			const {licenseKeyIds} = await LicenseKeys.generateLicenseKeys({
				bundleEntitlementIds: values.bundleEntitlementIds,
				dataCenterLocation: values.dataCenterLocation || undefined,
				description: values.description || undefined,
				environmentName: values.environmentName,
				keyType: values.keyType,
				projectExternalReferenceCode: projectId,
				renewedLicenseKeyIds: renewSource?.licenseKeyIds,
				servers: values.servers,
				subscriptionEntitlementId: values.subscriptionEntitlementId,
				version: values.version,
				workspaceName: values.workspaceName || undefined,
				workspaceOwnerEmail: values.workspaceOwnerEmail || undefined,
			});

			if (values.notify) {
				await Promise.all(
					licenseKeyIds.map((licenseKeyId) =>
						LicenseKeys.subscribe(String(licenseKeyId))
					)
				);
			}

			await LicenseKeys.downloadLicenseKeys(
				licenseKeyIds,
				`${values.environmentName}.xml`
			);

			navigate('..');
		}
		catch (error) {
			setSubmitError(_toSubmitError(error));
		}
		finally {
			setSubmitting(false);
		}
	}

	function _toSubmitError(error: unknown) {
		const detail = (error as FetcherError)?.info?.detail;

		return detail || translate('an-unexpected-error-occurred');
	}

	function getProductName(externalReferenceCode: string) {
		const product = generateForm?.products.find(
			(current) => current.externalReferenceCode === externalReferenceCode
		);

		return product?.name ?? '';
	}

	if (loading || permissionLoading || (renewing && renewLoading)) {
		return <Loading />;
	}

	if (!hasActivationPermission) {
		return <Navigate replace to=".." />;
	}

	if (error || !generateForm) {
		return (
			<p className="text-neutral-7">
				{translate('an-unexpected-error-occurred')}
			</p>
		);
	}

	const subtitles: Record<GenerateActivationKeyStep, Word> = {
		'add-ons':
			'select-the-add-ons-you-would-like-to-include-in-the-activation-keys',
		'dsr': 'fill-out-the-information-required-to-generate-the-activation-key',
		'environment':
			'fill-out-the-information-required-to-generate-the-activation-key',
		'subscription':
			'select-the-subscription-and-key-type-you-would-like-to-generate',
	};

	return (
		<ProductPurchase>
			<ProductPurchase.Shell
				className="generate-activation-key"
				subtitle={translate(subtitles[step])}
				title={translate(
					renewing
						? 'renew-activation-keys'
						: 'generate-activation-keys'
				)}
			>
				<ProductPurchase.Body>
					{submitError && (
						<ClayAlert
							className="mb-3"
							displayType="danger"
							role={null}
						>
							{submitError}
						</ClayAlert>
					)}

					{step === 'subscription' && (
						<SubscriptionStep
							form={form}
							generateForm={generateForm}
							onClickCancel={onClickCancel}
							onClickContinue={() => goTo('add-ons')}
							onClickDownload={onClickDownload}
							renewing={renewing}
							submitting={submitting}
							subscriptionHelp="developer-keys-are-not-tied-to-a-subscription-you-can-optionally-select-a-subscription-to-organize-and-track-your-keys"
						/>
					)}

					{step === 'add-ons' && (
						<AddOnStep
							form={form}
							generateForm={generateForm}
							onClickBack={() => goTo('subscription')}
							onClickCancel={onClickCancel}
							onClickContinue={() =>
								goTo(needsDSRStep ? 'dsr' : 'environment')
							}
							renewing={renewing}
						/>
					)}

					{step === 'dsr' && (
						<DSRStep
							form={form}
							onClickBack={() => goTo('add-ons')}
							onClickCancel={onClickCancel}
							onClickContinue={() => goTo('environment')}
						/>
					)}

					{step === 'environment' && (
						<EnvironmentStep
							form={form}
							onClickBack={() =>
								goTo(needsDSRStep ? 'dsr' : 'add-ons')
							}
							onClickCancel={onClickCancel}
							onClickGenerate={onClickGenerate}
							renewing={renewing}
							submitting={submitting}
						/>
					)}
				</ProductPurchase.Body>
			</ProductPurchase.Shell>
		</ProductPurchase>
	);
}
