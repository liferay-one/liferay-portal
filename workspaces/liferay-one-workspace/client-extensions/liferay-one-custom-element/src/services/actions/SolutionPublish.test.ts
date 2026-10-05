/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {SolutionInitialState} from '~/context/SolutionContextProvider';
import HeadlessCommerceAdminCatalog from '~/services/headless/HeadlessCommerceAdminCatalog';

import SolutionPublish from './SolutionPublish';

import type {UploadedFile} from '~/components/FileList/FileList';
import type {Product} from '~/types/product';

vi.mock('~/services/liferay/liferay', () => ({
	Liferay: {
		ThemeDisplay: new Proxy(
			{},
			{
				get: (_target, property) =>
					property === 'getUserId' ? () => '42' : () => '',
			}
		),
	},
}));

vi.mock('~/services/headless/HeadlessCommerceAdminCatalog', () => ({
	default: {
		addOrUpdateProductImageByExternalReferenceCode: vi.fn(),
		createProductSpecification: vi.fn(),
		createVirtualProduct: vi.fn(),
		deleteAttachmentByExternalReferenceCode: vi.fn(),
		updateProduct: vi.fn(),
		updateProductSpecification: vi.fn(),
	},
}));

function createContext(
	overrides: Partial<SolutionInitialState> = {}
): SolutionInitialState {
	const context = {
		catalogId: 5,
		company: {
			description: 'Company description',
			email: 'company@example.com',
			phone: '555',
			website: 'https://example.com',
		},
		contactUs: 'contact@example.com',
		details: [],
		header: {
			contentType: {
				content: {headerImages: []},
				type: 'upload-images',
			},
			description: 'Header description',
			title: 'Header title',
		},
		loading: false,
		productId: 0,
		profile: {
			categories: [
				{label: 'Category', name: 'category', value: '11'},
				{label: 'Empty', name: 'empty', value: ''},
			],
			description: 'Profile description',
			file: {} as UploadedFile,
			name: 'Solution',
			tags: [{label: 'Tag', name: 'tag', value: '13'}],
		},
		references: {
			imagesToDelete: ['OLD_IMAGE'],
			vocabulariesAndCategories: {
				'marketplace-product-type': {
					categories: [
						{label: 'App', name: 'app', value: '20'},
						{label: 'Solution', name: 'solution', value: '21'},
					],
					id: 1,
					name: 'Product Type',
				},
			},
		},
		termsAndConditions: true,
		...overrides,
	} as SolutionInitialState;

	return context;
}

function createImage(id: string): UploadedFile {
	const image = {
		changed: false,
		file: new File(['a'], `${id}.png`),
		fileName: `${id}.png`,
		id,
		uploaded: false,
	} as UploadedFile;

	return image;
}

function createProduct(): Product {
	const product = {
		externalReferenceCode: 'PRODUCT_ERC',
		images: [],
		productId: 10,
		productSpecifications: [],
	} as unknown as Product;

	return product;
}

function getImageCalls() {
	return vi
		.mocked(
			HeadlessCommerceAdminCatalog.addOrUpdateProductImageByExternalReferenceCode
		)
		.mock.calls.map(([, body]) => body as Record<string, unknown>);
}

function getSpecificationValue(key: string) {
	const call = vi
		.mocked(HeadlessCommerceAdminCatalog.createProductSpecification)
		.mock.calls.find(
			([, body]) =>
				(body as {specificationKey: string}).specificationKey === key
		);

	return call?.[1] as Record<string, unknown> | undefined;
}

