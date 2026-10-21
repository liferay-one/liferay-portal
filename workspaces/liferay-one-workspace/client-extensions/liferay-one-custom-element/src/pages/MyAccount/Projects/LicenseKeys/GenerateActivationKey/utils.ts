/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Word, sub} from '~/i18n';
import {
	GenerateForm,
	GenerateFormBundleProduct,
	GenerateFormKeyType,
	GenerateFormProduct,
	GenerateFormSubscription,
} from '~/services/spring-boot/ActivationKeys';

import type {
	GenerateActivationKeyServer,
	GenerateActivationKeyServerField,
	GenerateActivationKeyStep,
} from './types';

const DEVELOPER_KEY_TYPES = ['developer', 'developer-cluster'];

export const ACTIVATION_STATUS_ACTIVE = 'active';

export const CLOUD_NATIVE_ENVIRONMENT_TYPES = [
	'production',
	'uat',
	'non-production',
];

export const CLOUD_NATIVE_LICENSE_KEY_FAMILY = 'Cloud Native';

export const COMPLIMENTARY_DURATION_DAYS = 30;

export const COMPLIMENTARY_KEY_TYPE = 'complimentary';

export const COMPLIMENTARY_PURPOSE_MAX_LENGTH = 255;

export const COMPLIMENTARY_PURPOSE_OTHER = 'other';

export const FREE_KEY_TYPE = 'free';

const LEADING_LICENSE_KEY_FAMILY_LABELS: Record<string, string> = {
	[CLOUD_NATIVE_LICENSE_KEY_FAMILY]: 'Cloud Native',
	DXP: 'Liferay DXP',
	Portal: 'Liferay Portal',
};

const LEADING_LICENSE_KEY_FAMILIES = Object.keys(
	LEADING_LICENSE_KEY_FAMILY_LABELS
);

export const NON_PRODUCTION_KEY_TYPE = 'non-production';

export const SERVER_FIELDS: GenerateActivationKeyServerField[] = [
	'hostName',
	'ipAddresses',
	'macAddresses',
];

export function buildEmptyServer(): GenerateActivationKeyServer {
	return {hostName: '', ipAddresses: '', macAddresses: ''};
}

export function getBundleProducts(
	developer: boolean,
	generateForm: GenerateForm,
	productExternalReferenceCode: string
): GenerateFormBundleProduct[] {
	const product = generateForm.products.find(
		(current) =>
			current.externalReferenceCode === productExternalReferenceCode
	);

	if (!product) {
		return [];
	}

	return generateForm.bundleProducts.filter(
		(bundleProduct) =>
			(!developer || !bundleProduct.app) &&
			(bundleProduct.externalReferenceCode ===
				product.externalReferenceCode ||
				!LEADING_LICENSE_KEY_FAMILIES.includes(
					bundleProduct.licenseKeyFamily
				))
	);
}

export function getComplimentaryDescription(
	subscription: GenerateFormSubscription
): string {
	return sub(
		'you-can-use-this-option-to-generate-complimentary-activation-keys-that-expire-x-days-after-their-start-date-or-when-the-subscription-ends-if-that-is-earlier',
		[String(getComplimentaryDurationDays(subscription))]
	);
}

export function getComplimentaryDurationDays(
	subscription: GenerateFormSubscription
): number {
	if (subscription.licenseKeyDurationDays > 0) {
		return subscription.licenseKeyDurationDays;
	}

	return COMPLIMENTARY_DURATION_DAYS;
}

export function getComplimentaryExpiration(
	subscription: GenerateFormSubscription
): string {
	return sub(
		'this-key-expires-x-days-after-its-start-date-or-when-the-subscription-ends-if-that-is-earlier',
		[String(getComplimentaryDurationDays(subscription))]
	);
}

export function getComplimentaryPurpose(
	purpose: string,
	purposeDescription: string
): string {
	return purpose === COMPLIMENTARY_PURPOSE_OTHER
		? purposeDescription.trim()
		: purpose;
}

export function getStepAfterSubscription({
	cloudNative,
	complimentary,
	developer,
	unassigned,
}: {
	cloudNative: boolean;
	complimentary: boolean;
	developer: boolean;
	unassigned: boolean;
}): GenerateActivationKeyStep {
	if (complimentary) {
		return 'complimentary';
	}

	if (unassigned) {
		return 'environment';
	}

	if (!cloudNative || developer) {
		return 'add-ons';
	}

	return 'activation-codes';
}

