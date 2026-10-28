/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import i18n from '~/i18n';
import FetcherError from '~/services/fetcher/FetcherError';
import Accounts from '~/services/spring-boot/Accounts';

import type {SalesforceComparison} from '~/types/accountInspection';
import type {DataQuery} from '~/types/api';

const SALESFORCE_RECORDS_POLL_ATTEMPTS = 90;

const SALESFORCE_RECORDS_POLL_INTERVAL = 2000;

function waitForNextPoll(signal?: AbortSignal) {
	return new Promise<void>((resolve) => {
		const timeout = setTimeout(resolve, SALESFORCE_RECORDS_POLL_INTERVAL);

		signal?.addEventListener(
			'abort',
			() => {
				clearTimeout(timeout);

				resolve();
			},
			{once: true}
		);
	});
}

export async function fetchSalesforceComparison(
	accountExternalReferenceCode: string,
	signal?: AbortSignal
): Promise<SalesforceComparison> {
	const {queryJobIds} = await Accounts.postSalesforceQueryJobs(
		accountExternalReferenceCode
	);

	for (
		let attempt = 1;
		attempt <= SALESFORCE_RECORDS_POLL_ATTEMPTS;
		attempt++
	) {
		signal?.throwIfAborted();

		const salesforceRecords = await Accounts.getSalesforceRecords(
			accountExternalReferenceCode,
			queryJobIds
		);

		if (salesforceRecords.complete) {
			return {queryJobIds, records: salesforceRecords.records};
		}

		if (attempt < SALESFORCE_RECORDS_POLL_ATTEMPTS) {
			await waitForNextPoll(signal);
		}
	}

	const message = i18n.translate(
		'salesforce-did-not-complete-the-comparison-in-time'
	);

	const fetcherError = new FetcherError(message);

	fetcherError.info = {title: message};

	throw fetcherError;
}

export function accountSalesforceRecordsQuery(
	accountExternalReferenceCode: string | undefined,
	loadedAt: number,
	signal?: AbortSignal
): DataQuery<SalesforceComparison> {
	return {
		fetcher: () =>
			fetchSalesforceComparison(accountExternalReferenceCode!, signal),
		key: accountExternalReferenceCode
			? `/account-inspection/${accountExternalReferenceCode}/salesforce-records/${loadedAt}`
			: null,
	};
}
