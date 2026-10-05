/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import useSWR from 'swr';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useMarketplaceContext} from '~/context/MarketplaceContextProvider';
import HeadlessAdminTaxonomy from '~/services/headless/HeadlessAdminTaxonomy';

import {useGetVocabulariesAndCategories} from './useGetVocabulariesAndCategories';

vi.mock('swr', () => ({
	default: vi.fn(),
}));

vi.mock('~/context/MarketplaceContextProvider', () => ({
	useMarketplaceContext: vi.fn(),
}));

vi.mock('~/services/headless/HeadlessAdminTaxonomy', () => ({
	default: {
		getSiteTaxonomyVocabulariesGraphQL: vi.fn(),
		getTaxonomyVocabulariesGraphQL: vi.fn(),
	},
}));

vi.mock('~/utils/getTaxonomyCategoryLabel', () => ({
	getTaxonomyCategoryLabel: (name: string) => `label-${name}`,
}));

const VOCABULARIES = {
	items: [
		{
			id: 1,
			name: 'marketplace-product-type',
			taxonomyCategories: {
				items: [
					{id: 11, name: 'app'},
					{id: 12, name: 'solution'},
				],
			},
		},
		{
			id: 2,
			name: 'marketplace-edition',
			taxonomyCategories: {items: []},
		},
	],
};

function runFetcher(
	vocabulariesName: string[],
	useSiteTaxonomyVocabularyQuery: boolean
) {
	vi.mocked(useMarketplaceContext).mockReturnValue({
		properties: {useSiteTaxonomyVocabularyQuery},
	} as unknown as ReturnType<typeof useMarketplaceContext>);

	renderHook(() => useGetVocabulariesAndCategories(vocabulariesName));

	const [key, fetcher] = vi.mocked(useSWR).mock.calls[0] as unknown as [
		unknown,
		() => Promise<unknown>,
	];

	expect(key).toEqual({key: 'vocabularies', vocabulariesName});

	return fetcher();
}

describe('[HOOK-USEGETVOCABULARIESANDCATEGORIES] useGetVocabulariesAndCategories', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(
			HeadlessAdminTaxonomy.getSiteTaxonomyVocabulariesGraphQL
		).mockResolvedValue(VOCABULARIES as never);
		vi.mocked(
			HeadlessAdminTaxonomy.getTaxonomyVocabulariesGraphQL
		).mockResolvedValue(VOCABULARIES as never);
	});

	it('uses the site taxonomy query when the marketplace property is set', async () => {
		await runFetcher(['marketplace-edition'], true);

		expect(
			HeadlessAdminTaxonomy.getSiteTaxonomyVocabulariesGraphQL
		).toHaveBeenCalledTimes(1);
		expect(
			HeadlessAdminTaxonomy.getTaxonomyVocabulariesGraphQL
		).not.toHaveBeenCalled();
	});

	it('uses the global taxonomy query when the marketplace property is not set', async () => {
		await runFetcher(['marketplace-edition'], false);

		expect(
			HeadlessAdminTaxonomy.getTaxonomyVocabulariesGraphQL
		).toHaveBeenCalledTimes(1);
		expect(
			HeadlessAdminTaxonomy.getSiteTaxonomyVocabulariesGraphQL
		).not.toHaveBeenCalled();
	});

	it('skips requested vocabularies that do not exist', async () => {
		const vocabularies = await runFetcher(
			['missing-vocabulary', 'marketplace-edition'],
			false
		);

		expect(Object.keys(vocabularies as object)).toEqual([
			'marketplace-edition',
		]);
	});

	it('maps categories to label, name, and string id value', async () => {
		const vocabularies = (await runFetcher(
			['marketplace-product-type'],
			false
		)) as Record<string, {categories: unknown; id: number}>;

		expect(vocabularies['marketplace-product-type'].id).toBe(1);
		expect(vocabularies['marketplace-product-type'].categories).toEqual([
			{label: 'label-app', name: 'app', value: '11'},
			{label: 'label-solution', name: 'solution', value: '12'},
		]);
	});
});