export function getStepBeforeEnvironment({
	complimentary,
	needsDSRStep,
	unassigned,
}: {
	complimentary: boolean;
	needsDSRStep: boolean;
	unassigned: boolean;
}): GenerateActivationKeyStep {
	if (complimentary) {
		return 'complimentary';
	}

	if (unassigned) {
		return 'subscription';
	}

	return needsDSRStep ? 'dsr' : 'add-ons';
}

export function getGenerateButtonLabel(renewing: boolean): Word {
	return renewing ? 'renew-key' : 'generate-key';
}

export function isLicensedForVersion(
	bundleProduct: GenerateFormBundleProduct,
	version: string
): boolean {
	return (
		!bundleProduct.licensedVersions.length ||
		bundleProduct.licensedVersions.includes(version)
	);
}

export function isCloudNativeProduct(product?: GenerateFormProduct): boolean {
	return product?.licenseKeyFamily === CLOUD_NATIVE_LICENSE_KEY_FAMILY;
}

export function isComplimentaryKeyType(keyType: string): boolean {
	return keyType === COMPLIMENTARY_KEY_TYPE;
}

export function isDeveloperKeyType(keyType: string): boolean {
	return DEVELOPER_KEY_TYPES.includes(keyType);
}

export function hasServerInfo(
	servers: GenerateActivationKeyServer[],
	serverField: GenerateActivationKeyServerField
): boolean {
	return servers.every((server) => Boolean(server[serverField].trim()));
}

export function toServerField(
	server: GenerateActivationKeyServer
): GenerateActivationKeyServerField {
	return (
		SERVER_FIELDS.find((serverField) =>
			Boolean(server[serverField].trim())
		) ?? 'hostName'
	);
}

export function toVirtualClusterKeyType(productName: string): string {
	if (productName.endsWith('Non-Production')) {
		return NON_PRODUCTION_KEY_TYPE;
	}

	if (productName.endsWith('Production')) {
		return 'production';
	}

	if (productName.endsWith('Backup')) {
		return 'backup';
	}

	return '';
}

export function getLicenseKeyFamilyLabel(licenseKeyFamily: string): string {
	return LEADING_LICENSE_KEY_FAMILY_LABELS[licenseKeyFamily] ?? '';
}

export function getLicenseKeyFamilyRank(licenseKeyFamily: string): number {
	const index = LEADING_LICENSE_KEY_FAMILIES.indexOf(licenseKeyFamily);

	return index === -1 ? LEADING_LICENSE_KEY_FAMILIES.length : index;
}

export function getLeadingProducts(
	products: GenerateFormProduct[]
): GenerateFormProduct[] {
	let leadingProduct: GenerateFormProduct | undefined;
	let leadingRank = LEADING_LICENSE_KEY_FAMILIES.length;

	for (const product of products) {
		const rank = getLicenseKeyFamilyRank(product.licenseKeyFamily);

		if (rank < leadingRank) {
			leadingProduct = product;
			leadingRank = rank;
		}
	}

	return leadingProduct ? [leadingProduct] : products;
}

export function getSelectableProducts(
	preselectedExternalReferenceCode: string | null | undefined,
	products: GenerateFormProduct[],
	project: boolean
): GenerateFormProduct[] {
	const preselectedProduct = products.find(
		(product) =>
			product.externalReferenceCode === preselectedExternalReferenceCode
	);

	if (preselectedProduct?.app) {
		return [preselectedProduct];
	}

	const nonAppProducts = products.filter((product) => !product.app);

	return project ? getLeadingProducts(nonAppProducts) : nonAppProducts;
}

export function hasAvailableActivations(keyType: GenerateFormKeyType): boolean {
	return keyType.subscriptions.some(
		(subscription) => subscription.availableCount > 0
	);
}

export function hasAvailableKeyType(product: GenerateFormProduct): boolean {
	return product.keyTypes.some(hasAvailableActivations);
}

export function getEnvironmentTypeRank(type: string): number {
	const index = CLOUD_NATIVE_ENVIRONMENT_TYPES.indexOf(type);

	return index === -1 ? CLOUD_NATIVE_ENVIRONMENT_TYPES.length : index;
}

export function findMatchingVersion(
	requestedVersion: string,
	versions: string[]
): string | undefined {
	if (!requestedVersion) {
		return undefined;
	}

	return versions.find((version) => version === requestedVersion);
}
