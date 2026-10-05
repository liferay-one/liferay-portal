/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import HeadlessDelivery from '~/services/headless/HeadlessDelivery';
import HeadlessPublisherAsset from '~/services/headless/HeadlessPublisherAsset';
import HeadlessPublisherAssetAttachment from '~/services/headless/HeadlessPublisherAssetAttachment';
import {Properties} from '~/utils/attributeUtils';

import PublisherAsset from './PublisherAsset';

import type {UploadedFile} from '~/components/FileList/FileList';
import type {Product} from '~/types/product';

const {openToast} = vi.hoisted(() => ({openToast: vi.fn()}));

vi.mock('~/services/liferay/liferay', () => ({
	Liferay: {
		CommerceContext: {account: {accountId: 30, accountName: 'Acme'}},
		ThemeDisplay: {getScopeGroupId: () => '20'},
		Util: {openToast},
	},
}));

vi.mock('~/services/headless/HeadlessDelivery', () => ({
	default: {
		createDocumentFolder: vi.fn(),
		createDocumentFolderDocument: vi.fn(),
		getDocumentFolderDocuments: vi.fn(),
		getDocumentFolders: vi.fn(),
	},
}));

vi.mock('~/services/headless/HeadlessPublisherAsset', () => ({
	default: {
		createPublisherAsset: vi.fn(),
	},
}));

vi.mock('~/services/headless/HeadlessPublisherAssetAttachment', () => ({
	default: {
		createPublisherAssetAttachment: vi.fn(),
	},
}));

const PRODUCT = {id: 50, productId: 10} as Product;

function createFile(fileName: string): UploadedFile {
	const file = {
		file: new File(['a'], fileName),
		fileName,
	} as UploadedFile;

	return file;
}

function createPublisherAsset(
	files: UploadedFile[],
	properties: Partial<Properties> = {}
) {
	const publisherAsset = new PublisherAsset(
		files,
		'PACKAGE_ID',
		PRODUCT,
		properties as Properties,
		'7.4'
	);

	return publisherAsset;
}

describe('[CLIENT-ACTIONS-PUBLISHERASSET] PublisherAsset', () => {
	beforeEach(() => {
		vi.mocked(HeadlessPublisherAsset.createPublisherAsset, {
			partial: true,
		}).mockResolvedValue({id: 700});
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	it('creates the publisher_assets, app, and package folders when none exist', async () => {
		vi.mocked(HeadlessDelivery.getDocumentFolders, {
			deep: true,
			partial: true,
		}).mockResolvedValue({
			items: [],
		});
		vi.mocked(HeadlessDelivery.getDocumentFolderDocuments, {
			deep: true,
			partial: true,
		}).mockResolvedValue({items: [{id: 1, name: 'app_10_other'}]});
		vi.mocked(HeadlessDelivery.createDocumentFolder, {
			deep: true,
			partial: true,
		})
			.mockResolvedValueOnce({id: 100})
			.mockResolvedValueOnce({id: 200})
			.mockResolvedValueOnce({id: 300});

		await createPublisherAsset([]).process();

		expect(
			vi.mocked(HeadlessDelivery.getDocumentFolders)
		).toHaveBeenCalledWith(
			'20',
			new URLSearchParams({filter: "contains(name, 'publisher_assets')"})
		);
		expect(
			vi.mocked(HeadlessDelivery.createDocumentFolder).mock.calls
		).toEqual([
			['publisher_assets', 0],
			['app_10', 100, 'Members'],
			['app_10_package_PACKAGE_ID', 200, 'Members'],
		]);
		expect(
			vi
				.mocked(HeadlessDelivery.getDocumentFolderDocuments)
				.mock.calls.map(([folderId]) => folderId)
		).toEqual([100, 200]);
	});

	it('reuses existing folders found by exact name and creates a document then an attachment per file', async () => {
		vi.mocked(HeadlessDelivery.getDocumentFolders, {
			deep: true,
			partial: true,
		}).mockResolvedValue({
			items: [{id: 100}],
		});
		vi.mocked(HeadlessDelivery.getDocumentFolderDocuments, {
			deep: true,
			partial: true,
		})
			.mockResolvedValueOnce({
				items: [
					{id: 199, name: 'app_101'},
					{id: 200, name: 'app_10'},
				],
			})
			.mockResolvedValueOnce({
				items: [{id: 300, name: 'app_10_package_PACKAGE_ID'}],
			});
		vi.mocked(HeadlessDelivery.createDocumentFolderDocument, {
			deep: true,
			partial: true,
		})
			.mockResolvedValueOnce({id: 401})
			.mockResolvedValueOnce({id: 402});

		await createPublisherAsset([
			createFile('first.zip'),
			createFile('second.zip'),
		]).process();

		expect(HeadlessDelivery.createDocumentFolder).not.toHaveBeenCalled();
		expect(
			HeadlessPublisherAsset.createPublisherAsset
		).toHaveBeenCalledWith({
			r_accountEntryToPublisherAsset_accountEntryId: 30,
			r_productEntryToPublisherAsset_CPDefinitionId: 50,
			version: '7.4',
		});

		const documentCalls = vi.mocked(
			HeadlessDelivery.createDocumentFolderDocument
		).mock.calls;

		expect(documentCalls.map(([, folderId]) => folderId)).toEqual([
			300, 300,
		]);
		expect(
			documentCalls.map(
				([formData]) =>
					((formData as FormData).get('file') as File).name
			)
		).toEqual(['first.zip', 'second.zip']);
		expect(
			vi.mocked(
				HeadlessPublisherAssetAttachment.createPublisherAssetAttachment
			).mock.calls
		).toEqual([
			[
				{
					name: 'first.zip',
					publisherAssetAttachmentType: 'package',
					r_publisherAssetToAttachment_c_publisherAssetId: 700,
					sourceCode: 401,
				},
			],
			[
				{
					name: 'second.zip',
					publisherAssetAttachmentType: 'package',
					r_publisherAssetToAttachment_c_publisherAssetId: 700,
					sourceCode: 402,
				},
			],
		]);
	});

	it('raises a danger toast and rethrows when a step fails', async () => {
		const failure = new Error('folders failed');
		vi.mocked(HeadlessDelivery.getDocumentFolders).mockRejectedValue(
			failure
		);

		await expect(createPublisherAsset([]).process()).rejects.toBe(failure);
		expect(openToast).toHaveBeenCalledWith({
			message: 'Something went wrong when trying to upload a new package',
			type: 'danger',
		});
		expect(
			HeadlessPublisherAsset.createPublisherAsset
		).not.toHaveBeenCalled();
	});

	it('uses the CProductId relationship when the product versioning feature preview is on', async () => {
		vi.mocked(HeadlessDelivery.getDocumentFolders, {
			deep: true,
			partial: true,
		}).mockResolvedValue({
			items: [{id: 100}],
		});
		vi.mocked(HeadlessDelivery.getDocumentFolderDocuments, {
			deep: true,
			partial: true,
		})
			.mockResolvedValueOnce({items: [{id: 200, name: 'app_10'}]})
			.mockResolvedValueOnce({
				items: [{id: 300, name: 'app_10_package_PACKAGE_ID'}],
			});

		await createPublisherAsset([], {
			featurePreview: ['product-versioning-new-primary-key'],
		} as unknown as Partial<Properties>).process();

		expect(
			HeadlessPublisherAsset.createPublisherAsset
		).toHaveBeenCalledWith({
			r_accountEntryToPublisherAsset_accountEntryId: 30,
			r_productEntryToPublisherAsset_CProductId: 50,
			version: '7.4',
		});
	});
});
