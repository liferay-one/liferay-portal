/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';
import {sub} from '~/i18n';

import {
	buildEmptyServer,
	findMatchingVersion,
	getBundleProducts,
	getComplimentaryDescription,
	getComplimentaryDurationDays,
	getComplimentaryExpiration,
	getComplimentaryPurpose,
	getEnvironmentTypeRank,
	getGenerateButtonLabel,
	getLicenseKeyFamilyLabel,
	getLicenseKeyFamilyRank,
	getStepAfterSubscription,
	getStepBeforeEnvironment,
	hasAvailableKeyType,
	hasServerInfo,
	isCloudNativeProduct,
	isComplimentaryKeyType,
	isDeveloperKeyType,
	isLicensedForVersion,
	toServerField,
} from './utils';

import type {
	GenerateForm,
	GenerateFormBundleProduct,
	GenerateFormKeyType,
	GenerateFormProduct,
	GenerateFormSubscription,
} from '~/services/spring-boot/ActivationKeys';

function toBundleProduct(
	app: boolean,
	externalReferenceCode: string,
	licenseKeyFamily = ''
) {
	return {
		app,
		externalReferenceCode,
		licenseKeyFamily,
	} as GenerateFormBundleProduct;
}

function toKeyType(availableCounts: number[]) {
	return {
		subscriptions: availableCounts.map((availableCount) => ({
			availableCount,
		})),
	} as GenerateFormKeyType;
}

function toProduct(externalReferenceCode: string, licenseKeyFamily = '') {
	return {externalReferenceCode, licenseKeyFamily} as GenerateFormProduct;
}

