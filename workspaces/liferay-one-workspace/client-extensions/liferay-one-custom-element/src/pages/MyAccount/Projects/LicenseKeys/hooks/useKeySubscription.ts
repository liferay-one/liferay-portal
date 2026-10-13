/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useEffect, useState} from 'react';
import ActivationKeysService from '~/services/spring-boot/ActivationKeys';
import LicenseKeysService from '~/services/spring-boot/LicenseKeys';

import type {ProjectActivationKey} from '~/hooks/useProjectActivationKeys';

export function useKeySubscription({
	activationKeyId,
	licenseKeyId = '',
	unaggregated = false,
}: Pick<
	ProjectActivationKey,
	'activationKeyId' | 'licenseKeyId' | 'unaggregated'
>) {
	const [loading, setLoading] = useState(true);
	const [subscribed, setSubscribed] = useState(false);

	const keyId = unaggregated ? licenseKeyId : activationKeyId;

	const keySubscriptionService = unaggregated
		? LicenseKeysService
		: ActivationKeysService;

	useEffect(() => {
		let active = true;

		setLoading(true);

		keySubscriptionService
			.getSubscription(keyId)
			.then((value) => {
				if (active) {
					setSubscribed(value);
				}
			})
			.catch(() => {
				if (active) {
					setSubscribed(false);
				}
			})
			.finally(() => {
				if (active) {
					setLoading(false);
				}
			});

		return () => {
			active = false;
		};
	}, [keyId, keySubscriptionService]);

	async function toggleSubscription(nextSubscribed: boolean) {
		setSubscribed(nextSubscribed);

		try {
			if (nextSubscribed) {
				await keySubscriptionService.subscribe(keyId);
			}
			else {
				await keySubscriptionService.unsubscribe(keyId);
			}
		}
		catch (error) {
			setSubscribed(!nextSubscribed);
		}
	}

	return {loading, subscribed, toggleSubscription};
}

export default useKeySubscription;
