/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceAdminCatalog from '~/services/headless/HeadlessCommerceAdminCatalog';
import HeadlessCommerceAdminPricing from '~/services/headless/HeadlessCommerceAdminPricing';
import {
	ProductLicense,
	ProductSpecificationKey,
	ProductType,
	ProductWorkflowStatusCode,
} from '~/utils/productUtils';

import AppPublish from './AppPublish';
import PublisherAsset from './PublisherAsset';

import type {NewAppInitialState} from '~/context/NewAppContextProvider';
import type {Product} from '~/types/product';

const {publisherAssetProcess} = vi.hoisted(() => ({
	publisherAssetProcess: vi.fn(),
}));

vi.mock('~/services/headless/HeadlessCommerceAdminCatalog', () => ({
	default: {
		addOrUpdateProductImageByExternalReferenceCode: vi.fn(),
		createProductOption: vi.fn(),
		createProductSKU: vi.fn(),
		createProductSpecification: vi.fn(),
		createVirtualProduct: vi.fn(),
		deleteAttachmentByExternalReferenceCode: vi.fn(),
		getOptions: vi.fn(),
		getProductOptions: vi.fn(),
		updateProduct: vi.fn(),
		updateProductSpecification: vi.fn(),
	},
}));

vi.mock('~/services/headless/HeadlessCommerceAdminPricing', () => ({
	default: {
		createPriceEntry: vi.fn(),
		createPriceList: vi.fn(),
		deleteTierPrice: vi.fn(),
		getPriceListEntries: vi.fn(),
		getPriceLists: vi.fn(),
		getTierPricesByPriceEntryId: vi.fn(),
		updatePriceEntry: vi.fn(),
	},
}));

vi.mock('~/services/headless/HeadlessDelivery', () => ({
	default: {deleteDocument: vi.fn()},
}));

vi.mock('~/services/headless/HeadlessPublisherAsset', () => ({
	default: {deletePublisherAsset: vi.fn()},
}));

vi.mock('./PublisherAsset', () => ({
	default: vi.fn(function PublisherAssetMock() {
		return {process: publisherAssetProcess};
	}),
}));

const catalog = vi.mocked(HeadlessCommerceAdminCatalog);
const pricing = vi.mocked(HeadlessCommerceAdminPricing);

function createContext(overrides: Record<string, unknown> = {}) {
	return {
		_product: createProduct(),
		build: {
			appType: ProductType.DXP,
			liferayPackages: [],
			resourceRequirements: {cpu: '2', ram: '4'},
		},
		catalog: {id: 10, name: 'Acme'},
		licensing: {licenseType: '', prices: {}},
		pricing: {priceModel: 'Paid'},
		profile: {
			areas: [{name: 'Area', value: '31'}],
			categories: undefined,
			description: 'New description',
			file: undefined,
			name: 'New name',
			tags: [],
		},
		references: {
			buildsToDelete: [],
			imagesToDelete: [],
			vocabulariesAndCategories: {},
		},
		storefront: {images: [], video: {description: '', videoURL: ''}},
		support: {email: 'support@acme.com'},
		version: {notes: 'Notes', version: '1.0.0'},
		...overrides,
	} as unknown as NewAppInitialState;
}

function createProduct(overrides: Partial<Product> = {}) {
	return {
		categories: [],
		description: {en_US: 'Old description'},
		externalReferenceCode: 'PRDCT-1',
		id: 2,
		name: {en_US: 'Old name'},
		productId: 1,
		productOptions: [],
		productSpecifications: [],
		skus: [],
		...overrides,
	} as unknown as Product;
}

function createSKU(id: number, value: string) {
	return {
		externalReferenceCode: `SKU-${value}`,
		id,
		sku: value,
		skuOptions: [{key: ProductLicense.DXP, value}],
	};
}

function getCreatedSpecificationKeys() {
	return catalog.createProductSpecification.mock.calls.map(
		([, body]) => (body as {specificationKey: string}).specificationKey
	);
}