describe('[MOD-MYACCOUNT-PROJECTS-LICENSEKEYS-GENERATEACTIVATIONKEY] utils', () => {
	describe('getBundleProducts', () => {
		const generateForm = {
			bundleProducts: [
				toBundleProduct(false, 'marketplace-product-1', 'Cloud Native'),
				toBundleProduct(false, 'marketplace-product-2', 'DXP'),
				toBundleProduct(false, 'marketplace-product-3', 'Portal'),
				toBundleProduct(false, 'PRDCT-SEARCH'),
				toBundleProduct(false, 'PRDCT-COMMERCE', 'CMP'),
				toBundleProduct(true, 'PRDCT-TEST-APP'),
			],
			products: [
				toProduct('marketplace-product-2', 'DXP'),
				toProduct('marketplace-product-3', 'Portal'),
			],
		} as GenerateForm;

		it('returns the chosen product plus the non leading bundle products', () => {
			expect(
				getBundleProducts(
					false,
					generateForm,
					'marketplace-product-2'
				).map(({externalReferenceCode}) => externalReferenceCode)
			).toEqual([
				'marketplace-product-2',
				'PRDCT-SEARCH',
				'PRDCT-COMMERCE',
				'PRDCT-TEST-APP',
			]);
		});

		it('leaves out the Marketplace apps for a developer key', () => {
			expect(
				getBundleProducts(
					true,
					generateForm,
					'marketplace-product-2'
				).map(({externalReferenceCode}) => externalReferenceCode)
			).toEqual([
				'marketplace-product-2',
				'PRDCT-SEARCH',
				'PRDCT-COMMERCE',
			]);
		});

		it('returns an empty list when the product is unknown', () => {
			expect(
				getBundleProducts(false, generateForm, 'PRDCT-UNKNOWN')
			).toEqual([]);
		});
	});

	describe('getComplimentaryDescription', () => {
		it('states the duration of the definition in days', () => {
			expect(
				getComplimentaryDescription({
					licenseKeyDurationDays: 45,
				} as GenerateFormSubscription)
			).toBe(
				sub(
					'you-can-use-this-option-to-generate-complimentary-activation-keys-that-expire-x-days-after-their-start-date-or-when-the-subscription-ends-if-that-is-earlier',
					['45']
				)
			);
		});

		it('states 30 days when the definition has no duration', () => {
			expect(
				getComplimentaryDescription({
					licenseKeyDurationDays: 0,
				} as GenerateFormSubscription)
			).toBe(
				sub(
					'you-can-use-this-option-to-generate-complimentary-activation-keys-that-expire-x-days-after-their-start-date-or-when-the-subscription-ends-if-that-is-earlier',
					['30']
				)
			);
		});
	});

	describe('getComplimentaryDurationDays', () => {
		it('uses the duration of the definition', () => {
			expect(
				getComplimentaryDurationDays({
					licenseKeyDurationDays: 45,
				} as GenerateFormSubscription)
			).toBe(45);
		});

		it('falls back to 30 days when the definition has no duration', () => {
			expect(
				getComplimentaryDurationDays({
					licenseKeyDurationDays: 0,
				} as GenerateFormSubscription)
			).toBe(30);
		});
	});

	describe('getComplimentaryExpiration', () => {
		it('renders the English alert counted from the start date', () => {
			expect(
				getComplimentaryExpiration({
					licenseKeyDurationDays: 30,
				} as GenerateFormSubscription)
			).toBe(
				'This key expires 30 days after its start date, or when the subscription ends if that is earlier.'
			);
		});

		it('states the duration of the definition in days', () => {
			expect(
				getComplimentaryExpiration({
					licenseKeyDurationDays: 45,
				} as GenerateFormSubscription)
			).toBe(
				sub(
					'this-key-expires-x-days-after-its-start-date-or-when-the-subscription-ends-if-that-is-earlier',
					['45']
				)
			);
		});

		it('states 30 days when the definition has no duration', () => {
			expect(
				getComplimentaryExpiration({
					licenseKeyDurationDays: 0,
				} as GenerateFormSubscription)
			).toBe(
				sub(
					'this-key-expires-x-days-after-its-start-date-or-when-the-subscription-ends-if-that-is-earlier',
					['30']
				)
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
		it('ranks leading license key families in order and others last', () => {
			expect(getLicenseKeyFamilyRank('Cloud Native')).toBe(0);
			expect(getLicenseKeyFamilyRank('DXP')).toBe(1);
			expect(getLicenseKeyFamilyRank('Portal')).toBe(2);
			expect(getLicenseKeyFamilyRank('CMP')).toBe(3);
			expect(getLicenseKeyFamilyRank('')).toBe(3);
		});

		it('ranks environment types in order and unknown types last', () => {
			expect(getEnvironmentTypeRank('production')).toBe(0);
			expect(getEnvironmentTypeRank('uat')).toBe(1);
			expect(getEnvironmentTypeRank('non-production')).toBe(2);
			expect(getEnvironmentTypeRank('sandbox')).toBe(3);
		});

		it('labels leading license key families and leaves others empty', () => {
			expect(getLicenseKeyFamilyLabel('Cloud Native')).toBe(
				'Cloud Native'
			);
			expect(getLicenseKeyFamilyLabel('DXP')).toBe('Liferay DXP');
			expect(getLicenseKeyFamilyLabel('Portal')).toBe('Liferay Portal');
			expect(getLicenseKeyFamilyLabel('CMP')).toBe('');
		});
	});

	describe('isLicensedForVersion', () => {
		const bundleProduct = {
			app: false,
			availableCount: 1,
			disasterRecovery: false,
			entitlementId: 1,
			externalReferenceCode: 'PRDCT-SEARCH',
			licensable: true,
			licenseKeyFamily: 'Search',
			licensedVersions: ['DXP 2026.Q1'],
			name: 'Search',
		};

		it('accepts only the licensed versions when the product lists any', () => {
			expect(isLicensedForVersion(bundleProduct, 'DXP 2026.Q1')).toBe(
				true
			);
			expect(isLicensedForVersion(bundleProduct, 'DXP 7.4')).toBe(false);
		});

		it('accepts every version when the product lists none', () => {
			expect(
				isLicensedForVersion(
					{...bundleProduct, licensedVersions: []},
					'DXP 7.4'
				)
			).toBe(true);
		});
	});

	describe('steps', () => {
		const route = {
			cloudNative: false,
			complimentary: false,
			developer: false,
			unassigned: false,
		};

		it('goes from the subscription to the add ons of a project key', () => {
			expect(getStepAfterSubscription(route)).toBe('add-ons');
			expect(
				getStepAfterSubscription({...route, cloudNative: true})
			).toBe('activation-codes');
			expect(
				getStepAfterSubscription({...route, complimentary: true})
			).toBe('complimentary');
		});

		it('goes from the subscription straight to the environment of an app key', () => {
			expect(getStepAfterSubscription({...route, unassigned: true})).toBe(
				'environment'
			);
			expect(
				getStepBeforeEnvironment({
					complimentary: false,
					needsDSRStep: false,
					unassigned: true,
				})
			).toBe('subscription');
		});

		it('goes back from the environment to the step before it', () => {
			expect(
				getStepBeforeEnvironment({
					complimentary: false,
					needsDSRStep: false,
					unassigned: false,
				})
			).toBe('add-ons');
			expect(
				getStepBeforeEnvironment({
					complimentary: false,
					needsDSRStep: true,
					unassigned: false,
				})
			).toBe('dsr');
			expect(
				getStepBeforeEnvironment({
					complimentary: true,
					needsDSRStep: false,
					unassigned: false,
				})
			).toBe('complimentary');
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
			expect(
				isCloudNativeProduct(
					toProduct('marketplace-product-1', 'Cloud Native')
				)
			).toBe(true);
			expect(
				isCloudNativeProduct(toProduct('PRDCT-CLOUD-NATIVE', 'DXP'))
			).toBe(false);
			expect(isCloudNativeProduct(undefined)).toBe(false);
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
