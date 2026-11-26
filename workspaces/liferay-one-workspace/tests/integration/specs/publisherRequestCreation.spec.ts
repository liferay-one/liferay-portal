/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {expect, test} from '@playwright/test';

import {
	DEFAULT_ADMIN_EMAIL,
	DEFAULT_ADMIN_PASSWORD,
} from '../../utils/constants';
import {APIHelpers} from '../helpers/APIHelpers';

const ACCOUNT_MEMBER_EMAIL = 'accountmember@customer.com';

type PublisherAccountRequest = {
	emailAddress: string;
	id: number;
	requestDescription: string;
};

function buildPublisherAccountRequest(
	emailAddress: string,
	requestDescription: string
) {
	return {
		emailAddress,
		extension: '',
		firstName: 'Account',
		intlCode: '+1',
		lastName: 'Member',
		phoneNumber: '5551234567',
		publisherType: ['appPublisher'],
		requestDescription,
	};
}

test.describe('[AUTH-PUBLISHER-REQUEST-CREATION] publisher request creation', () => {
	test('[AUTH-PUBLISHER-REQUEST-CREATION] a customer sends a request to become a publisher and cannot read the requests of other users', async ({
		request,
	}) => {
		const administrator = new APIHelpers(request, {
			basicAuth: {
				password: DEFAULT_ADMIN_PASSWORD,
				user: DEFAULT_ADMIN_EMAIL,
			},
		});

		const accountMember = new APIHelpers(request, {
			basicAuth: {
				password: DEFAULT_ADMIN_PASSWORD,
				user: ACCOUNT_MEMBER_EMAIL,
			},
		});

		const publisherAccountRequestIds: number[] = [];

		try {
			const otherPublisherAccountRequest =
				await administrator.post<PublisherAccountRequest>(
					'/o/c/publisheraccountrequests',
					buildPublisherAccountRequest(
						'other@example.com',
						`Other publisher request ${Date.now()}`
					)
				);

			publisherAccountRequestIds.push(otherPublisherAccountRequest.id);

			const requestDescription = `Publisher request ${Date.now()}`;

			const publisherAccountRequest =
				await accountMember.post<PublisherAccountRequest>(
					'/o/c/publisheraccountrequests',
					buildPublisherAccountRequest(
						ACCOUNT_MEMBER_EMAIL,
						requestDescription
					)
				);

			publisherAccountRequestIds.push(publisherAccountRequest.id);

			expect(publisherAccountRequest.emailAddress).toBe(
				ACCOUNT_MEMBER_EMAIL
			);
			expect(publisherAccountRequest.requestDescription).toBe(
				requestDescription
			);

			const response = await accountMember.send(
				'get',
				`/o/c/publisheraccountrequests/${otherPublisherAccountRequest.id}`
			);

			expect(response.status()).toBe(404);
		}
		finally {
			for (const publisherAccountRequestId of publisherAccountRequestIds) {
				await administrator.delete(
					`/o/c/publisheraccountrequests/${publisherAccountRequestId}`
				);
			}
		}
	});
});