describe('[CLIENT-ACTIONS-SOLUTIONPUBLISH] SolutionPublish', () => {
	beforeEach(() => {
		vi.mocked(HeadlessCommerceAdminCatalog.createProductSpecification, {
			partial: true,
		}).mockImplementation(async (id, body) => ({...body, id: Number(id)}));
		vi.mocked(
			HeadlessCommerceAdminCatalog.createVirtualProduct
		).mockImplementation(async () => createProduct());
	});

	afterEach(() => {
		vi.resetAllMocks();
		vi.restoreAllMocks();
	});

	it('collects every failed step into one thrown error while the other steps still run', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});

		vi.mocked(
			HeadlessCommerceAdminCatalog.addOrUpdateProductImageByExternalReferenceCode
		).mockRejectedValue(new Error('image failed'));
		vi.mocked(HeadlessCommerceAdminCatalog.createProductSpecification, {
			partial: true,
		}).mockImplementation(async (id, body) => {
			if (body.specificationKey === 'last-updated-by') {
				throw new Error('specification failed');
			}

			return {...body, id: Number(id)};
		});

		const context = createContext({
			header: {
				contentType: {
					content: {headerImages: [createImage('HEADER')]},
					type: 'upload-images',
				},
				description: '',
				title: '',
			},
		});

		const error = await new SolutionPublish(context)
			.sync({editorName: 'Ann', isDraft: false})
			.catch((caughtError) => caughtError);

		expect(error).toBeInstanceOf(Error);
		expect(error.message).toMatch(
			/^Unable to publish the solution because the following steps did not complete .*syncHeader.*, .*syncLastUpdatedBy$/
		);
		expect(error.message).not.toMatch(/syncDetails|syncCompanyProfile/);
		expect(getSpecificationValue('solution-contact-email')).toBeDefined();
		expect(getSpecificationValue('solution-details-blocks')).toBeDefined();
	});

	it('creates a draft virtual product with the solution categories, uploads the profile icon, and deletes removed images', async () => {
		const context = createContext({
			profile: {
				...createContext().profile,
				file: {
					changed: false,
					file: new File(['a'], 'icon.png'),
					fileName: 'icon.png',
					uploaded: true,
				} as UploadedFile,
			},
		});

		const product = await new SolutionPublish(context).sync({
			editorName: 'Ann',
			isDraft: true,
		});

		expect(
			HeadlessCommerceAdminCatalog.createVirtualProduct
		).toHaveBeenCalledWith({
			catalogId: 5,
			categories: [
				{id: 11, name: 'category'},
				{id: 21, name: 'solution'},
				{id: 13, name: 'tag'},
			],
			description: 'Profile description',
			name: 'Solution',
			productStatus: 2,
			workflowStatusInfo: 2,
		});
		expect(
			HeadlessCommerceAdminCatalog.updateProduct
		).not.toHaveBeenCalled();
		expect(context._product).toBe(product);
		expect(getImageCalls()).toEqual([
			{
				attachment: 'YQ==',
				galleryEnabled: false,
				neverExpire: true,
				priority: 0,
				tags: ['solution-profile-app-icon'],
				title: {en_US: 'icon.png'},
			},
		]);
		expect(
			HeadlessCommerceAdminCatalog.deleteAttachmentByExternalReferenceCode
		).toHaveBeenCalledWith('OLD_IMAGE');
	});

	it('maps the detail block files to their IDs and offsets their image priority by the header image count', async () => {
		const context = createContext({
			details: [
				{
					content: {description: 'Text', title: 'Title'},
					type: 'text-block',
				},
				{
					content: {
						description: 'Images',
						files: [createImage('DETAIL')],
						title: 'Images',
					},
					type: 'text-images-block',
				},
			],
			header: {
				contentType: {
					content: {
						headerImages: [
							createImage('HEADER_1'),
							createImage('HEADER_2'),
						],
					},
					type: 'upload-images',
				},
				description: 'Header description',
				title: 'Header title',
			},
		});

		await new SolutionPublish(context).sync({
			editorName: 'Ann',
			isDraft: false,
		});

		expect(
			getImageCalls().map(({externalReferenceCode, priority, tags}) => ({
				externalReferenceCode,
				priority,
				tags,
			}))
		).toEqual([
			{
				externalReferenceCode: 'HEADER_1',
				priority: 1,
				tags: ['solution-header'],
			},
			{
				externalReferenceCode: 'HEADER_2',
				priority: 2,
				tags: ['solution-header'],
			},
			{
				externalReferenceCode: 'DETAIL',
				priority: 3,
				tags: ['solution-details'],
			},
		]);
		expect(
			JSON.parse(
				(
					getSpecificationValue('solution-details-blocks')?.value as {
						en_US: string;
					}
				).en_US
			)
		).toEqual([
			{
				content: {description: 'Text', title: 'Title'},
				type: 'text-block',
			},
			{
				content: {
					description: 'Images',
					files: ['DETAIL'],
					title: 'Images',
				},
				type: 'text-images-block',
			},
		]);
	});

	it('records the last updated by specification as hidden with the editor name and user ID', async () => {
		await new SolutionPublish(createContext()).sync({
			editorName: 'Ann',
			isDraft: false,
		});

		expect(getSpecificationValue('last-updated-by')).toEqual({
			label: {en_US: 'Last Updated By'},
			specificationKey: 'last-updated-by',
			value: {en_US: JSON.stringify({name: 'Ann', userId: '42'})},
			visible: false,
		});
	});

	it('updates an existing product as pending and skips an unchanged uploaded profile icon', async () => {
		const existingProduct = createProduct();

		const context = createContext({
			_product: existingProduct,
			profile: {
				...createContext().profile,
				file: {
					changed: false,
					file: new File(['a'], 'icon.png'),
					fileName: 'icon.png',
					uploaded: true,
				} as UploadedFile,
			},
		});

		await expect(
			new SolutionPublish(context).sync({
				editorName: 'Ann',
				isDraft: false,
			})
		).resolves.toBe(existingProduct);
		expect(
			HeadlessCommerceAdminCatalog.createVirtualProduct
		).not.toHaveBeenCalled();
		expect(HeadlessCommerceAdminCatalog.updateProduct).toHaveBeenCalledWith(
			10,
			{
				categories: [
					{id: 11, name: 'category'},
					{id: 21, name: 'solution'},
					{id: 13, name: 'tag'},
				],
				description: {en_US: 'Profile description'},
				name: {en_US: 'Solution'},
				productStatus: 1,
				workflowStatusInfo: 1,
			}
		);
		expect(getImageCalls()).toEqual([]);
	});

	it('uploads a changed profile icon for an existing product', async () => {
		const context = createContext({
			_product: createProduct(),
			profile: {
				...createContext().profile,
				file: {
					changed: true,
					file: new File(['a'], 'icon.png'),
					fileName: 'icon.png',
					uploaded: true,
				} as UploadedFile,
			},
		});

		await new SolutionPublish(context).sync({
			editorName: 'Ann',
			isDraft: false,
		});

		expect(getImageCalls()).toEqual([
			expect.objectContaining({
				priority: 0,
				tags: ['solution-profile-app-icon'],
			}),
		]);
	});

	it('writes the video specifications and uploads no header images for an embedded video header', async () => {
		const context = createContext({
			header: {
				contentType: {
					content: {headerVideoUrl: 'https://video.example.com'},
					type: 'embed-video-url',
				},
				description: 'Header description',
				title: 'Header title',
			},
		});

		await new SolutionPublish(context).sync({
			editorName: 'Ann',
			isDraft: false,
		});

		expect(
			getSpecificationValue('solution-header-video-url')?.value
		).toEqual({en_US: 'https://video.example.com'});
		expect(
			getSpecificationValue('solution-header-video-description')
		).toBeUndefined();
		expect(getSpecificationValue('solution-header-title')?.value).toEqual({
			en_US: 'Header title',
		});
		expect(getImageCalls()).toEqual([]);
	});
});
