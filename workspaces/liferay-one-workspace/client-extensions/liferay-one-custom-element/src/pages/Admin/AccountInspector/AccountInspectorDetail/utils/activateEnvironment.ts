/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import i18n from '~/i18n';
import {Liferay} from '~/services/liferay/liferay';
import Cloud from '~/services/spring-boot/Cloud';

import isEnvironmentAwaitingActivation from './isEnvironmentAwaitingActivation';

import type FetcherError from '~/services/fetcher/FetcherError';
import type {
	InspectedCollectionKey,
	InspectedEntry,
} from '~/types/accountInspection';

export function canActivateEnvironment(
	collection: InspectedCollectionKey,
	entry: InspectedEntry
) {
	return (
		collection === 'environments' && isEnvironmentAwaitingActivation(entry)
	);
}

async function activateEnvironment(entry: InspectedEntry, hostName: string) {
	try {
		await Cloud.postEnvironmentsManualActivation(
			entry.externalReferenceCode!,
			hostName
		);

		Liferay.Util.openToast({
			message: i18n.sub('x-was-set-to-active', String(entry.offering)),
			type: 'success',
		});

		return true;
	}
	catch (error) {
		const status = (error as FetcherError)?.status;

		Liferay.Util.openToast({
			message: i18n.translate(
				status === 409
					? 'this-environment-has-already-been-activated'
					: 'an-unexpected-error-occurred'
			),
			type: 'danger',
		});

		return false;
	}
}

export default activateEnvironment;
