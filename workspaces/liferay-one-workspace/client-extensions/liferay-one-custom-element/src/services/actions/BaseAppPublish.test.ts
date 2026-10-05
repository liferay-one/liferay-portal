/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, describe, expect, it, vi} from 'vitest';
import {LiferayPackage} from '~/context/NewAppContextProvider';
import {ProductSpecificationKey} from '~/enums/Product';
import HeadlessCommerceAdminCatalog from '~/services/headless/HeadlessCommerceAdminCatalog';
import HeadlessDelivery from '~/services/headless/HeadlessDelivery';
import HeadlessPublisherAsset from '~/services/headless/HeadlessPublisherAsset';

import BaseAppPublish from './BaseAppPublish';

import type {UploadedFile} from '~/components/FileList/FileList';
import type {Product} from '~/types/product';

vi.mock('~/services/headless/HeadlessCommerceAdminCatalog', () => ({
	default: {
		addOrUpdateProductImageByExternalReferenceCode: vi.fn(),
		createProductSpecification: vi.fn(),
		deleteAttachmentByExternalReferenceCode: vi.fn(),
		updateProductSpecification: vi.fn(),
	},
}));

vi.mock('~/services/headless/HeadlessDelivery', () => ({
	default: {
		deleteDocument: vi.fn(),
	},
}));

vi.mock('~/services/headless/HeadlessPublisherAsset', () => ({
	default: {
		deletePublisherAsset: vi.fn(),
	},
}));

function createImage(overrides: Partial<UploadedFile>): UploadedFile {
	const image = {
		changed: false,
		error: false,
		file: new File(['a'], 'image.png'),
		fileName: 'image.png',
		id: 'IMAGE_ERC',
		progress: 0,
		readableSize: '1 B',
		uploaded: false,
		...overrides,
	} as UploadedFile;

	return image;
}

function createProduct(overrides: Partial<Product> = {}): Product {
	const product = {
		externalReferenceCode: 'PRODUCT_ERC',
		images: [],
		productId: 10,
		productSpecifications: [],
		...overrides,
	} as unknown as Product;

	return product;
}

