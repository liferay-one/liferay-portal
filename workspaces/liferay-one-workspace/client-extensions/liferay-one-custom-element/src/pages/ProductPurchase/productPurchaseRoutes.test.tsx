/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {Suspense} from 'react';
import {MemoryRouter, useRoutes} from 'react-router-dom';
import {describe, expect, it, vi} from 'vitest';
import i18n from '~/i18n';
import {toRouteObjects} from '~/utils/routeUtils';

import {
	getProductPurchaseSteps,
	toStepItems,
	toStepRoutes,
} from './productPurchaseRoutes';

import type {DeliveryProduct} from '~/types/product';

vi.mock('./AccountSelection/AccountSelection', () => ({
	default: () => 'AccountSelection page',
}));
vi.mock('./Solution/Solution', () => ({default: () => 'Solution page'}));

function solutionProduct(solutionType?: string) {
	return {
		categories: [
			{name: 'solution', vocabulary: 'Marketplace Product Type'},
		],
		productSpecifications: solutionType
			? [{specificationKey: 'solution-type', value: solutionType}]
			: [],
	} as unknown as DeliveryProduct;
}

function solutionTypeProduct(solutionType: string) {
	return {
		categories: [{name: 'app', vocabulary: 'Marketplace Product Type'}],
		productSpecifications: [
			{specificationKey: 'solution-type', value: solutionType},
		],
	} as unknown as DeliveryProduct;
}

function stepKeys(steps: ReturnType<typeof getProductPurchaseSteps>) {
	return toStepItems(steps).map(({key}) => key);
}

function StepRoutesUnderTest({product}: {product: DeliveryProduct}) {
	return useRoutes(
		toRouteObjects(
			toStepRoutes(getProductPurchaseSteps({isPaidApp: false, product}))
		)
	);
}

function renderAt(pathname: string, product: DeliveryProduct) {
	return render(
		<MemoryRouter initialEntries={[pathname]}>
			<Suspense fallback={null}>
				<StepRoutesUnderTest product={product} />
			</Suspense>
		</MemoryRouter>
	);
}

