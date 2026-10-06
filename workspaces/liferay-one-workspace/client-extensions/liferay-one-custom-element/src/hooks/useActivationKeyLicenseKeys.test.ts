/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {
	LICENSE_KEY_PAGE_SIZE,
	getServerSummary,
	toActivationKeyLicenseKey,
	useActivationKeyLicenseKeys,
	useUnaggregatedLicenseKey,
} from './useActivationKeyLicenseKeys';

const {useFetchMock} = vi.hoisted(() => ({useFetchMock: vi.fn()}));

vi.mock('~/hooks/useFetch', () => ({useFetch: useFetchMock}));

describe('[HOOK-USEACTIVATIONKEYLICENSEKEYS] useActivationKeyLicenseKeys', () => {
	beforeEach(() => {
		useFetchMock.mockReset();
		useFetchMock.mockReturnValue({
			data: undefined,
			error: undefined,
			isLoading: false,
			revalidate: vi.fn(),
		});
	});

	describe('getServerSummary', () => {
		it('prefers the host name, then the IP addresses, then the MAC addresses', () => {
			const licenseKey = toActivationKeyLicenseKey({
				active: true,
				ipAddresses: '1.1.1.1,2.2.2.2',
				macAddresses: 'AA-BB-CC-DD-EE-FF',
			});

			expect(
				getServerSummary({...licenseKey, hostName: 'liferay-host'})
			).toBe('liferay-host');
			expect(getServerSummary(licenseKey)).toBe('1.1.1.1,2.2.2.2');
			expect(getServerSummary({...licenseKey, ipAddresses: ''})).toBe(
				'AA-BB-CC-DD-EE-FF'
			);
		});
	});

	describe('toActivationKeyLicenseKey', () => {
		it('defaults missing fields to empty strings, zero, and false', () => {
			expect(toActivationKeyLicenseKey({active: true})).toEqual({
				activationKeyId: 0,
				active: true,
				clusterSize: '',
				complimentary: false,
				dataCenterLocation: '',
				description: '',
				domains: '',
				entitlementId: 0,
				expirationDate: '',
				externalReferenceCode: '',
				hostName: '',
				ipAddresses: '',
				licenseKeyId: '',
				licenseName: '',
				licenseType: '',
				macAddresses: '',
				name: '',
				orderId: '',
				owner: '',
				productExternalReferenceCode: '',
				productName: '',
				productVersion: '',
				sizing: '',
				startDate: '',
				workspaceName: '',
				workspaceOwnerEmail: '',
			});
		});

		it('maps every populated field', () => {
			const licenseKey = toActivationKeyLicenseKey({
				active: false,
				complimentary: true,
				customExpirationDate: '2027-01-01',
				entitlementId: 7,
				externalReferenceCode: 'LK-1',
				id: 42,
				name: 'Key',
				r_activationKeyToLicenseKey_c_activationKeyId: 11,
				r_commerceProductToLicenseKey_CProductERC: 'PRDCT-1',
				startDate: '2026-01-01',
			});

			expect(licenseKey).toMatchObject({
				activationKeyId: 11,
				active: false,
				complimentary: true,
				entitlementId: 7,
				expirationDate: '2027-01-01',
				externalReferenceCode: 'LK-1',
				licenseKeyId: '42',
				name: 'Key',
				productExternalReferenceCode: 'PRDCT-1',
				startDate: '2026-01-01',
			});
		});

		it('prefers maxClusterNodes over maxServers for the cluster size', () => {
			expect(
				toActivationKeyLicenseKey({
					active: true,
					maxClusterNodes: 4,
					maxServers: 9,
				}).clusterSize
			).toBe('4');
		});

		it('falls back to maxServers when maxClusterNodes is absent', () => {
			expect(
				toActivationKeyLicenseKey({active: true, maxServers: 9})
					.clusterSize
			).toBe('9');
		});

		it('returns an empty cluster size when the node count is zero', () => {
			expect(
				toActivationKeyLicenseKey({active: true, maxClusterNodes: 0})
					.clusterSize
			).toBe('');
		});
	});

	describe('useActivationKeyLicenseKeys', () => {
		it('does not fetch without an activation key ID', () => {
			const {result} = renderHook(() => useActivationKeyLicenseKeys());

			expect(useFetchMock.mock.calls[0][0]).toBeNull();
			expect(result.current.licenseKeys).toEqual([]);
		});

		it('fetches license keys filtered by the escaped activation key ID', () => {
			renderHook(() => useActivationKeyLicenseKeys("12'3"));

			expect(useFetchMock).toHaveBeenCalledWith('/o/c/licensekeys', {
				params: {
					filter: "r_activationKeyToLicenseKey_c_activationKeyId eq '12''3'",
					pageSize: LICENSE_KEY_PAGE_SIZE,
				},
			});
		});

		it('maps the fetched items and passes through the fetch state', () => {
			const error = new Error('failed');
			const revalidate = vi.fn();

			useFetchMock.mockReturnValue({
				data: {items: [{active: true, id: 5, maxServers: 2}]},
				error,
				isLoading: true,
				revalidate,
			});

			const {result} = renderHook(() => useActivationKeyLicenseKeys('1'));

			expect(result.current.error).toBe(error);
			expect(result.current.loading).toBe(true);
			expect(result.current.revalidate).toBe(revalidate);
			expect(result.current.licenseKeys).toHaveLength(1);
			expect(result.current.licenseKeys[0]).toMatchObject({
				clusterSize: '2',
				licenseKeyId: '5',
			});
		});
	});

	describe('useUnaggregatedLicenseKey', () => {
		it('does not fetch and returns no license key without an ERC', () => {
			const {result} = renderHook(() => useUnaggregatedLicenseKey());

			expect(useFetchMock.mock.calls[0][0]).toBeNull();
			expect(result.current.licenseKey).toBeUndefined();
		});

		it('fetches the license key by ERC and maps it', () => {
			useFetchMock.mockReturnValue({
				data: {active: true, externalReferenceCode: 'LK-9'},
				error: undefined,
				isLoading: false,
			});

			const {result} = renderHook(() =>
				useUnaggregatedLicenseKey('LK-9')
			);

			expect(useFetchMock.mock.calls[0][0]).toBe(
				'/o/c/licensekeys/by-external-reference-code/LK-9'
			);
			expect(result.current.licenseKey?.externalReferenceCode).toBe(
				'LK-9'
			);
		});
	});
});
