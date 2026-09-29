/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {useActivationKeyLicenseKeys} from '~/hooks/useActivationKeyLicenseKeys';
import {useProjectActivationKeys} from '~/hooks/useProjectActivationKeys';
import {isRenewableKey} from '~/pages/MyAccount/Projects/utils/isRenewableKey';
import {
	GenerateForm,
	GenerateFormProduct,
} from '~/services/spring-boot/ActivationKeys';

import {GenerateActivationKeyServer} from '../types';
import {getLeadingProductRank} from '../utils';

export type RenewSource = {
	bundleEntitlementIds: number[];
	description: string;
	environmentName: string;
	keyType: string;
	productExternalReferenceCode: string;
	servers: GenerateActivationKeyServer[];
	subscriptionEntitlementId: number;
	version: string;
};

export function useRenewSource(
	activationKeyExternalReferenceCode: string | null,
	generateForm?: GenerateForm
) {
	const {activationKeys, loading: loadingActivationKeys} =
		useProjectActivationKeys();

	const activationKey = activationKeyExternalReferenceCode
		? activationKeys.find(
				(current) => current.id === activationKeyExternalReferenceCode
			)
		: undefined;

	const {licenseKeys, loading: loadingLicenseKeys} =
		useActivationKeyLicenseKeys(activationKey?.activationKeyId);

	const renewSource = useMemo<RenewSource | undefined>(() => {
		if (!activationKey || !isRenewableKey(activationKey)) {
			return undefined;
		}

		const productsByExternalReferenceCode = new Map<
			string,
			GenerateFormProduct
		>();

		for (const product of generateForm?.products ?? []) {
			productsByExternalReferenceCode.set(
				product.externalReferenceCode,
				product
			);
		}

		const entitlementIds = new Set<number>();
		const servers = new Map<string, GenerateActivationKeyServer>();

		const orderedLicenseKeys = licenseKeys
			.filter((licenseKey) => licenseKey.active)
			.sort(
				(a, b) =>
					getLeadingProductRank(a.productExternalReferenceCode) -
					getLeadingProductRank(b.productExternalReferenceCode)
			);

		const keyType = activationKey.type;
		let productExternalReferenceCode = '';
		let subscriptionEntitlementId = 0;

		for (const licenseKey of orderedLicenseKeys) {
			if (licenseKey.entitlementId) {
				entitlementIds.add(licenseKey.entitlementId);
			}

			servers.set(
				[
					licenseKey.hostName,
					licenseKey.ipAddresses,
					licenseKey.macAddresses,
				].join('|'),
				{
					hostName: licenseKey.hostName,
					ipAddresses: licenseKey.ipAddresses,
					macAddresses: licenseKey.macAddresses,
				}
			);

			const product = productsByExternalReferenceCode.get(
				licenseKey.productExternalReferenceCode
			);

			if (product && !productExternalReferenceCode) {
				productExternalReferenceCode = product.externalReferenceCode;
				subscriptionEntitlementId =
					licenseKey.entitlementId || product.entitlementId;
			}
		}

		const [leadingLicenseKey] = orderedLicenseKeys;

		return {
			bundleEntitlementIds: [...entitlementIds],
			description: leadingLicenseKey?.description ?? '',
			environmentName: leadingLicenseKey?.name ?? '',
			keyType,
			productExternalReferenceCode,
			servers: [...servers.values()],
			subscriptionEntitlementId,
			version: leadingLicenseKey?.productVersion ?? '',
		};
	}, [activationKey, generateForm, licenseKeys]);

	return {
		loading: loadingActivationKeys || loadingLicenseKeys,
		renewSource,
	};
}

export default useRenewSource;