describe('[CLIENT-ACTIONS-BASEAPPPUBLISH] BaseAppPublish', () => {
	afterEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	describe('addOrUpdateImages', () => {
		it('reuses the uploaded product image IDs and the description title for a changed image', async () => {
			const image = createImage({
				changed: true,
				id: 'EXISTING_ERC',
				imageDescription: 'Screenshot',
				uploaded: true,
			});

			await BaseAppPublish.addOrUpdateImages(
				[image],
				null,
				createProduct({
					images: [
						{
							externalReferenceCode: 'EXISTING_ERC',
							fileEntryId: 7,
							id: 8,
						},
					],
				} as unknown as Partial<Product>),
				0
			);

			expect(
				HeadlessCommerceAdminCatalog.addOrUpdateProductImageByExternalReferenceCode
			).toHaveBeenCalledWith('PRODUCT_ERC', {
				attachment: 'YQ==',
				externalReferenceCode: 'EXISTING_ERC',
				fileEntryId: 7,
				galleryEnabled: true,
				id: 8,
				neverExpire: true,
				priority: 1,
				tags: [],
				title: {en_US: 'Screenshot'},
			});
		});

		it('skips unchanged uploaded images but still increments the priority', async () => {
			const skippedImage = createImage({id: 'SKIPPED', uploaded: true});
			const newImage = createImage({id: 'NEW'});

			await BaseAppPublish.addOrUpdateImages(
				[skippedImage, newImage],
				'solution-header',
				createProduct(),
				5
			);

			expect(
				HeadlessCommerceAdminCatalog.addOrUpdateProductImageByExternalReferenceCode
			).toHaveBeenCalledTimes(1);
			expect(
				HeadlessCommerceAdminCatalog.addOrUpdateProductImageByExternalReferenceCode
			).toHaveBeenCalledWith('PRODUCT_ERC', {
				attachment: 'YQ==',
				externalReferenceCode: 'NEW',
				galleryEnabled: true,
				neverExpire: true,
				priority: 7,
				tags: ['solution-header'],
				title: {en_US: 'image.png'},
			});
			expect(newImage).toMatchObject({
				changed: false,
				progress: 100,
				uploaded: true,
			});
		});
	});

	describe('deleteLiferayPackages', () => {
		it('deletes every document and then the publisher asset, logging and continuing when a package fails', async () => {
			const consoleError = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {});

			vi.mocked(HeadlessDelivery.deleteDocument).mockImplementation(
				async (documentId) => {
					if (documentId === 'BROKEN_FILE') {
						throw new Error('delete failed');
					}
				}
			);

			await BaseAppPublish.deleteLiferayPackages([
				{
					file: [{id: 'BROKEN_FILE'}],
					id: 'PACKAGE_1',
				},
				{
					file: [{id: 'FILE_A'}, {id: 'FILE_B'}],
					id: 'PACKAGE_2',
				},
				{id: 'PACKAGE_3'},
			] as unknown as LiferayPackage[]);

			expect(
				vi.mocked(HeadlessDelivery.deleteDocument).mock.calls
			).toEqual([['BROKEN_FILE'], ['FILE_A'], ['FILE_B']]);
			expect(
				vi.mocked(HeadlessPublisherAsset.deletePublisherAsset).mock
					.calls
			).toEqual([['PACKAGE_2'], ['PACKAGE_3']]);
			expect(consoleError).toHaveBeenCalledWith(
				'Unable to delete Liferay package PACKAGE_1',
				expect.any(Error)
			);
		});
	});

	describe('deleteReferences', () => {
		it('deletes every attachment, logging and continuing when one fails', async () => {
			const consoleError = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {});

			vi.mocked(
				HeadlessCommerceAdminCatalog.deleteAttachmentByExternalReferenceCode
			)
				.mockRejectedValueOnce(new Error('delete failed'))
				.mockResolvedValueOnce(undefined);

			await BaseAppPublish.deleteReferences(['FIRST', 'SECOND']);

			expect(
				vi.mocked(
					HeadlessCommerceAdminCatalog.deleteAttachmentByExternalReferenceCode
				).mock.calls
			).toEqual([['FIRST'], ['SECOND']]);
			expect(consoleError).toHaveBeenCalledTimes(1);
			expect(consoleError).toHaveBeenCalledWith(
				'Unable to delete attachment FIRST',
				expect.any(Error)
			);
		});
	});

	describe('updateSpecification', () => {
		it('creates a new specification on the product with the label and visibility and pushes the result', async () => {
			const created = {
				id: 99,
				specificationKey: ProductSpecificationKey.LAST_UPDATED_BY,
				value: {en_US: 'Ann'},
			};

			vi.mocked(
				HeadlessCommerceAdminCatalog.createProductSpecification
			).mockResolvedValue(created);

			const product = createProduct();

			await BaseAppPublish.updateSpecification(
				product,
				ProductSpecificationKey.LAST_UPDATED_BY,
				'Ann',
				{label: 'Last Updated By', visible: false}
			);

			expect(
				HeadlessCommerceAdminCatalog.createProductSpecification
			).toHaveBeenCalledWith(10, {
				label: {en_US: 'Last Updated By'},
				specificationKey: 'last-updated-by',
				value: {en_US: 'Ann'},
				visible: false,
			});
			expect(
				HeadlessCommerceAdminCatalog.updateProductSpecification
			).not.toHaveBeenCalled();
			expect(product.productSpecifications).toEqual([created]);
		});

		it('creates a new specification under exactMatch when no existing value matches', async () => {
			const product = createProduct({
				productSpecifications: [
					{
						id: 1,
						specificationKey: 'liferay-version',
						value: {en_US: '7.3'},
					},
				],
			} as unknown as Partial<Product>);

			await BaseAppPublish.updateSpecification(
				product,
				ProductSpecificationKey.LIFERAY_VERSION,
				'7.4',
				{exactMatch: true}
			);

			expect(
				HeadlessCommerceAdminCatalog.createProductSpecification
			).toHaveBeenCalledWith(10, {
				specificationKey: 'liferay-version',
				value: {en_US: '7.4'},
			});
			expect(
				HeadlessCommerceAdminCatalog.updateProductSpecification
			).not.toHaveBeenCalled();
		});

		it('skips a blank value', async () => {
			await BaseAppPublish.updateSpecification(
				createProduct(),
				ProductSpecificationKey.APP_SUPPORT_EMAIL,
				'   '
			);

			expect(
				HeadlessCommerceAdminCatalog.createProductSpecification
			).not.toHaveBeenCalled();
			expect(
				HeadlessCommerceAdminCatalog.updateProductSpecification
			).not.toHaveBeenCalled();
		});

		it('skips a value identical to the existing specification', async () => {
			await BaseAppPublish.updateSpecification(
				createProduct({
					productSpecifications: [
						{
							id: 1,
							specificationKey: 'support-email-address',
							value: {en_US: 'help@example.com'},
						},
					],
				} as unknown as Partial<Product>),
				ProductSpecificationKey.APP_SUPPORT_EMAIL,
				'help@example.com'
			);

			expect(
				HeadlessCommerceAdminCatalog.createProductSpecification
			).not.toHaveBeenCalled();
			expect(
				HeadlessCommerceAdminCatalog.updateProductSpecification
			).not.toHaveBeenCalled();
		});

		it('updates the existing specification by its ID and mutates its value', async () => {
			const specification = {
				id: 5,
				specificationKey: 'support-email-address',
				value: {en_US: 'old@example.com'},
			};

			await BaseAppPublish.updateSpecification(
				createProduct({
					productSpecifications: [specification],
				} as unknown as Partial<Product>),
				ProductSpecificationKey.APP_SUPPORT_EMAIL,
				'new@example.com'
			);

			expect(
				HeadlessCommerceAdminCatalog.updateProductSpecification
			).toHaveBeenCalledWith(5, {
				specificationKey: 'support-email-address',
				value: {en_US: 'new@example.com'},
			});
			expect(
				HeadlessCommerceAdminCatalog.createProductSpecification
			).not.toHaveBeenCalled();
			expect(specification.value.en_US).toBe('new@example.com');
		});
	});

	describe('updateSpecifications', () => {
		it('settles every specification even when one fails', async () => {
			vi.mocked(HeadlessCommerceAdminCatalog.createProductSpecification, {
				partial: true,
			})
				.mockRejectedValueOnce(new Error('create failed'))
				.mockResolvedValueOnce({id: 2});

			const results = await BaseAppPublish.updateSpecifications(
				createProduct(),
				[
					{
						key: ProductSpecificationKey.APP_SUPPORT_EMAIL,
						value: 'a',
					},
					{
						key: ProductSpecificationKey.APP_SUPPORT_PHONE,
						value: 'b',
					},
				]
			);

			expect(results.map(({status}) => status)).toEqual([
				'rejected',
				'fulfilled',
			]);
			expect(
				HeadlessCommerceAdminCatalog.createProductSpecification
			).toHaveBeenCalledTimes(2);
		});
	});
});
