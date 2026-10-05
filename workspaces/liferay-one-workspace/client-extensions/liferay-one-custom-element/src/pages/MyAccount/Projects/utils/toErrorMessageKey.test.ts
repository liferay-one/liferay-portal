/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';
import FetcherError from '~/services/fetcher/FetcherError';

import toErrorMessageKey from './toErrorMessageKey';

function toFetcherError(status?: number) {
	const error = new FetcherError('Failed');

	error.status = status;

	return error;
}

describe('[MOD-MYACCOUNT-PROJECTS-TOERRORMESSAGEKEY] toErrorMessageKey', () => {
	it('returns the mapped key for a FetcherError with a mapped status', () => {
		expect(
			toErrorMessageKey(toFetcherError(403), {403: 'access-required'})
		).toBe('access-required');
	});

	it('returns the unexpected error key for an unmapped or missing status', () => {
		expect(
			toErrorMessageKey(toFetcherError(500), {403: 'access-required'})
		).toBe('an-unexpected-error-occurred');
		expect(
			toErrorMessageKey(toFetcherError(), {403: 'access-required'})
		).toBe('an-unexpected-error-occurred');
	});

	it('returns the unexpected error key for any other error type', () => {
		expect(
			toErrorMessageKey(
				Object.assign(new Error('Failed'), {status: 403}),
				{
					403: 'access-required',
				}
			)
		).toBe('an-unexpected-error-occurred');
		expect(toErrorMessageKey('Failed', {})).toBe(
			'an-unexpected-error-occurred'
		);
	});
});