describe('[CLIENT-ACTIONS-APPPUBLISH] AppPublish', () => {
	beforeEach(() => {
		catalog.createProductSpecification.mockImplementation(
			async (_productId, body) =>
				({
					...(body as object),
					id: 900,
				}) as never
		);
		pricing.getPriceListEntries.mockResolvedValue({items: []} as never);
		pricing.getPriceLists.mockResolvedValue({items: []} as never);
		publisherAssetProcess.mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	it('adds CPU and RAM specifications for a cloud app build', async () => {
		const appPublish = new AppPublish(
			createContext({
				build: {
					appType: ProductType.CLOUD,
					liferayPackages: [],
					resourceRequirements: {cpu: '2', ram: '4'},
				},
			})
		);

		await appPublish.syncBuild(createProduct());

		expect(catalog.createProductSpecification.mock.calls).toEqual([
			[
				1,
				{
					specificationKey: ProductSpecificationKey.APP_TYPE,
					value: {en_US: ProductType.CLOUD},
				},
			],
			[
				1,
				{
					specificationKey:
						ProductSpecificationKey.APP_BUILD_NUMBER_OF_CPUS,
					value: {en_US: '2'},
				},
			],
			[
				1,
				{
					specificationKey:
						ProductSpecificationKey.APP_BUILD_RAM_IN_GBS,
					value: {en_US: '4'},
				},
			],
		]);
	});

	it('adds only the app type specification for a non cloud app build', async () => {
		const appPublish = new AppPublish(createContext());

		await appPublish.syncBuild(createProduct());

		expect(getCreatedSpecificationKeys()).toEqual([
			ProductSpecificationKey.APP_TYPE,
		]);
	});

	it('creates the product option, then the SKUs, then the prices when licensing is set', async () => {
		const product = createProduct();

		catalog.getOptions.mockResolvedValue({
			items: [
				{id: 4, key: ProductLicense.BASE, name: 'Base'},
				{
					actions: {},
					externalReferenceCode: 'OPTION-DXP',
					id: 5,
					key: ProductLicense.DXP,
					name: 'DXP',
				},
			],
		} as never);
		catalog.createProductOption.mockResolvedValue({
			items: [
				{
					id: 50,
					productOptionValues: [
						{id: 61, name: {en_US: 'standard'}},
						{id: 62, name: {en_US: 'trial'}},
					],
				},
			],
		} as never);
		catalog.createProductSKU
			.mockResolvedValueOnce(createSKU(70, 'standard') as never)
			.mockResolvedValueOnce(createSKU(71, 'trial') as never);
		pricing.createPriceList.mockResolvedValue({id: 80} as never);

		const appPublish = new AppPublish(
			createContext({
				_product: product,
				licensing: {
					licenseType: 'Perpetual',
					prices: {USD: {standard: {1: 100, 10: 90}}},
				},
			})
		);

		await appPublish.syncLicensing(product);

		expect(catalog.createProductOption).toHaveBeenCalledWith(
			[{id: 5, key: ProductLicense.DXP, name: 'DXP', optionId: 5}],
			1
		);
		expect(catalog.createProductSKU.mock.calls).toEqual([
			[
				{
					neverExpire: true,
					published: true,
					purchasable: true,
					sku: 'standard',
					skuOptions: [{key: 50, value: 61}],
				},
				1,
			],
			[
				{
					neverExpire: true,
					published: true,
					purchasable: true,
					sku: 'trial',
					skuOptions: [{key: 50, value: 62}],
				},
				1,
			],
		]);
		expect(pricing.createPriceList).toHaveBeenCalledWith({
			active: true,
			catalogId: 10,
			currencyCode: 'USD',
			name: 'Acme USD Price List',
			type: 'price-list',
		});
		expect(pricing.createPriceEntry).toHaveBeenCalledTimes(1);
		expect(pricing.createPriceEntry).toHaveBeenCalledWith(
			{
				hasTierPrice: true,
				price: 100,
				priceListId: 80,
				sku: 'standard',
				skuExternalReferenceCode: 'SKU-standard',
				skuId: 70,
				tierPrices: [
					{
						active: true,
						minimumQuantity: 1,
						neverExpire: true,
						price: 100,
						priceEntryId: 0,
					},
					{
						active: true,
						minimumQuantity: 10,
						neverExpire: true,
						price: 90,
						priceEntryId: 0,
					},
				],
			},
			80
		);

		const [optionOrder] =
			catalog.createProductOption.mock.invocationCallOrder;
		const [skuOrder] = catalog.createProductSKU.mock.invocationCallOrder;
		const [priceListOrder] = pricing.getPriceLists.mock.invocationCallOrder;

		expect(optionOrder).toBeLessThan(skuOrder);
		expect(skuOrder).toBeLessThan(priceListOrder);
		expect(getCreatedSpecificationKeys()).toEqual([
			ProductSpecificationKey.APP_LICENSING_TYPE,
		]);
	});

	it('does nothing for licensing when no license type is set', async () => {
		const appPublish = new AppPublish(createContext());

		await appPublish.syncLicensing(createProduct());

		expect(catalog.createProductSpecification).not.toHaveBeenCalled();
		expect(catalog.getOptions).not.toHaveBeenCalled();
		expect(pricing.getPriceLists).not.toHaveBeenCalled();
	});

	it('does not update the price entry when the tier prices are unchanged', async () => {
		pricing.getPriceLists.mockResolvedValue({
			items: [{catalogId: 10, currencyCode: 'USD', id: 80}],
		} as never);
		pricing.getPriceListEntries.mockResolvedValue({
			items: [
				{
					price: 100,
					priceEntryId: 300,
					product: {id: 2},
					sku: {id: 70},
				},
			],
		} as never);
		pricing.getTierPricesByPriceEntryId.mockResolvedValue({
			items: [
				{id: 1, minimumQuantity: 1, price: 100},
				{id: 2, minimumQuantity: 10, price: 90},
			],
		} as never);

		const appPublish = new AppPublish(
			createContext({
				_product: createProduct({
					skus: [createSKU(70, 'standard')] as never,
				}),
				licensing: {
					licenseType: 'Perpetual',
					prices: {USD: {standard: {1: 100, 10: 90}}},
				},
			})
		);

		await appPublish.updatePrices();

		expect(pricing.createPriceList).not.toHaveBeenCalled();
		expect(pricing.getTierPricesByPriceEntryId).toHaveBeenCalledWith(300);
		expect(pricing.deleteTierPrice).not.toHaveBeenCalled();
		expect(pricing.updatePriceEntry).not.toHaveBeenCalled();
		expect(pricing.createPriceEntry).not.toHaveBeenCalled();
	});

	it('excludes trial SKUs from the price entries query', async () => {
		const appPublish = new AppPublish(
			createContext({
				_product: createProduct({
					skus: [
						createSKU(70, 'standard'),
						createSKU(71, 'trial'),
					] as never,
				}),
				licensing: {
					licenseType: 'Perpetual',
					prices: {USD: {standard: {1: 100}}},
				},
			})
		);

		pricing.createPriceList.mockResolvedValue({id: 80} as never);

		await appPublish.updatePrices();

		const [, searchParams] = pricing.getPriceListEntries.mock.calls[0];

		expect(pricing.getPriceListEntries.mock.calls[0][0]).toBe(80);
		expect((searchParams as URLSearchParams).get('filter')).toContain('70');
		expect((searchParams as URLSearchParams).get('filter')).not.toContain(
			'71'
		);
	});

	it('runs every step after a failed step, collects the failed step names, and skips updateProduct', async () => {
		publisherAssetProcess.mockRejectedValue(new Error('upload failed'));
		catalog.getOptions.mockRejectedValue(new Error('options failed'));
		vi.spyOn(console, 'error').mockImplementation(() => {});

		const appPublish = new AppPublish(
			createContext({
				build: {
					appType: ProductType.DXP,
					liferayPackages: [
						{
							file: [{id: 1}],
							id: 'PKG-1',
							uploaded: false,
							versions: ['7.4'],
						},
					],
					resourceRequirements: {},
				},
				licensing: {licenseType: 'Perpetual', prices: {}},
			})
		);

		const error = await appPublish
			.sync({isDraft: false, properties: {} as never})
			.catch((caughtError) => caughtError);

		expect(error).toBeInstanceOf(Error);
		expect(error.message).toMatch(
			/did not complete .*syncBuild, .*syncLicensing$/
		);
		expect(getCreatedSpecificationKeys()).toEqual(
			expect.arrayContaining([
				ProductSpecificationKey.APP_LICENSING_TYPE,
				ProductSpecificationKey.APP_PRICING_MODEL,
				ProductSpecificationKey.APP_SUPPORT_EMAIL,
				ProductSpecificationKey.APP_VERSION,
				ProductSpecificationKey.APP_VERSION_NOTES,
			])
		);
		expect(catalog.updateProduct).not.toHaveBeenCalled();
	});

	it('skips the build step in edit mode', async () => {
		const appPublish = new AppPublish(
			createContext({
				build: {
					appType: ProductType.CLOUD,
					liferayPackages: [
						{
							file: [{id: 1}],
							id: 'PKG-1',
							uploaded: false,
							versions: ['7.4'],
						},
					],
					resourceRequirements: {cpu: '2', ram: '4'},
				},
			})
		);

		await appPublish.sync({
			isDraft: false,
			isEdit: true,
			properties: {} as never,
		});

		expect(PublisherAsset).not.toHaveBeenCalled();
		expect(getCreatedSpecificationKeys()).not.toContain(
			ProductSpecificationKey.APP_TYPE
		);
		expect(catalog.updateProduct).toHaveBeenCalledTimes(1);
	});

	it('uploads unuploaded packages and sets their sorted unique Liferay versions with exact match', async () => {
		const product = createProduct({
			productSpecifications: [
				{
					id: 11,
					specificationKey: ProductSpecificationKey.LIFERAY_VERSION,
					value: {en_US: '7.3'},
				},
			],
		} as never);

		const appPublish = new AppPublish(
			createContext({
				build: {
					appType: ProductType.DXP,
					liferayPackages: [
						{
							file: [{id: 1}],
							id: 'PKG-1',
							uploaded: false,
							versions: ['7.4', '7.3'],
						},
						{
							file: [{id: 2}],
							id: 'PKG-2',
							uploaded: true,
							versions: ['7.2'],
						},
						{
							file: [{id: 3}],
							id: 'PKG-3',
							uploaded: false,
							versions: ['7.4'],
						},
					],
					resourceRequirements: {},
				},
			})
		);

		await appPublish.processLiferayPackages(product);

		expect(PublisherAsset).toHaveBeenCalledTimes(2);
		expect(PublisherAsset).toHaveBeenCalledWith(
			[{id: 1}],
			'PKG-1',
			product,
			{},
			'7.4,7.3'
		);
		expect(catalog.createProductSpecification.mock.calls).toEqual([
			[
				1,
				{
					specificationKey: ProductSpecificationKey.LIFERAY_VERSION,
					value: {en_US: '7.4'},
				},
			],
		]);
		expect(catalog.updateProductSpecification).not.toHaveBeenCalled();
	});

	it('updates the product with the profile values and the draft or pending status after every step succeeds', async () => {
		const appPublish = new AppPublish(createContext());

		await appPublish.sync({isDraft: true, properties: {} as never});

		await new AppPublish(createContext()).sync({
			isDraft: false,
			properties: {} as never,
		});

		expect(catalog.updateProduct.mock.calls).toEqual([
			[
				1,
				{
					categories: [{id: 31, name: 'Area'}],
					description: {en_US: 'New description'},
					name: {en_US: 'New name'},
					productStatus: ProductWorkflowStatusCode.DRAFT,
					workflowStatusInfo: ProductWorkflowStatusCode.DRAFT,
				},
			],
			[
				1,
				{
					categories: [{id: 31, name: 'Area'}],
					description: {en_US: 'New description'},
					name: {en_US: 'New name'},
					productStatus: ProductWorkflowStatusCode.PENDING,
					workflowStatusInfo: ProductWorkflowStatusCode.PENDING,
				},
			],
		]);
	});

	it('updates only the changed tier prices, keeping the IDs of the matching quantities and deleting the removed ones', async () => {
		pricing.getPriceLists.mockResolvedValue({
			items: [
				{catalogId: 99, currencyCode: 'USD', id: 79},
				{catalogId: 10, currencyCode: 'USD', id: 80},
			],
		} as never);
		pricing.getPriceListEntries.mockResolvedValue({
			items: [
				{
					price: 100,
					priceEntryId: 301,
					product: {id: 999},
					sku: {id: 70},
				},
				{
					price: 100,
					priceEntryId: 300,
					product: {id: 2},
					sku: {id: 70},
				},
			],
		} as never);
		pricing.getTierPricesByPriceEntryId.mockResolvedValue({
			items: [
				{
					externalReferenceCode: 'TIER-1',
					id: 1,
					minimumQuantity: 1,
					price: 100,
				},
				{
					externalReferenceCode: 'TIER-5',
					id: 2,
					minimumQuantity: 5,
					price: 95,
				},
			],
		} as never);

		const appPublish = new AppPublish(
			createContext({
				_product: createProduct({
					skus: [createSKU(70, 'standard')] as never,
				}),
				licensing: {
					licenseType: 'Perpetual',
					prices: {USD: {standard: {1: 100, 10: 90}}},
				},
			})
		);

		await appPublish.updatePrices();

		expect(pricing.getPriceListEntries.mock.calls[0][0]).toBe(80);
		expect(pricing.getTierPricesByPriceEntryId).toHaveBeenCalledWith(300);
		expect(pricing.deleteTierPrice).toHaveBeenCalledTimes(1);
		expect(pricing.deleteTierPrice).toHaveBeenCalledWith(2);
		expect(pricing.updatePriceEntry).toHaveBeenCalledWith(
			{
				price: 100,
				priceEntryId: 300,
				product: {id: 2},
				sku: {id: 70},
				tierPrices: [
					{
						active: true,
						externalReferenceCode: 'TIER-1',
						id: 1,
						minimumQuantity: 1,
						neverExpire: true,
						price: 100,
						priceEntryId: 300,
					},
					{
						active: true,
						minimumQuantity: 10,
						neverExpire: true,
						price: 90,
						priceEntryId: 300,
					},
				],
			},
			300
		);
		expect(pricing.createPriceEntry).not.toHaveBeenCalled();
	});

	it('throws when the product has no product option to create SKUs from', async () => {
		catalog.getOptions.mockResolvedValue({items: []} as never);
		catalog.getProductOptions.mockResolvedValue({items: []} as never);

		const appPublish = new AppPublish(
			createContext({licensing: {licenseType: 'Perpetual', prices: {}}})
		);

		await expect(appPublish.syncLicensing(createProduct())).rejects.toThrow(
			'product 1 has no product option'
		);
		expect(catalog.getProductOptions).toHaveBeenCalledWith(1);
		expect(catalog.createProductSKU).not.toHaveBeenCalled();
	});
});
