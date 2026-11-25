/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {PUBLISHER_TYPE_ENTRIES, getPublisherTypeNames} from './utils';

describe('[MOD-BECOMEAPUBLISHER] BecomeAPublisher utils', () => {
	it('defines the app and solution publisher entries', () => {
		expect(PUBLISHER_TYPE_ENTRIES).toEqual([
			{key: 'appPublisher', name: 'App Publisher'},
			{key: 'solutionPublisher', name: 'Solution Publisher'},
		]);
	});

	it('maps keys to the names of the publisher type entries', () => {
		expect(
			getPublisherTypeNames(['appPublisher', 'solutionPublisher'])
		).toEqual(['App Publisher', 'Solution Publisher']);
	});

	it('falls back to the raw key when no entry matches', () => {
		expect(getPublisherTypeNames(['unknownPublisher'])).toEqual([
			'unknownPublisher',
		]);
	});
});
