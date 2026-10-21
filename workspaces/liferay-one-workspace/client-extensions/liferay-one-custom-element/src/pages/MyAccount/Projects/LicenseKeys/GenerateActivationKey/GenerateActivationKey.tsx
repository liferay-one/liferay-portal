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
import {isUnassignedProject} from '~/pages/MyAccount/Projects/utils/isUnassignedProject';
import toErrorMessageKey from '~/pages/MyAccount/Projects/utils/toErrorMessageKey';
import FetcherError from '~/services/fetcher/FetcherError';
import {Liferay} from '~/services/liferay/liferay';
import ActivationKeys from '~/services/spring-boot/ActivationKeys';
import Cloud from '~/services/spring-boot/Cloud';
import LicenseKeys from '~/services/spring-boot/LicenseKeys';
import {scrollToTop} from '~/utils/browserUtils';
import {toISODate} from '~/utils/dateUtils';

import {useHasLicenseKeyPermission} from '../../hooks/useHasActivationPermission';
import {useActivationKeyScope} from '../hooks/useActivationKeyScope';
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
	GenerateActivationKeyOfflineTokenError,
	GenerateActivationKeyStep,
} from './types';
import {
	CLOUD_NATIVE_LICENSE_KEY_FAMILY,
	buildEmptyServer,
	findMatchingVersion,
	getBundleProducts,
	getComplimentaryPurpose,
	getStepAfterSubscription,
	getStepBeforeEnvironment,
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

	const scope = useActivationKeyScope();
	const unassigned = isUnassignedProject(projectId);

	const renewExternalReferenceCode = unassigned
		? null
		: searchParams.get('renew');

	const preselectedExternalReferenceCode = searchParams.get('new');

	const {error, generateForm, loading} = useGenerateActivationKeyForm(
		scope,
		renewExternalReferenceCode,
		preselectedExternalReferenceCode
	);
	const {
		hasActivationPermission,
		hasGeneratePermission,
		loading: permissionLoading,
	} = useHasLicenseKeyPermission(projectId);
	const {hasWorkspace} = useHasWorkspace(projectId);
	const {loading: renewLoading, renewSource} = useRenewSource(
		renewExternalReferenceCode,
		generateForm
	);

	const renewing = Boolean(renewExternalReferenceCode);

	const [generated, setGenerated] = useState(false);
	const [offlineTokenError, setOfflineTokenError] =
		useState<GenerateActivationKeyOfflineTokenError | null>(null);
	const [step, setStep] = useState<GenerateActivationKeyStep>('subscription');
	const [submitError, setSubmitError] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [validatingOfflineToken, setValidatingOfflineToken] = useState(false);

	const form = useForm<GenerateActivationKeyForm>({
		defaultValues: {
			activationToken: '',
			bundleEntitlementIds: [],
			dataCenterLocation: '',
			description: '',
			environmentName: '',
			keyType: '',
			maxClusterNodes: 0,
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
			virtualCluster: false,
			workspaceName: '',
			workspaceOwnerEmail: Liferay.ThemeDisplay.getUserEmailAddress(),
		},
	});

	const {getValues, setValue, watch} = form;

	const activationToken = watch('activationToken');
	const bundleEntitlementIds = watch('bundleEntitlementIds');
	const keyType = watch('keyType');

	const complimentary = !unassigned && isComplimentaryKeyType(keyType);
	const developer = !unassigned && isDeveloperKeyType(keyType);
	const productExternalReferenceCode = watch('productExternalReferenceCode');
	const subscriptionEntitlementId = watch('subscriptionEntitlementId');
	const version = watch('version');

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
		setOfflineTokenError(null);
	}, [activationToken]);

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
			getBundleProducts(
				developer,
				generateForm,
				productExternalReferenceCode
			)
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

		setValue('maxClusterNodes', renewSource.maxClusterNodes);
		setValue('virtualCluster', renewSource.virtualCluster);

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

		const defaultProduct =
			generateForm.products.find(
				(current) =>
					current.externalReferenceCode ===
					preselectedExternalReferenceCode
			) ??
			generateForm.products.find(hasAvailableKeyType) ??
			generateForm.products[0];

		if (defaultProduct) {
			setValue(
				'productExternalReferenceCode',
				defaultProduct.externalReferenceCode
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
			developer,
			generateForm,
			productExternalReferenceCode
		).some(
			(bundleProduct) =>
				bundleEntitlementIds.includes(bundleProduct.entitlementId) &&
				bundleProduct.disasterRecovery
		);
	}, [
		bundleEntitlementIds,
		developer,
		generateForm,
		productExternalReferenceCode,
	]);

	const needsDSRStep = includesDSR && !hasWorkspace;

	const product = useMemo(
		() =>
			generateForm?.products.find(
				(current) =>
					current.externalReferenceCode ===
					productExternalReferenceCode
			),
		[generateForm, productExternalReferenceCode]
	);

	const virtualClusterAvailable =
		!unassigned &&
		Boolean(
			product?.keyTypes.find((current) => current.key === keyType)
				?.virtualCluster
		);

	const virtualCluster = virtualClusterAvailable && watch('virtualCluster');

	const availableClusterNodes = useMemo(() => {
		const subscription = product?.keyTypes
			.find((current) => current.key === keyType)
			?.subscriptions.find(
				(current) => current.entitlementId === subscriptionEntitlementId
			);

		if (!generateForm || !subscription) {
			return 0;
		}

		return Math.min(
			subscription.availableCount,
			...getBundleProducts(
				developer,
				generateForm,
				productExternalReferenceCode
			)
				.filter((bundleProduct) =>
					bundleEntitlementIds.includes(bundleProduct.entitlementId)
				)
				.map((bundleProduct) => bundleProduct.availableCount)
		);
	}, [
		bundleEntitlementIds,
		developer,
		generateForm,
		keyType,
		product,
		productExternalReferenceCode,
		subscriptionEntitlementId,
	]);

	const cloudNative = isCloudNativeProduct(product);

	const {productVersions} = useDXPProductVersions(cloudNative);

	const versions = useMemo(() => {
		if (developer) {
			return product?.developerVersions ?? [];
		}

		if (cloudNative) {
			return productVersions;
		}

		return product?.versions ?? [];
	}, [cloudNative, developer, product, productVersions]);

	useEffect(() => {
		const cloudNativeProduct = generateForm?.products.find(
			(current) =>
				current.licenseKeyFamily === CLOUD_NATIVE_LICENSE_KEY_FAMILY
		);

		if (
			!cloudNativeProduct ||
			!modifyEnvironment ||
			getValues('offlineModifying')
		) {
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
			cloudNativeProduct.externalReferenceCode
		);

		setStep('offline-package');
	}, [generateForm, getValues, modifyEnvironment, setValue]);

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

	async function onClickContinueOfflineToken() {
		setOfflineTokenError(null);
		setSubmitError('');
		setValidatingOfflineToken(true);

		try {
			await Cloud.postEnvironmentsOfflineActivationTokenValidation(
				getValues('activationToken').trim()
			);

			goTo('offline-package');
		}
		catch (error) {
			if (error instanceof FetcherError && error.status === 410) {
				setOfflineTokenError('expired');
			}
			else if (error instanceof FetcherError && error.status === 400) {
				setOfflineTokenError('invalid');
			}
			else {
				setSubmitError(translate('an-unexpected-error-occurred'));
			}
		}
		finally {
			setValidatingOfflineToken(false);
		}
	}

	function onClickContinueSubscription() {
		goTo(
			getStepAfterSubscription({
				cloudNative,
				complimentary,
				developer,
				unassigned,
			})
		);
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
		if (!scope) {
			return;
		}

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
				maxClusterNodes: virtualCluster
					? values.maxClusterNodes
					: undefined,
				purpose: complimentary
					? getComplimentaryPurpose(
							values.purpose,
							values.purposeDescription
						)
					: undefined,
				renewedActivationKeyExternalReferenceCode:
					renewExternalReferenceCode ?? undefined,
				servers: virtualCluster ? [] : values.servers,
				startDate:
					complimentary && !startsToday
						? toISODate(values.startDate)
						: undefined,
				subscriptionEntitlementId: values.subscriptionEntitlementId,
				version: values.version,
				virtualCluster: virtualCluster || undefined,
				workspaceName: values.workspaceName || undefined,
				workspaceOwnerEmail: values.workspaceOwnerEmail || undefined,
				...scope,
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

	if (
		!hasGeneratePermission ||
		((renewing || modifyEnvironmentId) && !hasActivationPermission)
	) {
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
							generateForm={generateForm}
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
							onClickContinue={onClickContinueOfflineToken}
							tokenError={offlineTokenError}
							validating={validatingOfflineToken}
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
							availableClusterNodes={availableClusterNodes}
							form={form}
							generated={generated}
							onClickBack={() =>
								goTo(
									getStepBeforeEnvironment({
										complimentary,
										needsDSRStep,
										unassigned,
									})
								)
							}
							onClickCancel={onClickCancel}
							onClickDone={() => navigate('..')}
							onClickGenerate={onClickGenerate}
							renewing={renewing}
							submitting={submitting}
							virtualCluster={virtualCluster}
							virtualClusterAvailable={virtualClusterAvailable}
						/>
					)}
				</ProductPurchase.Body>
			</ProductPurchase.Shell>
		</ProductPurchase>
	);
}
