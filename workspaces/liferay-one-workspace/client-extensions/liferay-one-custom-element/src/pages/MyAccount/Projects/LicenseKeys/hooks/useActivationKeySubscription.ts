/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useEffect, useState} from 'react';
import ActivationKeysService from '~/services/spring-boot/ActivationKeys';

export function useActivationKeySubscription(activationKeyId: string) {
	const [loading, setLoading] = useState(true);
	const [subscribed, setSubscribed] = useState(false);

	useEffect(() => {
		let active = true;

		setLoading(true);

		ActivationKeysService.getSubscription(activationKeyId)
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
	}, [activationKeyId]);

	async function toggleSubscription(nextSubscribed: boolean) {
		setSubscribed(nextSubscribed);

		try {
			if (nextSubscribed) {
				await ActivationKeysService.subscribe(activationKeyId);
			}
			else {
				await ActivationKeysService.unsubscribe(activationKeyId);
			}
		}
		catch (error) {
			setSubscribed(!nextSubscribed);
		}
	}

	return {loading, subscribed, toggleSubscription};
}

export default useActivationKeySubscription;
