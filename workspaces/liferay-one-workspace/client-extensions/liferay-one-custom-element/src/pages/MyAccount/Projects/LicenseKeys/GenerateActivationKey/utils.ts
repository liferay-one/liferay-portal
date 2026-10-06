/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Word, translate} from '~/i18n';
import {
	GenerateForm,
	GenerateFormBundleProduct,
	GenerateFormKeyType,
	GenerateFormProduct,
} from '~/services/spring-boot/ActivationKeys';
import {ipv4Regex, macAddressRegex} from '~/utils/schemaUtils';

import type {
	GenerateActivationKeyServer,
	GenerateActivationKeyServerField,
} from './types';

const DEVELOPER_KEY_TYPES = ['developer', 'developer-cluster'];

export const ACTIVATION_STATUS_ACTIVE = 'active';

export const CLOUD_NATIVE_ENVIRONMENT_TYPES = [
	'production',
	'uat',
	'non-production',
];

export const CLOUD_NATIVE_PRODUCT_EXTERNAL_REFERENCE_CODE =
	'PRDCT-CLOUD-NATIVE';

export const COMPLIMENTARY_DURATION_DAYS = 30;

export const COMPLIMENTARY_KEY_TYPE = 'complimentary';

export const COMPLIMENTARY_PURPOSE_MAX_LENGTH = 255;

export const COMPLIMENTARY_PURPOSE_OTHER = 'other';

export const FREE_KEY_TYPE = 'free';

export const LEADING_PRODUCT_EXTERNAL_REFERENCE_CODES = [
	CLOUD_NATIVE_PRODUCT_EXTERNAL_REFERENCE_CODE,
	'PRDCT-DXP',
	'PRDCT-PORTAL',
];

const LEADING_PRODUCT_LABELS: Record<string, string> = {
	[CLOUD_NATIVE_PRODUCT_EXTERNAL_REFERENCE_CODE]: 'Cloud Native',
	'PRDCT-DXP': 'Liferay DXP',
	'PRDCT-PORTAL': 'Liferay Portal',
};

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
			bundleProduct.externalReferenceCode ===
				product.externalReferenceCode ||
			!LEADING_PRODUCT_EXTERNAL_REFERENCE_CODES.includes(
				bundleProduct.externalReferenceCode
			)
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

export function isCloudNativeProduct(externalReferenceCode: string): boolean {
	return (
		externalReferenceCode === CLOUD_NATIVE_PRODUCT_EXTERNAL_REFERENCE_CODE
	);
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

function toAddresses(value: string): string[] {
	return value
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
}

function validateAddresses(
	value: string,
	regex: RegExp,
	invalidWord: Word,
	duplicateWord: Word
): string | true {
	const addresses = toAddresses(value);

	if (!addresses.every((address) => regex.test(address))) {
		return translate(invalidWord);
	}

	if (new Set(addresses).size !== addresses.length) {
		return translate(duplicateWord);
	}

	return true;
}

export function validateIPAddresses(value: string): string | true {
	return validateAddresses(
		value,
		ipv4Regex,
		'enter-a-valid-ip-address-on-each-line',
		'remove-the-duplicate-ip-addresses'
	);
}

export function validateMACAddresses(value: string): string | true {
	return validateAddresses(
		value,
		macAddressRegex,
		'enter-a-valid-mac-address-on-each-line',
		'remove-the-duplicate-mac-addresses'
	);
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

export function getLeadingProductLabel(externalReferenceCode: string): string {
	return LEADING_PRODUCT_LABELS[externalReferenceCode] ?? '';
}

export function getLeadingProductRank(externalReferenceCode: string): number {
	const index = LEADING_PRODUCT_EXTERNAL_REFERENCE_CODES.indexOf(
		externalReferenceCode
	);

	return index === -1
		? LEADING_PRODUCT_EXTERNAL_REFERENCE_CODES.length
		: index;
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
