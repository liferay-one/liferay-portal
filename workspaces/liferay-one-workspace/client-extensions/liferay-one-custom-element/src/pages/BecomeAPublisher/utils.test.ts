/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {
	DEFAULT_PUBLISHER_TYPE_ENTRIES,
	getPublisherTypeEntries,
	getPublisherTypeNames,
} from './utils';

import type {ListTypeDefinition} from '~/types/listTypeDefinition';

function toListTypeDefinition(listTypeEntries?: {key: string; name: string}[]) {
	return {listTypeEntries} as unknown as ListTypeDefinition;
}

describe('[MOD-BECOMEAPUBLISHER] BecomeAPublisher utils', () => {
	it('defines the app and solution publisher default entries', () => {
		expect(DEFAULT_PUBLISHER_TYPE_ENTRIES).toEqual([
			{key: 'appPublisher', name: 'App Publisher'},
			{key: 'solutionPublisher', name: 'Solution Publisher'},
		]);
	});

	it('maps the list type definition entries to key and name', () => {
		expect(
			getPublisherTypeEntries(
				toListTypeDefinition([
					{
						extra: 'ignored',
						key: 'resellerPublisher',
						name: 'Reseller Publisher',
					} as {key: string; name: string},
				])
			)
		).toEqual([{key: 'resellerPublisher', name: 'Reseller Publisher'}]);
	});

	it('falls back to the default entries when the definition is absent or empty', () => {
		expect(getPublisherTypeEntries()).toBe(DEFAULT_PUBLISHER_TYPE_ENTRIES);
		expect(getPublisherTypeEntries(toListTypeDefinition([]))).toBe(
			DEFAULT_PUBLISHER_TYPE_ENTRIES
		);
		expect(getPublisherTypeEntries(toListTypeDefinition())).toBe(
			DEFAULT_PUBLISHER_TYPE_ENTRIES
		);
	});

	it('maps keys to names from the list type definition entries', () => {
		expect(
			getPublisherTypeNames(
				['appPublisher'],
				toListTypeDefinition([
					{key: 'appPublisher', name: 'Custom App Publisher'},
				])
			)
		).toEqual(['Custom App Publisher']);
	});

	it('falls back to the default entry and then to the raw key', () => {
		expect(
			getPublisherTypeNames(
				['solutionPublisher', 'unknownPublisher'],
				toListTypeDefinition([
					{key: 'appPublisher', name: 'Custom App Publisher'},
				])
			)
		).toEqual(['Solution Publisher', 'unknownPublisher']);
	});
});
