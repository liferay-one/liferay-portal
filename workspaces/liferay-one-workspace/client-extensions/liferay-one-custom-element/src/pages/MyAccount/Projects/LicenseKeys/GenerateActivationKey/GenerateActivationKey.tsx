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
import ActivationKeys from '~/services/spring-boot/ActivationKeys';
import Cloud from '~/services/spring-boot/Cloud';
import LicenseKeys from '~/services/spring-boot/LicenseKeys';
import {scrollToTop} from '~/utils/browserUtils';

import {useHasLicenseKeyPermission} from '../../hooks/useHasActivationPermission';
import ActivationCodesStep from './ActivationCodesStep/ActivationCodesStep';
import AddOnStep from './AddOnStep/AddOnStep';
import DSRStep from './DSRStep/DSRStep';
import EnvironmentStep from './EnvironmentStep/EnvironmentStep';
import NonProductionEnvironmentsStep from './NonProductionEnvironmentsStep/NonProductionEnvironmentsStep';
import OfflinePackageStep from './OfflinePackageStep/OfflinePackageStep';
import OfflineTokenStep from './OfflineTokenStep/OfflineTokenStep';
import SubscriptionStep from './SubscriptionStep/SubscriptionStep';
import useCloudNativeEnvironments from './hooks/useCloudNativeEnvironments';
import useGenerateActivationKeyForm from './hooks/useGenerateActivationKeyForm';
import useHasWorkspace from './hooks/useHasWorkspace';
import useRenewSource from './hooks/useRenewSource';
import {GenerateActivationKeyForm, GenerateActivationKeyStep} from './types';
import {
	NON_PRODUCTION_KEY_TYPE,
	buildEmptyServer,
	getBundleProducts,
	hasAvailableKeyType,
	isCloudNativeProduct,
	isComplimentaryKeyType,
	isDeveloperKeyType,
	toServerField,
} from './utils';

import './GenerateActivationKey.css';

const DSR_PRODUCT_EXTERNAL_REFERENCE_CODE = 'PRDCT-ADDON-DISASTER-RECOVERY';

