/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Word} from '~/i18n';
import {
	GenerateForm,
	GenerateFormBundleProduct,
	GenerateFormKeyType,
	GenerateFormProduct,
} from '~/services/spring-boot/ActivationKeys';

import type {
	GenerateActivationKeyServer,
	GenerateActivationKeyServerField,
} from './types';

const DEVELOPER_KEY_TYPES = ['developer', 'developer-cluster'];

export const CLOUD_NATIVE_PRODUCT_EXTERNAL_REFERENCE_CODE =
	'PRDCT-CLOUD-NATIVE';

export const COMPLIMENTARY_DURATION_DAYS = 30;

export const COMPLIMENTARY_KEY_TYPE = 'complimentary';

export const FREE_KEY_TYPE = 'free';

export const LEADING_PRODUCT_EXTERNAL_REFERENCE_CODES = [
	CLOUD_NATIVE_PRODUCT_EXTERNAL_REFERENCE_CODE,
	'PRDCT-DXP',
	'PRDCT-PORTAL',
];

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
			!bundleProduct.licenseEntryFamily ||
			bundleProduct.licenseEntryFamily === product.label
	);
}

export function getGenerateButtonLabel(renewing: boolean): Word {
	return renewing ? 'renew-key' : 'generate-key';
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

export function toServerField(
	server: GenerateActivationKeyServer
): GenerateActivationKeyServerField {
	return (
		SERVER_FIELDS.find((serverField) =>
			Boolean(server[serverField].trim())
		) ?? 'hostName'
	);
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

export function isGeneratable(generateForm?: GenerateForm): boolean {
	return Boolean(generateForm?.products.some(hasAvailableKeyType));
}
