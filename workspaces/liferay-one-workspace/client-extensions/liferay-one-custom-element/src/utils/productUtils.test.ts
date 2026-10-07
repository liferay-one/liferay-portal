/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {
	getAdminProductSpecificationValue,
	getAiHubTier,
	getAiHubTierSKU,
	getAiHubTierSKUs,
	getLRTokenSKUs,
	getNormalizedSKUOptions,
	getOfferingTypes,
	getProductCategoriesByVocabularyName,
	getProductFallback,
	getProductPriceModel,
	getProductSpecificationValue,
	getProductSpecificationValues,
	getProductType,
	getSkuByOptionValueKey,
	isContactSalesProduct,
	isDXPFreeTierProduct,
	isLDPProduct,
	isLRTokensProduct,
	isSEOStudioProduct,
	isTrialSKU,
} from './productUtils';

import type {
	DeliveryProduct,
	DeliverySKU,
	ProductCategories,
	ProductSpecification,
	SKU,
} from '~/types/product';

function toDeliverySKU(
	externalReferenceCode: string,
	skuOptions: [string, string][],
	{price = 0, purchasable = true, sku = externalReferenceCode} = {}
) {
	return {
		externalReferenceCode,
		price: {price, priceFormatted: ''},
		purchasable,
		sku,
		skuOptions: skuOptions.map(([skuOptionKey, skuOptionValueKey]) => ({
			skuOptionKey,
			skuOptionValueKey,
		})),
	} as DeliverySKU;
}

function toProduct(
	specifications: [string, string][],
	skus: DeliverySKU[] = []
) {
	return {
		productSpecifications: specifications.map(
			([specificationKey, value]) => ({specificationKey, value})
		),
		skus,
	} as unknown as DeliveryProduct;
}

function toSKU(sku: string, skuOptions: unknown[] = []) {
	return {sku, skuOptions} as SKU;
}

