/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {useActivationKeyLicenseKeys} from '~/hooks/useActivationKeyLicenseKeys';
import {useProjectActivationKeys} from '~/hooks/useProjectActivationKeys';
import {isRenewableKey} from '~/pages/MyAccount/Projects/utils/isRenewableKey';
import {GenerateForm} from '~/services/spring-boot/ActivationKeys';

import {GenerateActivationKeyServer} from '../types';
import {getLicenseKeyFamilyRank} from '../utils';

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

		const entitlementIds = new Set<number>();
		const servers = new Map<string, GenerateActivationKeyServer>();

		const orderedLicenseKeys = licenseKeys
			.filter((licenseKey) => licenseKey.active)
			.sort(
				(a, b) =>
					getLicenseKeyFamilyRank(a.licenseKeyFamily) -
					getLicenseKeyFamilyRank(b.licenseKeyFamily)
			);

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
		}

		const [leadingLicenseKey] = orderedLicenseKeys;

		const licenseKeyFamily =
			activationKey.licenseKeyFamily ||
			leadingLicenseKey?.licenseKeyFamily ||
			'';

		const product = licenseKeyFamily
			? generateForm?.products.find(
					(current) => current.licenseKeyFamily === licenseKeyFamily
				)
			: undefined;

		const subscriptionLicenseKey = orderedLicenseKeys.find(
			(licenseKey) =>
				licenseKey.entitlementId &&
				licenseKey.licenseKeyFamily === licenseKeyFamily
		);

		return {
			bundleEntitlementIds: [...entitlementIds],
			description: leadingLicenseKey?.description ?? '',
			environmentName: leadingLicenseKey?.name ?? '',
			keyType: activationKey.type,
			productExternalReferenceCode: product?.externalReferenceCode ?? '',
			servers: [...servers.values()],
			subscriptionEntitlementId:
				subscriptionLicenseKey?.entitlementId ||
				product?.entitlementId ||
				0,
			version: leadingLicenseKey?.productVersion ?? '',
		};
	}, [activationKey, generateForm, licenseKeys]);

	return {
		loading: loadingActivationKeys || loadingLicenseKeys,
		renewSource,
	};
}

export default useRenewSource;