export default function GenerateActivationKey() {
	const {projectId} = useProject();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();

	const renewExternalReferenceCode = searchParams.get('renew');

	const {error, generateForm, loading} = useGenerateActivationKeyForm(
		projectId,
		renewExternalReferenceCode
	);
	const {hasActivationPermission, loading: permissionLoading} =
		useHasLicenseKeyPermission(projectId);
	const {hasWorkspace} = useHasWorkspace(projectId);
	const {environments: cloudNativeEnvironments} =
		useCloudNativeEnvironments(projectId);
	const {loading: renewLoading, renewSource} = useRenewSource(
		renewExternalReferenceCode,
		generateForm
	);

	const renewing = Boolean(renewExternalReferenceCode);

	const [generated, setGenerated] = useState(false);
	const [step, setStep] = useState<GenerateActivationKeyStep>('subscription');
	const [submitError, setSubmitError] = useState('');
	const [submitting, setSubmitting] = useState(false);

	const form = useForm<GenerateActivationKeyForm>({
		defaultValues: {
			activationToken: '',
			bundleEntitlementIds: [],
			dataCenterLocation: '',
			description: '',
			environmentName: '',
			keyType: '',
			notify: true,
			offlineSubscriptionIds: [],
			productExternalReferenceCode: '',
			serverField: 'hostName',
			servers: [buildEmptyServer()],
			subscriptionEntitlementId: 0,
			version: '',
			workspaceName: '',
			workspaceOwnerEmail: Liferay.ThemeDisplay.getUserEmailAddress(),
		},
	});

	const {getValues, setValue, watch} = form;

	const bundleEntitlementIds = watch('bundleEntitlementIds');
	const keyType = watch('keyType');

	const complimentary = isComplimentaryKeyType(keyType);
	const productExternalReferenceCode = watch('productExternalReferenceCode');
	const version = watch('version');

	const preselectedExternalReferenceCode = searchParams.get('new');

	useEffect(() => {
		if (!generateForm || !renewing || bundleEntitlementIds.length) {
			return;
		}

		if (renewSource) {
			setValue('bundleEntitlementIds', renewSource.bundleEntitlementIds);
		}
	}, [
		bundleEntitlementIds.length,
		generateForm,
		renewSource,
		renewing,
		setValue,
	]);

	useEffect(() => {
		if (!generateForm || renewing || !productExternalReferenceCode) {
			return;
		}

		if (complimentary) {
			setValue('bundleEntitlementIds', []);

			return;
		}

		setValue(
			'bundleEntitlementIds',
			getBundleProducts(generateForm, productExternalReferenceCode)
				.filter(
					(bundleProduct) =>
						bundleProduct.licensable &&
						bundleProduct.availableCount > 0
				)
				.map((bundleProduct) => bundleProduct.entitlementId)
		);
	}, [
		complimentary,
		generateForm,
		productExternalReferenceCode,
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
			const [server] = renewSource.servers;

			setValue('serverField', toServerField(server));
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
			) ??
			generateForm.products.find(hasAvailableKeyType) ??
			generateForm.products[0];

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

		return getBundleProducts(
			generateForm,
			productExternalReferenceCode
		).some(
			(bundleProduct) =>
				bundleEntitlementIds.includes(bundleProduct.entitlementId) &&
				bundleProduct.externalReferenceCode ===
					DSR_PRODUCT_EXTERNAL_REFERENCE_CODE
		);
	}, [bundleEntitlementIds, generateForm, productExternalReferenceCode]);

	const needsDSRStep = includesDSR && !hasWorkspace;

	const versions = useMemo(() => {
		const product = generateForm?.products.find(
			(current) =>
				current.externalReferenceCode === productExternalReferenceCode
		);

		if (!product) {
			return [];
		}

		if (isDeveloperKeyType(keyType)) {
			return product.developerVersions;
		}

		return product.versions;
	}, [generateForm, keyType, productExternalReferenceCode]);

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

	const cloudNative = isCloudNativeProduct(productExternalReferenceCode);

	function onClickCancel() {
		navigate('..');
	}

	function onClickContinueSubscription() {
		if (complimentary) {
			goTo('environment');

			return;
		}

		if (!cloudNative) {
			goTo('add-ons');

			return;
		}

		goTo(
			keyType === NON_PRODUCTION_KEY_TYPE
				? 'non-production-environments'
				: 'activation-codes'
		);
	}

	async function onClickDownloadPackage() {
		const values = getValues();

		const environment = cloudNativeEnvironments.find(
			(current) => current.type === values.keyType
		);

		if (!environment) {
			setSubmitError(
				translate(
					'no-cloud-native-environments-are-available-for-this-project'
				)
			);

			return;
		}

		setSubmitError('');
		setSubmitting(true);

		try {
			await Cloud.offlineActivation(
				environment.activationCode,
				values.activationToken.trim()
			);

			await Cloud.downloadOfflineActivationBundle(
				values.version,
				environment.id,
				values.offlineSubscriptionIds
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
				keyType: values.keyType,
				name: `activation-key-${values.keyType}-${values.version}.xml`,
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

		let activationKeyId;

		try {
			({activationKeyId} = await ActivationKeys.generateActivationKey({
				bundleEntitlementIds: values.bundleEntitlementIds,
				dataCenterLocation: values.dataCenterLocation || undefined,
				description: values.description || undefined,
				environmentName: values.environmentName,
				keyType: values.keyType,
				projectExternalReferenceCode: projectId,
				renewedActivationKeyExternalReferenceCode:
					renewExternalReferenceCode ?? undefined,
				servers: values.servers,
				subscriptionEntitlementId: values.subscriptionEntitlementId,
				version: values.version,
				workspaceName: values.workspaceName || undefined,
				workspaceOwnerEmail: values.workspaceOwnerEmail || undefined,
			}));
		}
		catch (error) {
			setSubmitError(_toSubmitError(error));
			setSubmitting(false);

			return;
		}

		setGenerated(true);

		try {
			if (values.notify) {
				await ActivationKeys.subscribe(String(activationKeyId));
			}

			await ActivationKeys.downloadActivationKey(
				String(activationKeyId),
				`${values.environmentName}.xml`
			);

			navigate('..');
		}
		catch (error) {
			setSubmitError(
				translate(
					'the-activation-key-was-generated-but-could-not-be-downloaded-download-it-from-the-list'
				)
			);
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

	if (renewing && !renewSource) {
		return (
			<p className="text-neutral-7">
				{translate('this-activation-key-cannot-be-renewed')}
			</p>
		);
	}

	const subtitles: Record<GenerateActivationKeyStep, Word> = {
		'activation-codes':
			'please-copy-and-paste-the-activation-code-for-the-environment-type-you-would-like-to-activate-into-your-server',
		'add-ons':
			'select-the-items-you-would-like-to-include-in-the-activation-key',
		'dsr': 'fill-out-the-information-required-to-generate-the-activation-key',
		'environment':
			'fill-out-the-information-required-to-generate-the-activation-key',
		'non-production-environments':
			'modify-your-existing-non-production-environment-or-activate-a-new-non-production-environment',
		'offline-package':
			'select-the-product-and-key-type-you-would-like-to-generate',
		'offline-token':
			'select-the-product-and-key-type-you-would-like-to-generate',
		'subscription':
			'select-the-product-and-key-type-you-would-like-to-generate',
	};

	const titles: Partial<Record<GenerateActivationKeyStep, Word>> = {
		'activation-codes': 'activation-codes',
		'non-production-environments': 'non-production-environments',
		'offline-package': 'download-offline-activation-package',
		'offline-token': 'download-offline-activation-package',
	};

	return (
		<ProductPurchase>
			<ProductPurchase.Shell
				className="generate-activation-key"
				subtitle={translate(subtitles[step])}
				title={translate(
					titles[step] ??
						(renewing
							? 'renew-activation-key'
							: 'generate-activation-key')
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
							contractTermHelp="you-can-use-this-option-to-generate-activation-keys-with-a-selected-contract-term"
							form={form}
							generateForm={generateForm}
							onClickCancel={onClickCancel}
							onClickContinue={onClickContinueSubscription}
							onClickDownload={onClickDownload}
							renewing={renewing}
							submitting={submitting}
							versions={versions}
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

					{step === 'activation-codes' && (
						<ActivationCodesStep
							onClickBack={() => goTo('subscription')}
							onClickCancel={onClickCancel}
							onClickFinish={() => navigate('..')}
							onClickOffline={() => goTo('offline-token')}
						/>
					)}

					{step === 'non-production-environments' && (
						<NonProductionEnvironmentsStep
							onClickActivate={() => goTo('offline-token')}
							onClickBack={() => goTo('subscription')}
							onClickCancel={onClickCancel}
						/>
					)}

					{step === 'offline-token' && (
						<OfflineTokenStep
							form={form}
							onClickBack={() =>
								goTo(
									keyType === NON_PRODUCTION_KEY_TYPE
										? 'non-production-environments'
										: 'activation-codes'
								)
							}
							onClickCancel={onClickCancel}
							onClickContinue={() => goTo('offline-package')}
						/>
					)}

					{step === 'offline-package' && (
						<OfflinePackageStep
							bundleProducts={generateForm.bundleProducts}
							form={form}
							onClickBack={() => goTo('offline-token')}
							onClickCancel={onClickCancel}
							onClickDownload={onClickDownloadPackage}
							submitting={submitting}
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
							generated={generated}
							onClickBack={() =>
								goTo(
									complimentary
										? 'subscription'
										: needsDSRStep
											? 'dsr'
											: 'add-ons'
								)
							}
							onClickCancel={onClickCancel}
							onClickDone={() => navigate('..')}
							onClickGenerate={onClickGenerate}
							renewing={renewing}
							submitting={submitting}
							versions={versions}
						/>
					)}
				</ProductPurchase.Body>
			</ProductPurchase.Shell>
		</ProductPurchase>
	);
}