describe('productPurchaseRoutes', () => {
	describe('[ROUTE-PRODUCT-PURCHASE-SOLUTION] solution', () => {
		it('emits the account step then the solution form step for a solution product', () => {
			const steps = getProductPurchaseSteps({
				isPaidApp: true,
				product: solutionProduct(),
			});

			expect(
				steps.map(({index, path, title}) => ({index, path, title}))
			).toEqual([
				{
					index: true,
					path: undefined,
					title: i18n.translate('account'),
				},
				{
					index: undefined,
					path: 'solution',
					title: i18n.translate('form'),
				},
			]);
		});

		it('keeps the solution steps when the product also carries a solution type', () => {
			const steps = getProductPurchaseSteps({
				isDXPFreeOnly: true,
				isLDP: true,
				isPaidApp: true,
				product: solutionProduct('ai-hub'),
			});

			expect(steps.map(({path}) => path)).toEqual([
				undefined,
				'solution',
			]);
		});

		it('does not emit the solution step for a product that is not a solution', () => {
			const steps = getProductPurchaseSteps({
				isPaidApp: true,
				product: {
					categories: [
						{name: 'app', vocabulary: 'Marketplace Product Type'},
					],
					productSpecifications: [],
				} as unknown as DeliveryProduct,
			});

			expect(steps.map(({path}) => path)).not.toContain('solution');
		});

		it('builds the step items keyed by route', () => {
			expect(
				toStepItems(
					getProductPurchaseSteps({
						isPaidApp: false,
						product: solutionProduct(),
					})
				)
			).toEqual([
				{key: '/', title: i18n.translate('account')},
				{key: '/solution', title: i18n.translate('form')},
			]);
		});

		it('renders AccountSelection at the index', async () => {
			renderAt('/', solutionProduct());

			expect(
				await screen.findByText('AccountSelection page')
			).toBeInTheDocument();
		});

		it('renders the Solution page for the solution step', async () => {
			renderAt('/solution', solutionProduct());

			expect(
				await screen.findByText('Solution page')
			).toBeInTheDocument();
		});
	});

	describe('[ROUTE-PRODUCT-PURCHASE-AI-HUB-FORM] ai-hub', () => {
		it('emits the account step then the AI Hub form step', () => {
			expect(
				toStepItems(
					getProductPurchaseSteps({
						isPaidApp: true,
						product: solutionTypeProduct('ai-hub'),
					})
				)
			).toEqual([
				{key: '/', title: i18n.translate('account')},
				{key: '/ai-hub-form', title: i18n.translate('ai-hub')},
			]);
		});
	});

	describe('ai-hub-open-beta', () => {
		it('[ROUTE-PRODUCT-PURCHASE-AI-HUB-OPEN-BETA-FORM] [ROUTE-PRODUCT-PURCHASE-CONTRACT] [ROUTE-PRODUCT-PURCHASE-PROJECT] [ROUTE-PRODUCT-PURCHASE-SUMMARY] emits the account, project, contract, form, and summary steps', () => {
			expect(
				toStepItems(
					getProductPurchaseSteps({
						isPaidApp: true,
						product: solutionTypeProduct('ai-hub-open-beta'),
					})
				)
			).toEqual([
				{key: '/', title: i18n.translate('account')},
				{key: '/project', title: i18n.translate('project')},
				{key: '/contract', title: i18n.translate('contract')},
				{
					key: '/ai-hub-open-beta-form',
					title: i18n.translate('account-details'),
				},
				{key: '/summary', title: i18n.translate('summary')},
			]);
		});
	});

	describe('[ROUTE-PRODUCT-PURCHASE-DSR-FORM] dsr', () => {
		it('emits the account step then the Digital Sales Room form step', () => {
			expect(
				toStepItems(
					getProductPurchaseSteps({
						isPaidApp: true,
						product: solutionTypeProduct('dsr'),
					})
				)
			).toEqual([
				{key: '/', title: i18n.translate('account')},
				{
					key: '/dsr-form',
					title: i18n.translate('digital-sales-room'),
				},
			]);
		});
	});

	describe('lr-tokens', () => {
		it('[ROUTE-PRODUCT-PURCHASE-PAYMENT-METHOD] [ROUTE-PRODUCT-PURCHASE-SUMMARY] emits the token, payment method, and summary steps', () => {
			expect(
				toStepItems(
					getProductPurchaseSteps({
						isPaidApp: true,
						product: solutionTypeProduct('lr-tokens'),
					})
				)
			).toEqual([
				{key: '/', title: i18n.translate('tokens-amount')},
				{
					key: '/payment-method',
					title: i18n.translate('payment-method'),
				},
				{key: '/summary', title: i18n.translate('summary')},
			]);
		});
	});

	describe('[ROUTE-PRODUCT-PURCHASE-SEO-STUDIO-FORM] seo-studio', () => {
		it('[ROUTE-PRODUCT-PURCHASE-PROJECT] emits the account, project, and request access steps', () => {
			expect(
				toStepItems(
					getProductPurchaseSteps({
						isPaidApp: true,
						product: solutionTypeProduct('seo-studio'),
					})
				)
			).toEqual([
				{key: '/', title: i18n.translate('account')},
				{
					key: '/project',
					title: i18n.translate('project-selection'),
				},
				{
					key: '/seo-studio-form',
					title: i18n.translate('request-access'),
				},
			]);
		});
	});

	describe('default', () => {
		it('[ROUTE-PRODUCT-PURCHASE-SUMMARY] emits the account and summary steps for a free app', () => {
			expect(
				stepKeys(
					getProductPurchaseSteps({
						isPaidApp: false,
						product: solutionTypeProduct('other'),
					})
				)
			).toEqual(['/', '/summary']);
		});

		it('emits the same steps without a product', () => {
			expect(
				stepKeys(getProductPurchaseSteps({isPaidApp: false}))
			).toEqual(['/', '/summary']);
		});

		it('[ROUTE-PRODUCT-PURCHASE-LICENSE] [ROUTE-PRODUCT-PURCHASE-PAYMENT-METHOD] adds the license and payment method steps for a paid app', () => {
			expect(
				stepKeys(getProductPurchaseSteps({isPaidApp: true}))
			).toEqual(['/', '/license', '/payment-method', '/summary']);
		});

		it('[ROUTE-PRODUCT-PURCHASE-PROVISIONING] adds the provisioning step for LDP', () => {
			expect(
				stepKeys(
					getProductPurchaseSteps({isLDP: true, isPaidApp: true})
				)
			).toEqual([
				'/',
				'/license',
				'/payment-method',
				'/provisioning',
				'/summary',
			]);
		});

		it('[ROUTE-PRODUCT-PURCHASE-ACTIVATION-KEY-FORM] swaps the summary step for the activation key step for DXP free', () => {
			expect(
				stepKeys(
					getProductPurchaseSteps({
						isDXPFreeOnly: true,
						isPaidApp: false,
					})
				)
			).toEqual(['/', '/activation-key-form']);
		});
	});
});
