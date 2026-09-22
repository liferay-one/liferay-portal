/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {
	ProjectActivationKey,
	useProjectActivationKeys,
} from '~/hooks/useProjectActivationKeys';
import {
	GenerateForm,
	GenerateFormProduct,
} from '~/services/spring-boot/LicenseKeys';

import {GenerateActivationKeyServer} from '../types';

export type RenewSource = {
	bundleEntitlementIds: number[];
	description: string;
	environmentName: string;
	keyType: string;
	licenseKeyIds: number[];
	productExternalReferenceCode: string;
	servers: GenerateActivationKeyServer[];
	subscriptionEntitlementId: number;
	version: string;
};

function toServerKey(activationKey: ProjectActivationKey) {
	return [
		activationKey.hostName,
		activationKey.ipAddresses,
		activationKey.macAddresses,
	].join('|');
}

export function useRenewSource(
	licenseKeyExternalReferenceCode: string | null,
	generateForm?: GenerateForm
) {
	const {activationKeys, loading} = useProjectActivationKeys();

	const renewSource = useMemo<RenewSource | undefined>(() => {
		if (!licenseKeyExternalReferenceCode) {
			return undefined;
		}

		const activationKey = activationKeys.find(
			(current) => current.id === licenseKeyExternalReferenceCode
		);

		if (!activationKey) {
			return undefined;
		}

		const siblings = activationKeys.filter(
			(current) => current.name === activationKey.name
		);

		const productsByKeyType = new Map<string, GenerateFormProduct>();

		for (const product of generateForm?.products ?? []) {
			for (const productKeyType of product.keyTypes) {
				productsByKeyType.set(productKeyType.label, product);
			}
		}

		const entitlementIds = new Set<number>();
		const licenseKeyIds: number[] = [];
		const servers = new Map<string, GenerateActivationKeyServer>();

		let keyType = '';
		let productExternalReferenceCode = '';
		let subscriptionEntitlementId = 0;

		for (const sibling of siblings) {
			for (const entitlementId of sibling.entitlementIds) {
				entitlementIds.add(entitlementId);
			}

			if (sibling.active && sibling.licenseKeyId) {
				licenseKeyIds.push(Number(sibling.licenseKeyId));
			}

			servers.set(toServerKey(sibling), {
				hostName: sibling.hostName,
				ipAddresses: sibling.ipAddresses,
				macAddresses: sibling.macAddresses,
			});

			const product = productsByKeyType.get(sibling.licenseName);

			if (product && !keyType) {
				keyType = sibling.licenseName;
				productExternalReferenceCode = product.externalReferenceCode;
				subscriptionEntitlementId =
					sibling.entitlementId || product.entitlementId;
			}
		}

		return {
			bundleEntitlementIds: [...entitlementIds],
			description: activationKey.description,
			environmentName: activationKey.name,
			keyType,
			licenseKeyIds,
			productExternalReferenceCode,
			servers: [...servers.values()],
			subscriptionEntitlementId,
			version: activationKey.productVersion,
		};
	}, [activationKeys, generateForm, licenseKeyExternalReferenceCode]);

	return {loading, renewSource};
}

export default useRenewSource;
