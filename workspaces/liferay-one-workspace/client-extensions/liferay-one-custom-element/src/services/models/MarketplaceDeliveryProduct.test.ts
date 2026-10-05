/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';
import i18n from '~/i18n';

import {MarketplaceDeliveryProduct} from './MarketplaceDeliveryProduct';

import type {ConsoleUserProject} from '~/services/spring-boot/types';
import type {DeliveryProduct} from '~/types/product';

function createProduct(
	specifications: Record<string, string> = {},
	product: Record<string, unknown> = {}
) {
	return new MarketplaceDeliveryProduct({
		categories: [],
		images: [],
		productSpecifications: Object.entries(specifications).map(
			([specificationKey, value]) => ({specificationKey, value})
		),
		skus: [],
		...product,
	} as unknown as DeliveryProduct);
}

function createProject({
	cpu = 4,
	environments = 2,
	instance = 1,
	memory = 8500,
}: {
	cpu?: number;
	environments?: number;
	instance?: number;
	memory?: number;
} = {}) {
	return {
		environments: new Array(environments).fill({}),
		rootProjectPlanUsage: {
			cpu: {free: cpu},
			instance: {free: instance},
			memory: {free: memory},
		},
	} as unknown as ConsoleUserProject;
}

describe('[CLIENT-MODELS-MARKETPLACEDELIVERYPRODUCT] MarketplaceDeliveryProduct', () => {
	it('labels the app type from the type specification', () => {
		expect(createProduct({type: 'cloud'}).appType).toBe('Cloud');
		expect(createProduct({type: 'dxp'}).appType).toBe('DXP');
	});

	it('falls back to the product type category and then the raw type', () => {
		expect(
			createProduct(
				{type: 'unknown'},
				{
					categories: [
						{name: 'Other Vocabulary', vocabulary: 'tags'},
						{
							name: 'Theme',
							vocabulary: 'Marketplace-Product-Type',
						},
					],
				}
			).appType
		).toBe('Theme');
		expect(createProduct({type: 'unknown'}).appType).toBe('unknown');
	});

	it('defaults the app version to 1.0.0', () => {
		expect(createProduct().appVersion).toBe('1.0.0');
		expect(createProduct({'latest-version': '2.1.0'}).appVersion).toBe(
			'2.1.0'
		);
	});

	it('returns Free for a free price model in any case', () => {
		const skus = [{price: {priceFormatted: '$10'}, purchasable: true}];

		expect(createProduct({}, {skus}).getPrice()).toBe('Free');
		expect(createProduct({'price-model': 'FREE'}, {skus}).getPrice()).toBe(
			'Free'
		);
	});

	it('returns the formatted price of the purchasable SKU by ERC or the first one', () => {
		const product = createProduct(
			{'price-model': 'Paid'},
			{
				skus: [
					{
						externalReferenceCode: 'HIDDEN',
						price: {priceFormatted: '$1'},
						purchasable: false,
					},
					{
						externalReferenceCode: 'FIRST',
						price: {priceFormatted: '$10'},
						purchasable: true,
					},
					{
						externalReferenceCode: 'SECOND',
						price: {priceFormatted: '$20'},
						purchasable: true,
					},
				],
			}
		);

		expect(product.getPrice()).toBe('$10');
		expect(product.getPrice(null)).toBe('$10');
		expect(product.getPrice('SECOND')).toBe('$20');
		expect(product.getPrice('HIDDEN')).toBeUndefined();
		expect(product.getPurchasableSKUs()).toHaveLength(2);
	});

	it('excludes priority 0 images', () => {
		expect(
			createProduct(
				{},
				{
					images: [
						{priority: 0, src: 'icon.png'},
						{priority: 1, src: 'first.png'},
						{priority: 2, src: 'second.png'},
					],
				}
			).getProductImages()
		).toEqual(['first.png', 'second.png']);
	});

	it('chooses the option key by app type', () => {
		expect(createProduct({type: 'cloud'}).getProductOptionKey()).toBe(
			'cloud-license-usage-type'
		);
		expect(createProduct({type: 'dxp'}).getProductOptionKey()).toBe(
			'dxp-license-usage-type'
		);
		expect(
			createProduct({type: 'client-extension'}).getProductOptionKey()
		).toBe('base-license-usage-type');
	});

	it('labels the product resources with zero defaults', () => {
		expect(createProduct().getProductResourceLabel()).toBe(
			'0CPUs, 0GB RAM'
		);
		expect(
			createProduct({cpu: '2', ram: '4'}).getProductResourceLabel()
		).toBe('2CPUs, 4GB RAM');
	});

	it('labels the cloud resources of a project with floored values', () => {
		const product = createProduct();

		expect(
			product.getCloudResourceLabel(
				undefined as unknown as ConsoleUserProject
			)
		).toBe('');
		expect(
			product.getCloudResourceLabel(
				createProject({cpu: 3.7, environments: 2, memory: 8500})
			)
		).toBe(`2 ${i18n.translate('environment')}, 3 CPUs, 8 GB RAM`);
		expect(
			product.getCloudResourceLabel(
				createProject({cpu: 0, environments: 1, memory: 0})
			)
		).toBe(`1 ${i18n.translate('environment')}, 0 CPUs, 0 GB RAM`);
	});

	it('returns the product type icon and label', () => {
		expect(createProduct({type: 'cloud'}).getProductType()).toEqual({
			icon: 'cloud',
			label: 'cloud App',
			type: 'cloud',
		});
		expect(createProduct({type: 'dxp'}).getProductType().icon).toBe(
			'site-template'
		);
		expect(createProduct({type: 'other'}).getProductType().icon).toBe(
			'cog'
		);
	});

	it('checks the instance, CPU, and floored RAM against the project plan usage', () => {
		const product = createProduct({cpu: '2', ram: '8'});

		expect(
			product.hasEnoughResources(
				undefined as unknown as ConsoleUserProject
			)
		).toBe(false);
		expect(product.hasEnoughResources(createProject({instance: 0}))).toBe(
			false
		);
		expect(product.hasEnoughResources(createProject({cpu: 1}))).toBe(false);
		expect(product.hasEnoughResources(createProject({memory: 7999}))).toBe(
			false
		);
		expect(
			product.hasEnoughResources(createProject({cpu: 2, memory: 8000}))
		).toBe(true);
	});

	it('reads the license type flags and the solution categories', () => {
		const product = createProduct(
			{'license-type': 'Perpetual'},
			{
				categories: [
					{
						name: 'Analytics',
						vocabulary: 'marketplace-solution-category',
					},
				],
			}
		);

		expect(product.getLicenseTagText()).toBe('One-Time');
		expect(product.isPerpetualLicense).toBe(true);
		expect(product.getSolutionCategories()).toEqual([
			{name: 'Analytics', vocabulary: 'marketplace-solution-category'},
		]);
		expect(createProduct().getLicenseTagText()).toBe('');
		expect(createProduct().isPerpetualLicense).toBe(false);
	});
});
