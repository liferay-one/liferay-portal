/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it, vi} from 'vitest';
import fetcher from '~/services/fetcher/fetcher';

import HeadlessDelivery from './HeadlessDelivery';

const {getScopeGroupId} = vi.hoisted(() => ({getScopeGroupId: vi.fn()}));

vi.mock('~/services/liferay/liferay', () => ({
	Liferay: {ThemeDisplay: {getScopeGroupId}},
}));

vi.mock('~/services/fetcher/fetcher', () => ({
	default: Object.assign(vi.fn(), {
		delete: vi.fn(),
		post: vi.fn(),
	}),
}));

const BASE_URL = 'o/headless-delivery/v1.0';

describe('[CLIENT-HEADLESS-HEADLESSDELIVERY] HeadlessDelivery', () => {
	afterEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	it('creates a child folder under the parent folder URL with the given viewableBy', async () => {
		await HeadlessDelivery.createDocumentFolder('Package', 42, 'Members');

		expect(fetcher.post).toHaveBeenCalledWith(
			`${BASE_URL}/document-folders/42/document-folders`,
			{name: 'Package', parentDocumentFolderId: 42, viewableBy: 'Members'}
		);
	});

	it('creates a root folder under the site folders URL with viewableBy defaulting to Anyone', async () => {
		getScopeGroupId.mockReturnValue('20121');

		await HeadlessDelivery.createDocumentFolder('publisher_assets', 0);

		expect(fetcher.post).toHaveBeenCalledWith(
			`${BASE_URL}/sites/20121/document-folders`,
			{
				name: 'publisher_assets',
				parentDocumentFolderId: 0,
				viewableBy: 'Anyone',
			}
		);
	});

	it('uses fixed URLs for documents and folder listings', async () => {
		const body = new FormData();
		const searchParams = new URLSearchParams({page: '2'});

		await HeadlessDelivery.createDocumentFolderDocument(body, 1);
		await HeadlessDelivery.deleteDocument(2);
		await HeadlessDelivery.getDocument(3);
		await HeadlessDelivery.getDocumentFolderDocument(4, searchParams);
		await HeadlessDelivery.getDocumentFolderDocuments(5, searchParams);
		await HeadlessDelivery.getDocumentFolders(6, searchParams);

		expect(fetcher.post).toHaveBeenCalledWith(
			`${BASE_URL}/document-folders/1/documents`,
			body
		);
		expect(fetcher.delete).toHaveBeenCalledWith(`${BASE_URL}/documents/2`);
		expect(vi.mocked(fetcher).mock.calls).toEqual([
			[`${BASE_URL}/documents/3`],
			[`${BASE_URL}/document-folders/4/documents?page=2`],
			[`${BASE_URL}/document-folders/5/document-folders?page=2`],
			[`${BASE_URL}/sites/6/document-folders?page=2`],
		]);
	});
});
