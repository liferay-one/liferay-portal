/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayAlert from '@clayui/alert';
import {format} from 'date-fns';
import {useEffect, useMemo, useState} from 'react';
import {useForm} from 'react-hook-form';
import {Navigate, useNavigate, useSearchParams} from 'react-router';
import Loading from '~/components/Loading/Loading';
import ProductPurchase from '~/components/ProductPurchase/ProductPurchase';
import {useProject} from '~/context/ProjectContext';
import useDXPProductVersions from '~/hooks/useDXPProductVersions';
import {Word, translate} from '~/i18n';
import {
	ACTIVATION_ERROR_MESSAGE_KEYS,
	BUNDLE_ERROR_MESSAGE_KEYS,
} from '~/pages/MyAccount/Projects/utils/cloudActivationErrorConstants';
import toErrorMessageKey from '~/pages/MyAccount/Projects/utils/toErrorMessageKey';
import FetcherError from '~/services/fetcher/FetcherError';
import {Liferay} from '~/services/liferay/liferay';
import ActivationKeys from '~/services/spring-boot/ActivationKeys';
import Cloud from '~/services/spring-boot/Cloud';
import LicenseKeys from '~/services/spring-boot/LicenseKeys';
import {scrollToTop} from '~/utils/browserUtils';
import {toISODate} from '~/utils/dateUtils';

import {useHasLicenseKeyPermission} from '../../hooks/useHasActivationPermission';
import ActivationCodesStep from './ActivationCodesStep/ActivationCodesStep';
import AddOnStep from './AddOnStep/AddOnStep';
import ComplimentaryStep from './ComplimentaryStep/ComplimentaryStep';
import DSRStep from './DSRStep/DSRStep';
import EnvironmentStep from './EnvironmentStep/EnvironmentStep';
import OfflinePackageStep from './OfflinePackageStep/OfflinePackageStep';
import OfflineTokenStep from './OfflineTokenStep/OfflineTokenStep';
import SubscriptionStep from './SubscriptionStep/SubscriptionStep';
import useCloudNativeOfflineEnvironments from './hooks/useCloudNativeOfflineEnvironments';
import useGenerateActivationKeyForm from './hooks/useGenerateActivationKeyForm';
import useHasWorkspace from './hooks/useHasWorkspace';
import useRenewSource from './hooks/useRenewSource';
import {
	GenerateActivationKeyForm,
	GenerateActivationKeyOfflineEnvironment,
	GenerateActivationKeyStep,
} from './types';
import {
	CLOUD_NATIVE_PRODUCT_EXTERNAL_REFERENCE_CODE,
	buildEmptyServer,
	findMatchingVersion,
	getBundleProducts,
	getComplimentaryPurpose,
	hasAvailableKeyType,
	isCloudNativeProduct,
	isComplimentaryKeyType,
	isDeveloperKeyType,
	toServerField,
} from './utils';

import './GenerateActivationKey.css';

