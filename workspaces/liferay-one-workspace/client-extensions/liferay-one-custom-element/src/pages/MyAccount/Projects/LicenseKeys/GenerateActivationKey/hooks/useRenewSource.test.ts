/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {useRenewSource} from './useRenewSource';

import type {
	GenerateForm,
	GenerateFormProduct,
} from '~/services/spring-boot/ActivationKeys';

const mocks = vi.hoisted(() => ({
	activationKeys: [] as Record<string, unknown>[],
	isRenewableKey: vi.fn(),
	licenseKeys: [] as Record<string, unknown>[],
	loadingActivationKeys: false,
	loadingLicenseKeys: false,
	useActivationKeyLicenseKeys: vi.fn(),
}));

vi.mock('~/hooks/useProjectActivationKeys', () => ({
	useProjectActivationKeys: () => ({
		activationKeys: mocks.activationKeys,
		loading: mocks.loadingActivationKeys,
	}),
}));

vi.mock('~/hooks/useActivationKeyLicenseKeys', () => ({
	useActivationKeyLicenseKeys: mocks.useActivationKeyLicenseKeys,
}));

vi.mock('~/pages/MyAccount/Projects/utils/isRenewableKey', () => ({
	isRenewableKey: mocks.isRenewableKey,
}));

function licenseKey(overrides: Record<string, unknown>) {
	return {
		active: true,
		description: '',
		entitlementId: 0,
		hostName: 'host',
		ipAddresses: '10.0.0.1',
		macAddresses: 'aa',
		name: '',
		productExternalReferenceCode: 'PRDCT-OTHER',
		productVersion: '',
		...overrides,
	};
}

function generateFormProduct(
	entitlementId: number,
	externalReferenceCode: string
): GenerateFormProduct {
	return {
		developerVersions: [],
		entitlementId,
		externalReferenceCode,
		keyTypes: [],
		label: externalReferenceCode,
		name: externalReferenceCode,
		versions: [],
	};
}

const generateForm: GenerateForm = {
	bundleProducts: [],
	products: [
		generateFormProduct(900, 'PRDCT-PORTAL'),
		generateFormProduct(901, 'PRDCT-DXP'),
	],
};

