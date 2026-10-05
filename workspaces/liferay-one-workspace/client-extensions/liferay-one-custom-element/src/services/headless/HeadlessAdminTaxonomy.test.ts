/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it, vi} from 'vitest';
import fetcher from '~/services/fetcher/fetcher';

import HeadlessAdminTaxonomy from './HeadlessAdminTaxonomy';

const {getScopeGroupId} = vi.hoisted(() => ({getScopeGroupId: vi.fn()}));

vi.mock('~/services/liferay/liferay', () => ({
	Liferay: {ThemeDisplay: {getScopeGroupId}},
}));

vi.mock('~/services/fetcher/fetcher', () => ({
	default: Object.assign(vi.fn(), {post: vi.fn()}),
}));

const VOCABULARIES = {items: [{id: 1, name: 'Marketplace'}]};

describe('[CLIENT-HEADLESS-HEADLESSADMINTAXONOMY] HeadlessAdminTaxonomy', () => {
	afterEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	it('embeds the scope group ID as siteKey in the site vocabularies query and returns the vocabularies', async () => {
		getScopeGroupId.mockReturnValue('20121');
		vi.mocked(fetcher.post).mockResolvedValue({
			data: {
				headlessAdminTaxonomy_v1_0: {
					taxonomyVocabularies: VOCABULARIES,
				},
			},
		});

		await expect(
			HeadlessAdminTaxonomy.getSiteTaxonomyVocabulariesGraphQL()
		).resolves.toEqual(VOCABULARIES);

		const [url, body] = vi.mocked(fetcher.post).mock.calls[0] as [
			string,
			{query: string},
		];

		expect(url).toBe('/o/graphql');
		expect(body.query).toContain(
			'taxonomyVocabularies: siteTaxonomyVocabularies(siteKey: "20121")'
		);
	});

	it('embeds the scope group ID as siteKey in the vocabularies query and returns the vocabularies', async () => {
		getScopeGroupId.mockReturnValue('20122');
		vi.mocked(fetcher.post).mockResolvedValue({
			data: {
				headlessAdminTaxonomy_v1_0: {
					taxonomyVocabularies: VOCABULARIES,
				},
			},
		});

		await expect(
			HeadlessAdminTaxonomy.getTaxonomyVocabulariesGraphQL()
		).resolves.toEqual(VOCABULARIES);

		const [url, body] = vi.mocked(fetcher.post).mock.calls[0] as [
			string,
			{query: string},
		];

		expect(url).toBe('/o/graphql');
		expect(body.query).toContain('taxonomyVocabularies(siteKey: "20122")');
		expect(body.query).not.toContain('siteTaxonomyVocabularies');
	});

	it('yields undefined when the data is absent', async () => {
		vi.mocked(fetcher.post).mockResolvedValueOnce({});

		await expect(
			HeadlessAdminTaxonomy.getSiteTaxonomyVocabulariesGraphQL()
		).resolves.toBeUndefined();

		vi.mocked(fetcher.post).mockResolvedValueOnce({data: {}});

		await expect(
			HeadlessAdminTaxonomy.getTaxonomyVocabulariesGraphQL()
		).resolves.toBeUndefined();
	});
});