describe('[MOD-PRODUCTUTILS] productUtils', () => {
	describe('specification getters', () => {
		const product = toProduct([
			['category', 'Commerce'],
			['category', 'Search'],
			['empty', ''],
			['type', 'dxp'],
		]);

		it('returns the first value of a specification', () => {
			expect(getProductSpecificationValue('category', product)).toBe(
				'Commerce'
			);
		});

		it('returns the default value for a missing or empty specification', () => {
			expect(getProductSpecificationValue('missing', product)).toBe('');
			expect(
				getProductSpecificationValue('missing', product, 'fallback')
			).toBe('fallback');
			expect(getProductSpecificationValue('empty', product, 'none')).toBe(
				'none'
			);
		});

		it('returns every value of a specification', () => {
			expect(getProductSpecificationValues('category', product)).toEqual([
				'Commerce',
				'Search',
			]);
			expect(
				getProductSpecificationValues('category', {} as DeliveryProduct)
			).toEqual([]);
		});

		it('reads the en_US value of an admin specification', () => {
			const productSpecifications = [
				{specificationKey: 'latest-version', value: {en_US: '1.2'}},
			] as ProductSpecification[];

			expect(
				getAdminProductSpecificationValue(
					'latest-version',
					productSpecifications
				)
			).toBe('1.2');
			expect(
				getAdminProductSpecificationValue('latest-version', undefined)
			).toBeUndefined();
		});

		it('filters category names by vocabulary', () => {
			expect(
				getProductCategoriesByVocabularyName(
					[
						{
							name: 'Commerce',
							vocabulary: 'Marketplace App Category',
						},
						{name: 'DXP', vocabulary: 'Marketplace Product Type'},
					] as ProductCategories[],
					'App-Category'
				)
			).toEqual(['Commerce']);
		});
	});

	describe('isTrialSKU', () => {
		it('detects a trial SKU by the ts suffix or the trial name', () => {
			expect(isTrialSKU(toSKU('APP123TS'))).toBe(true);
			expect(isTrialSKU(toSKU('Trial'))).toBe(true);
		});

		it('detects a trial SKU by a trial or yes option', () => {
			expect(
				isTrialSKU(toSKU('APP1', [{key: 'trial', value: 'Yes'}]))
			).toBe(true);
			expect(
				isTrialSKU(
					toSKU('APP1', [
						{
							skuOptionKey: 'dxp-license-usage-type',
							skuOptionValueKey: 'trial',
						},
					])
				)
			).toBe(true);
		});

		it('is false for any other SKU', () => {
			expect(
				isTrialSKU(toSKU('APP1S', [{key: 'tier', value: 'standard'}]))
			).toBe(false);
		});
	});

	describe('getNormalizedSKUOptions', () => {
		it('normalizes delivery options to the admin shape', () => {
			expect(
				getNormalizedSKUOptions(
					toSKU('APP1', [
						{skuOptionKey: 'tier', skuOptionValueKey: 'standard'},
						{key: 'color', value: 'red'},
					])
				)
			).toEqual([
				{key: 'tier', value: 'standard'},
				{key: 'color', value: 'red'},
			]);
		});

		it('returns an empty list without options', () => {
			expect(
				getNormalizedSKUOptions({sku: 'APP1'} as unknown as SKU)
			).toEqual([]);
		});
	});

	describe('getSkuByOptionValueKey', () => {
		it('needs a purchasable SKU with a license usage option of the key', () => {
			const unpurchasableSKU = toDeliverySKU(
				'UNPURCHASABLE',
				[['dxp-license-usage-type', 'standard']],
				{purchasable: false}
			);
			const otherOptionSKU = toDeliverySKU('OTHER', [
				['color', 'standard'],
			]);
			const standardSKU = toDeliverySKU('STANDARD', [
				['cloud-license-usage-type', 'standard'],
			]);

			const product = toProduct(
				[],
				[unpurchasableSKU, otherOptionSKU, standardSKU]
			);

			expect(getSkuByOptionValueKey(product, 'standard')).toBe(
				standardSKU
			);
			expect(
				getSkuByOptionValueKey(product, 'developer')
			).toBeUndefined();
		});
	});

	describe('product types', () => {
		it('returns offering types per app type', () => {
			expect(getOfferingTypes('cloud')).toEqual(['Liferay SaaS']);
			expect(getOfferingTypes('dxp')).toEqual([
				'Liferay PaaS',
				'Liferay Self-Hosted',
			]);
			expect(getOfferingTypes('client-extension')).toHaveLength(3);
		});

		it('reads the app type and price model', () => {
			expect(getProductType(toProduct([['type', 'cloud']]))).toEqual({
				isCloud: true,
				isDXP: false,
			});
			expect(
				getProductPriceModel(toProduct([['price-model', 'Paid']]))
			).toEqual({isFreeApp: false, isPaidApp: true, priceModel: 'paid'});
		});

		it('decides contact sales for CMP, DSR, and LDP solutions', () => {
			for (const solutionType of [
				'cmp',
				'dsr',
				'liferay-data-platform',
			]) {
				expect(
					isContactSalesProduct(
						toProduct([['solution-type', solutionType]])
					)
				).toBe(true);
			}

			expect(
				isContactSalesProduct(toProduct([['solution-type', 'ai-hub']]))
			).toBe(false);
		});

		it('detects LDP and SEO Studio products', () => {
			expect(
				isLDPProduct(
					toProduct([['solution-type', 'liferay-data-platform']])
				)
			).toBe(true);
			expect(
				isSEOStudioProduct(toProduct([['solution-type', 'seo-studio']]))
			).toBe(true);
			expect(isSEOStudioProduct(undefined)).toBe(false);
		});

		it('is a DXP free tier product only for the dxp solution type', () => {
			expect(
				isDXPFreeTierProduct(toProduct([['solution-type', 'dxp']]))
			).toBe(true);
			expect(
				isDXPFreeTierProduct(
					toProduct([
						['price-model', 'Free'],
						['type', 'dxp'],
					])
				)
			).toBe(false);
			expect(
				isDXPFreeTierProduct(
					toProduct([['solution-type', 'seo-studio']])
				)
			).toBe(false);
		});
	});

	describe('AI Hub SKUs', () => {
		const studioSKU = toDeliverySKU('STUDIO', [['tier', 'studio']], {
			price: 500,
		});
		const activateSKU = toDeliverySKU('ACTIVATE', [['tier', 'activate']], {
			price: 100,
		});
		const unpurchasableSKU = toDeliverySKU(
			'UNPURCHASABLE',
			[['tier', 'activate']],
			{purchasable: false}
		);
		const tokens100SKU = toDeliverySKU('T100', [['pack', '100-tokens']], {
			sku: 'AIHUB-100',
		});
		const tokens20SKU = toDeliverySKU('T20', [['pack', '20-tokens']], {
			sku: 'AIHUB-20',
		});

		const product = toProduct(
			[],
			[
				studioSKU,
				unpurchasableSKU,
				tokens100SKU,
				activateSKU,
				tokens20SKU,
			]
		);

		it('reads the tier of a SKU', () => {
			expect(getAiHubTier(studioSKU)).toBe('studio');
			expect(getAiHubTier(tokens20SKU)).toBeUndefined();
			expect(getAiHubTier(undefined)).toBeUndefined();
		});

		it('filters tier SKUs by purchasable and sorts them by price', () => {
			expect(getAiHubTierSKUs(product)).toEqual([activateSKU, studioSKU]);
		});

		it('finds a tier SKU by reference and falls back to the first', () => {
			expect(getAiHubTierSKU(product, 'STUDIO')).toBe(studioSKU);
			expect(getAiHubTierSKU(product, 'MISSING')).toBe(activateSKU);
		});

		it('keeps the purchasable SKUs with a token block size and sorts them by size', () => {
			expect(
				getLRTokenSKUs(
					product,
					new Map([
						['T100', 100],
						['T20', 20],
						['UNPURCHASABLE', 10],
					])
				)
			).toEqual([
				{...tokens20SKU, tokenBlockSize: 20},
				{...tokens100SKU, tokenBlockSize: 100},
			]);
		});

		it('drops a SKU whose token block size is zero', () => {
			expect(
				getLRTokenSKUs(
					product,
					new Map([
						['T100', 0],
						['T20', 20],
					])
				)
			).toEqual([{...tokens20SKU, tokenBlockSize: 20}]);
		});
	});

	describe('isLRTokensProduct', () => {
		it('matches only the lr-tokens solution type', () => {
			expect(
				isLRTokensProduct(toProduct([['solution-type', 'lr-tokens']]))
			).toBe(true);
			expect(
				isLRTokensProduct(toProduct([['solution-type', 'ai-hub']]))
			).toBe(false);
			expect(isLRTokensProduct(toProduct([]))).toBe(false);
		});
	});

	describe('getProductFallback', () => {
		it('returns a stable fallback object', () => {
			const productFallback = getProductFallback();

			expect(productFallback).toEqual(getProductFallback());
			expect(productFallback).toMatchObject({
				externalReferenceCode: '--',
				id: 0,
				productId: 0,
				skus: [],
			});
		});
	});
});