describe('[HOOK-MYACCOUNT-PROJECTS-LICENSEKEYS-GENERATEACTIVATIONKEY-USERENEWSOURCE] useRenewSource', () => {
	beforeEach(() => {
		mocks.activationKeys = [
			{activationKeyId: 'AK-1', id: 'KEY-1', type: 'production'},
		];
		mocks.isRenewableKey.mockReset();
		mocks.isRenewableKey.mockReturnValue(true);
		mocks.licenseKeys = [];
		mocks.loadingActivationKeys = false;
		mocks.loadingLicenseKeys = false;
		mocks.useActivationKeyLicenseKeys.mockReset();
		mocks.useActivationKeyLicenseKeys.mockImplementation(() => ({
			licenseKeys: mocks.licenseKeys,
			loading: mocks.loadingLicenseKeys,
		}));
	});

	it('collects entitlement IDs and dedupes servers by host name and addresses', () => {
		mocks.licenseKeys = [
			licenseKey({entitlementId: 1, hostName: 'a'}),
			licenseKey({entitlementId: 2, hostName: 'a'}),
			licenseKey({
				entitlementId: 2,
				hostName: 'a',
				ipAddresses: '10.0.0.2',
			}),
			licenseKey({entitlementId: 0, hostName: 'b'}),
		];

		const {result} = renderHook(() =>
			useRenewSource('KEY-1', generateForm)
		);

		expect(result.current.renewSource?.bundleEntitlementIds).toEqual([
			1, 2,
		]);
		expect(result.current.renewSource?.servers).toEqual([
			{hostName: 'a', ipAddresses: '10.0.0.1', macAddresses: 'aa'},
			{hostName: 'a', ipAddresses: '10.0.0.2', macAddresses: 'aa'},
			{hostName: 'b', ipAddresses: '10.0.0.1', macAddresses: 'aa'},
		]);
	});

	it('falls back to the product entitlement when the license key has none', () => {
		mocks.licenseKeys = [
			licenseKey({
				entitlementId: 0,
				productExternalReferenceCode: 'PRDCT-DXP',
			}),
		];

		const {result} = renderHook(() =>
			useRenewSource('KEY-1', generateForm)
		);

		expect(result.current.renewSource?.productExternalReferenceCode).toBe(
			'PRDCT-DXP'
		);
		expect(result.current.renewSource?.subscriptionEntitlementId).toBe(901);
	});

	it('looks up the license keys of the matching activation key', () => {
		renderHook(() => useRenewSource('KEY-1', generateForm));

		expect(mocks.useActivationKeyLicenseKeys).toHaveBeenCalledWith('AK-1');
	});

	it('picks the first product found in the generate form in leading product order', () => {
		mocks.licenseKeys = [
			licenseKey({
				entitlementId: 11,
				productExternalReferenceCode: 'PRDCT-OTHER',
			}),
			licenseKey({
				entitlementId: 12,
				productExternalReferenceCode: 'PRDCT-PORTAL',
			}),
			licenseKey({
				entitlementId: 13,
				productExternalReferenceCode: 'PRDCT-DXP',
			}),
		];

		const {result} = renderHook(() =>
			useRenewSource('KEY-1', generateForm)
		);

		expect(result.current.renewSource?.productExternalReferenceCode).toBe(
			'PRDCT-DXP'
		);
		expect(result.current.renewSource?.subscriptionEntitlementId).toBe(13);
	});

	it('reports loading when either query is loading', () => {
		mocks.loadingLicenseKeys = true;

		const {rerender, result} = renderHook(() =>
			useRenewSource('KEY-1', generateForm)
		);

		expect(result.current.loading).toBe(true);

		mocks.loadingLicenseKeys = false;
		mocks.loadingActivationKeys = true;

		rerender();

		expect(result.current.loading).toBe(true);

		mocks.loadingActivationKeys = false;

		rerender();

		expect(result.current.loading).toBe(false);
	});

	it('returns empty values when no active license key exists', () => {
		mocks.licenseKeys = [licenseKey({active: false, entitlementId: 5})];

		const {result} = renderHook(() =>
			useRenewSource('KEY-1', generateForm)
		);

		expect(result.current.renewSource).toEqual({
			bundleEntitlementIds: [],
			description: '',
			environmentName: '',
			keyType: 'production',
			productExternalReferenceCode: '',
			servers: [],
			subscriptionEntitlementId: 0,
			version: '',
		});
	});

	it('returns undefined when the activation key is missing', () => {
		const {result} = renderHook(() =>
			useRenewSource('KEY-404', generateForm)
		);

		expect(result.current.renewSource).toBeUndefined();
	});

	it('returns undefined when the activation key is not renewable', () => {
		mocks.isRenewableKey.mockReturnValue(false);

		const {result} = renderHook(() =>
			useRenewSource('KEY-1', generateForm)
		);

		expect(result.current.renewSource).toBeUndefined();
	});

	it('returns undefined without an activation key external reference code', () => {
		const {result} = renderHook(() => useRenewSource(null, generateForm));

		expect(result.current.renewSource).toBeUndefined();
		expect(mocks.useActivationKeyLicenseKeys).toHaveBeenCalledWith(
			undefined
		);
	});

	it('takes the description, name and version from the leading key and ignores inactive keys', () => {
		mocks.licenseKeys = [
			licenseKey({
				description: 'Portal description',
				entitlementId: 21,
				name: 'portal-env',
				productExternalReferenceCode: 'PRDCT-PORTAL',
				productVersion: '7.4',
			}),
			licenseKey({
				active: false,
				description: 'Inactive DXP',
				entitlementId: 22,
				name: 'inactive-env',
				productExternalReferenceCode: 'PRDCT-DXP',
				productVersion: '2025.q1',
			}),
		];

		const {result} = renderHook(() =>
			useRenewSource('KEY-1', generateForm)
		);

		expect(result.current.renewSource).toMatchObject({
			bundleEntitlementIds: [21],
			description: 'Portal description',
			environmentName: 'portal-env',
			keyType: 'production',
			productExternalReferenceCode: 'PRDCT-PORTAL',
			subscriptionEntitlementId: 21,
			version: '7.4',
		});
	});
});
