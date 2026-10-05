/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';
import {translate} from '~/i18n';

import {
	buildEmptyServer,
	findMatchingVersion,
	getBundleProducts,
	getComplimentaryPurpose,
	getEnvironmentTypeRank,
	getGenerateButtonLabel,
	getLeadingProductLabel,
	getLeadingProductRank,
	hasAvailableKeyType,
	hasServerInfo,
	isCloudNativeProduct,
	isComplimentaryKeyType,
	isDeveloperKeyType,
	toServerField,
	validateIPAddresses,
	validateMACAddresses,
} from './utils';

import type {
	GenerateForm,
	GenerateFormBundleProduct,
	GenerateFormKeyType,
	GenerateFormProduct,
} from '~/services/spring-boot/ActivationKeys';

function toBundleProduct(externalReferenceCode: string) {
	return {externalReferenceCode} as GenerateFormBundleProduct;
}

function toKeyType(availableCounts: number[]) {
	return {
		subscriptions: availableCounts.map((availableCount) => ({
			availableCount,
		})),
	} as GenerateFormKeyType;
}

function toProduct(externalReferenceCode: string) {
	return {externalReferenceCode} as GenerateFormProduct;
}

describe('[MOD-MYACCOUNT-PROJECTS-LICENSEKEYS-GENERATEACTIVATIONKEY] utils', () => {
	describe('getBundleProducts', () => {
		const generateForm = {
			bundleProducts: [
				toBundleProduct('PRDCT-CLOUD-NATIVE'),
				toBundleProduct('PRDCT-DXP'),
				toBundleProduct('PRDCT-PORTAL'),
				toBundleProduct('PRDCT-SEARCH'),
				toBundleProduct('PRDCT-COMMERCE'),
			],
			products: [toProduct('PRDCT-DXP'), toProduct('PRDCT-PORTAL')],
		} as GenerateForm;

		it('returns the chosen product plus the non leading bundle products', () => {
			expect(
				getBundleProducts(generateForm, 'PRDCT-DXP').map(
					({externalReferenceCode}) => externalReferenceCode
				)
			).toEqual(['PRDCT-DXP', 'PRDCT-SEARCH', 'PRDCT-COMMERCE']);
		});

		it('returns an empty list when the product is unknown', () => {
			expect(getBundleProducts(generateForm, 'PRDCT-UNKNOWN')).toEqual(
				[]
			);
		});
	});

	describe('getComplimentaryPurpose', () => {
		it('uses the trimmed description for the other purpose', () => {
			expect(getComplimentaryPurpose('other', '  Partner demo  ')).toBe(
				'Partner demo'
			);
		});

		it('uses the purpose itself for any other purpose', () => {
			expect(getComplimentaryPurpose('evaluation', 'ignored')).toBe(
				'evaluation'
			);
		});
	});

	describe('validateIPAddresses', () => {
		it('accepts valid lines and ignores blank lines', () => {
			expect(validateIPAddresses('10.0.0.1\n\n  \n192.168.1.20\n')).toBe(
				true
			);
		});

		it('accepts an empty value', () => {
			expect(validateIPAddresses('')).toBe(true);
		});

		it('rejects an invalid line', () => {
			expect(validateIPAddresses('10.0.0.1\nnot an ip')).toBe(
				translate('enter-a-valid-ip-address-on-each-line')
			);
		});

		it('rejects duplicate lines', () => {
			expect(validateIPAddresses('10.0.0.1\n 10.0.0.1 ')).toBe(
				translate('remove-the-duplicate-ip-addresses')
			);
		});
	});

	describe('validateMACAddresses', () => {
		it('accepts valid lines and ignores blank lines', () => {
			expect(
				validateMACAddresses('00:1A:2B:3C:4D:5E\n\n00-1a-2b-3c-4d-5f')
			).toBe(true);
		});

		it('rejects an invalid line', () => {
			expect(validateMACAddresses('00:1A:2B:3C:4D')).toBe(
				translate('enter-a-valid-mac-address-on-each-line')
			);
		});

		it('rejects duplicate lines', () => {
			expect(
				validateMACAddresses('00:1A:2B:3C:4D:5E\n00:1A:2B:3C:4D:5E')
			).toBe(translate('remove-the-duplicate-mac-addresses'));
		});
	});

	describe('servers', () => {
		it('picks the first filled server field', () => {
			expect(
				toServerField({
					hostName: ' ',
					ipAddresses: '10.0.0.1',
					macAddresses: '00:1A:2B:3C:4D:5E',
				})
			).toBe('ipAddresses');
			expect(
				toServerField({
					hostName: '',
					ipAddresses: '',
					macAddresses: '00:1A:2B:3C:4D:5E',
				})
			).toBe('macAddresses');
		});

		it('defaults to hostName when no field is filled', () => {
			expect(toServerField(buildEmptyServer())).toBe('hostName');
		});

		it('requires the field on every server for hasServerInfo', () => {
			const server = {...buildEmptyServer(), hostName: 'node-1'};

			expect(hasServerInfo([server], 'hostName')).toBe(true);
			expect(
				hasServerInfo([server, buildEmptyServer()], 'hostName')
			).toBe(false);
		});
	});

	describe('ranks', () => {
		it('ranks leading products in order and unknown codes last', () => {
			expect(getLeadingProductRank('PRDCT-CLOUD-NATIVE')).toBe(0);
			expect(getLeadingProductRank('PRDCT-DXP')).toBe(1);
			expect(getLeadingProductRank('PRDCT-PORTAL')).toBe(2);
			expect(getLeadingProductRank('PRDCT-SEARCH')).toBe(3);
		});

		it('ranks environment types in order and unknown types last', () => {
			expect(getEnvironmentTypeRank('production')).toBe(0);
			expect(getEnvironmentTypeRank('uat')).toBe(1);
			expect(getEnvironmentTypeRank('non-production')).toBe(2);
			expect(getEnvironmentTypeRank('sandbox')).toBe(3);
		});

		it('labels leading products and leaves others empty', () => {
			expect(getLeadingProductLabel('PRDCT-CLOUD-NATIVE')).toBe(
				'Cloud Native'
			);
			expect(getLeadingProductLabel('PRDCT-SEARCH')).toBe('');
		});
	});

	describe('hasAvailableKeyType', () => {
		it('is true when a subscription has an available count above zero', () => {
			expect(
				hasAvailableKeyType({
					keyTypes: [toKeyType([0]), toKeyType([0, 2])],
				} as GenerateFormProduct)
			).toBe(true);
		});

		it('is false when every subscription is used up', () => {
			expect(
				hasAvailableKeyType({
					keyTypes: [toKeyType([0]), toKeyType([])],
				} as GenerateFormProduct)
			).toBe(false);
		});
	});

	describe('findMatchingVersion', () => {
		it('returns the matching version', () => {
			expect(findMatchingVersion('2025.q1', ['2024.q4', '2025.q1'])).toBe(
				'2025.q1'
			);
		});

		it('returns undefined for an empty or missing version', () => {
			expect(findMatchingVersion('', ['2025.q1'])).toBeUndefined();
			expect(findMatchingVersion('2026.q1', ['2025.q1'])).toBeUndefined();
		});
	});

	describe('key types', () => {
		it('classifies key types and products', () => {
			expect(isCloudNativeProduct('PRDCT-CLOUD-NATIVE')).toBe(true);
			expect(isCloudNativeProduct('PRDCT-DXP')).toBe(false);
			expect(isComplimentaryKeyType('complimentary')).toBe(true);
			expect(isComplimentaryKeyType('production')).toBe(false);
			expect(isDeveloperKeyType('developer-cluster')).toBe(true);
			expect(isDeveloperKeyType('production')).toBe(false);
		});

		it('labels the generate button for renewing', () => {
			expect(getGenerateButtonLabel(true)).toBe('renew-key');
			expect(getGenerateButtonLabel(false)).toBe('generate-key');
		});
	});
});