const GENERATE_ACTIVATION_KEY_WIDTH = 860;

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
			offlineActivated: false,
			offlineEnvironment: null,
			offlineModifying: false,
			offlineSubscriptionIds: [],
			productExternalReferenceCode: '',
			purpose: '',
			purposeDescription: '',
			serverField: 'hostName',
			servers: [buildEmptyServer()],
			startDate: format(new Date(), 'yyyy-MM-dd'),
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
	const developer = isDeveloperKeyType(keyType);
	const productExternalReferenceCode = watch('productExternalReferenceCode');
	const version = watch('version');

	const preselectedExternalReferenceCode = searchParams.get('new');

	const modifyEnvironmentId = searchParams.get('modify');

	const {environments: offlineEnvironments} =
		useCloudNativeOfflineEnvironments(modifyEnvironmentId ? projectId : '');

	const modifyEnvironment = useMemo(
		() =>
			offlineEnvironments.find(
				(current) => current.environmentId === modifyEnvironmentId
			),
		[modifyEnvironmentId, offlineEnvironments]
	);

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
						(developer || bundleProduct.availableCount > 0)
				)
				.map((bundleProduct) => bundleProduct.entitlementId)
		);
	}, [
		complimentary,
		developer,
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
				bundleProduct.disasterRecovery
		);
	}, [bundleEntitlementIds, generateForm, productExternalReferenceCode]);

	const needsDSRStep = includesDSR && !hasWorkspace;

	const cloudNative = isCloudNativeProduct(productExternalReferenceCode);

	const {productVersions} = useDXPProductVersions(cloudNative);

	const versions = useMemo(() => {
		const product = generateForm?.products.find(
			(current) =>
				current.externalReferenceCode === productExternalReferenceCode
		);

		if (developer) {
			return product?.developerVersions ?? [];
		}

		if (cloudNative) {
			return productVersions;
		}

		return product?.versions ?? [];
	}, [
		cloudNative,
		developer,
		generateForm,
		productExternalReferenceCode,
		productVersions,
	]);

	useEffect(() => {
		if (!modifyEnvironment || getValues('offlineModifying')) {
			return;
		}

		setValue('keyType', modifyEnvironment.type);
		setValue('offlineActivated', false);
		setValue('offlineEnvironment', {
			activationCode: '',
			bundledEntitlementIds:
				modifyEnvironment.bundledEntitlementIds ?? [],
			environmentId: modifyEnvironment.environmentId,
			environmentName: modifyEnvironment.environmentName,
			requestedVersion: modifyEnvironment.requestedVersion,
			type: modifyEnvironment.type,
		});
		setValue('offlineModifying', true);
		setValue(
			'productExternalReferenceCode',
			CLOUD_NATIVE_PRODUCT_EXTERNAL_REFERENCE_CODE
		);

		setStep('offline-package');
	}, [getValues, modifyEnvironment, setValue]);

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

	useEffect(() => {
		if (!modifyEnvironment) {
			return;
		}

		const matchingVersion = findMatchingVersion(
			modifyEnvironment.requestedVersion,
			versions
		);

		if (matchingVersion) {
			setValue('version', matchingVersion);
		}
	}, [modifyEnvironment, setValue, versions]);

	function onClickCancel() {
		navigate('..');
	}

	function onClickContinueSubscription() {
		if (complimentary) {
			goTo('complimentary');

			return;
		}

		if (!cloudNative || developer) {
			goTo('add-ons');

			return;
		}

		goTo('activation-codes');
	}

	async function onClickDownloadPackage() {
		const values = getValues();

		const {offlineEnvironment} = values;

		if (!offlineEnvironment) {
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
			let {environmentId} = offlineEnvironment;

			if (!values.offlineModifying && !values.offlineActivated) {
				try {
					environmentId = await Cloud.offlineActivation(
						offlineEnvironment.activationCode,
						values.activationToken.trim()
					);

					setValue('offlineActivated', true);
					setValue('offlineEnvironment', {
						...offlineEnvironment,
						environmentId,
					});
				}
				catch (error) {
					setSubmitError(
						translate(
							toErrorMessageKey(
								error,
								ACTIVATION_ERROR_MESSAGE_KEYS
							)
						)
					);

					return;
				}
			}

			try {
				await Cloud.downloadOfflineActivationBundle(
					values.version,
					environmentId,
					values.offlineSubscriptionIds
				);
			}
			catch (error) {
				setSubmitError(
					translate(
						toErrorMessageKey(error, BUNDLE_ERROR_MESSAGE_KEYS)
					)
				);

				return;
			}

			navigate('..');
		}
		finally {
			setSubmitting(false);
		}
	}

	function onClickOfflineActivation(
		offlineEnvironment: GenerateActivationKeyOfflineEnvironment
	) {
		setSubmitError('');

		setValue('offlineActivated', false);
		setValue('offlineEnvironment', offlineEnvironment);
		setValue('offlineModifying', false);

		goTo('offline-token');
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
				bundleEntitlementIds: values.bundleEntitlementIds,
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

		const startsToday =
			values.startDate === format(new Date(), 'yyyy-MM-dd');

		try {
			({activationKeyId} = await ActivationKeys.generateActivationKey({
				bundleEntitlementIds: values.bundleEntitlementIds,
				dataCenterLocation: values.dataCenterLocation || undefined,
				description: values.description || undefined,
				environmentName: values.environmentName,
				keyType: values.keyType,
				projectExternalReferenceCode: projectId,
				purpose: complimentary
					? getComplimentaryPurpose(
							values.purpose,
							values.purposeDescription
						)
					: undefined,
				renewedActivationKeyExternalReferenceCode:
					renewExternalReferenceCode ?? undefined,
				servers: values.servers,
				startDate:
					complimentary && !startsToday
						? toISODate(values.startDate)
						: undefined,
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
		'complimentary':
			'select-the-subscription-and-key-type-you-would-like-to-generate',
		'dsr': 'fill-out-the-information-required-to-generate-the-activation-key',
		'environment':
			'fill-out-the-information-required-to-generate-the-activation-key',
		'offline-package':
			'select-the-items-you-would-like-to-include-in-the-offline-activation-package',
		'offline-token':
			'paste-the-signed-activation-token-generated-by-your-cloud-native-environment',
		'subscription':
			'select-the-product-and-key-type-you-would-like-to-generate',
	};

	const titles: Partial<Record<GenerateActivationKeyStep, Word>> = {
		'activation-codes': 'activation-codes',
		'offline-package': 'download-offline-activation-package',
		'offline-token': 'download-offline-activation-package',
	};

	return (
		<ProductPurchase width={GENERATE_ACTIVATION_KEY_WIDTH}>
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
				<ProductPurchase.Body className="generate-activation-key-body">
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
							renewing={renewing}
						/>
					)}

					{step === 'add-ons' && (
						<AddOnStep
							developer={developer}
							form={form}
							generateForm={generateForm}
							onClickBack={() => goTo('subscription')}
							onClickCancel={onClickCancel}
							onClickContinue={() =>
								developer
									? onClickDownload()
									: goTo(needsDSRStep ? 'dsr' : 'environment')
							}
							renewing={renewing}
							submitting={submitting}
							versions={versions}
						/>
					)}

					{step === 'complimentary' && (
						<ComplimentaryStep
							form={form}
							onClickBack={() => goTo('subscription')}
							onClickCancel={onClickCancel}
							onClickContinue={() => goTo('environment')}
							versions={versions}
						/>
					)}

					{step === 'activation-codes' && (
						<ActivationCodesStep
							keyType={keyType}
							onClickBack={() => goTo('subscription')}
							onClickCancel={onClickCancel}
							onClickFinish={() => navigate('..')}
							onClickOffline={onClickOfflineActivation}
						/>
					)}

					{step === 'offline-token' && (
						<OfflineTokenStep
							form={form}
							onClickBack={() => goTo('activation-codes')}
							onClickCancel={onClickCancel}
							onClickContinue={() => goTo('offline-package')}
						/>
					)}

					{step === 'offline-package' && (
						<OfflinePackageStep
							form={form}
							onClickBack={() =>
								getValues('offlineModifying')
									? navigate('..')
									: goTo('offline-token')
							}
							onClickCancel={onClickCancel}
							onClickDownload={onClickDownloadPackage}
							submitting={submitting}
							versions={versions}
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
										? 'complimentary'
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
						/>
					)}
				</ProductPurchase.Body>
			</ProductPurchase.Shell>
		</ProductPurchase>
	);
}
