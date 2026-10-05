/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook, screen} from '@testing-library/react';
import {ReactNode} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {describe, expect, it, vi} from 'vitest';

import NewAppContextProvider, {
	AppActions,
	NewAppTypes,
	useNewAppContext,
} from './NewAppContextProvider';

import type {Product} from '~/types/product';

vi.mock('~/components/Loading/Loading', () => ({
	default: {
		FullScreen: () => <div data-testid="submission-loading" />,
		Page: () => <div data-testid="vocabularies-loading" />,
	},
}));

vi.mock('~/hooks/useGetVocabulariesAndCategories', () => ({
	useGetVocabulariesAndCategories: () => ({data: {}, isLoading: false}),
}));

vi.mock('./MarketplaceContextProvider', () => ({
	useMarketplaceContext: () => ({properties: {}}),
}));

const product = {
	categories: [
		{id: 11, name: 'custom-category', vocabulary: 'Marketplace-Category'},
		{id: 12, name: 'custom-area', vocabulary: 'marketplace-app-category'},
		{id: 13, name: 'custom-tag', vocabulary: 'marketplace-app-tags'},
	],
	description: {en_US: 'An app'},
	images: [
		{
			externalReferenceCode: 'IMG-ICON',
			src: 'https://example.com/icon.png',
			tags: ['app-icon'],
			title: {en_US: 'Icon'},
		},
		{
			externalReferenceCode: 'IMG-1',
			src: 'https://example.com/documents/screenshot.png?version=1',
			tags: [],
			title: {en_US: 'Screenshot'},
		},
	],
	name: {en_US: 'My App'},
	productSpecifications: [
		{specificationKey: 'type', value: {en_US: 'cloud'}},
		{specificationKey: 'cpu', value: {en_US: '2'}},
		{specificationKey: 'ram', value: {en_US: '4'}},
		{specificationKey: 'license-type', value: {en_US: 'Subscription'}},
		{specificationKey: 'price-model', value: {en_US: 'Paid'}},
		{
			specificationKey: 'app-storefront-video-url',
			value: {en_US: 'https://video'},
		},
		{
			specificationKey: 'support-email-address',
			value: {en_US: 'help@example.com'},
		},
		{specificationKey: 'latest-version', value: {en_US: '2.0'}},
	],
	thumbnail: '/thumbnail.png',
} as unknown as Product;

function renderNewAppContext() {
	return renderHook(() => useNewAppContext(), {
		wrapper: ({children}: {children: ReactNode}) => (
			<MemoryRouter>
				<NewAppContextProvider>{children}</NewAppContextProvider>
			</MemoryRouter>
		),
	});
}

function dispatchAction(
	result: ReturnType<typeof renderNewAppContext>['result'],
	action: AppActions
) {
	act(() => result.current[1](action));
}

describe('[CTX-NEWAPPCONTEXTPROVIDER] NewAppContextProvider', () => {
	it('maps a product into state on SET_CONTEXT', () => {
		const {result} = renderNewAppContext();

		dispatchAction(result, {
			payload: product,
			type: NewAppTypes.SET_CONTEXT,
		});

		const [state] = result.current;

		expect(state._product).toBe(product);
		expect(state.build.appType).toBe('cloud');
		expect(state.build.resourceRequirements).toEqual({cpu: '2', ram: '4'});
		expect(state.licensing.licenseType).toBe('Subscription');
		expect(state.pricing.priceModel).toBe('Paid');
		expect(state.profile.name).toBe('My App');
		expect(state.profile.description).toBe('An app');
		expect(state.profile.categories).toEqual({
			label: 'custom-category',
			name: 'custom-category',
			value: '11',
		});
		expect(state.profile.areas).toEqual([
			{label: 'custom-area', name: 'custom-area', value: '12'},
		]);
		expect(state.profile.tags).toEqual([
			{label: 'custom-tag', name: 'custom-tag', value: '13'},
		]);
		expect(state.profile.file).toEqual(
			expect.objectContaining({
				fileName: 'Icon',
				id: 'IMG-ICON',
				preview: '/thumbnail.png',
			})
		);
		expect(state.storefront.images).toEqual([
			expect.objectContaining({
				fileName: 'Screenshot',
				id: 'IMG-1',
				preview: '/documents/screenshot.png',
			}),
		]);
		expect(state.storefront.video.videoURL).toBe('https://video');
		expect(state.version.version).toBe('2.0');
	});

	it('falls back to empty strings for missing support specifications', () => {
		const {result} = renderNewAppContext();

		dispatchAction(result, {
			payload: product,
			type: NewAppTypes.SET_CONTEXT,
		});

		expect(result.current[0].support).toEqual({
			appUsageTermsURL: '',
			documentationURL: '',
			email: 'help@example.com',
			installationGuideURL: '',
			phone: '',
			publisherWebsiteURL: '',
			url: '',
		});
	});

	it('adds a price at the max key plus one for an existing tier', () => {
		const {result} = renderNewAppContext();

		dispatchAction(result, {
			payload: {currency: 'USD', licenseTier: 'standard'},
			type: NewAppTypes.SET_LICENSING_ADD_PRICE,
		});

		expect(result.current[0].licensing.prices.USD.standard).toEqual({
			1: 0,
			2: 0,
		});
	});

	it('adds a price at key 1 for an empty tier', () => {
		const {result} = renderNewAppContext();

		dispatchAction(result, {
			payload: {currency: 'EUR', licenseTier: 'standard'},
			type: NewAppTypes.SET_LICENSING_ADD_PRICE,
		});

		expect(result.current[0].licensing.prices.EUR.standard).toEqual({1: 0});
	});

	it('leaves the state unchanged when deleting a price for a missing currency or tier', () => {
		const {result} = renderNewAppContext();

		const [stateBefore] = result.current;

		dispatchAction(result, {
			payload: {currency: 'EUR', key: 1, licenseTier: 'standard'},
			type: NewAppTypes.SET_LICENSING_DELETE_PRICE,
		});

		dispatchAction(result, {
			payload: {currency: 'USD', key: 1, licenseTier: 'developer'},
			type: NewAppTypes.SET_LICENSING_DELETE_PRICE,
		});

		expect(result.current[0].licensing).toBe(stateBefore.licensing);
	});

	it('deletes a price key from an existing tier', () => {
		const {result} = renderNewAppContext();

		dispatchAction(result, {
			payload: {currency: 'USD', licenseTier: 'standard'},
			type: NewAppTypes.SET_LICENSING_ADD_PRICE,
		});

		dispatchAction(result, {
			payload: {currency: 'USD', key: 1, licenseTier: 'standard'},
			type: NewAppTypes.SET_LICENSING_DELETE_PRICE,
		});

		expect(result.current[0].licensing.prices.USD.standard).toEqual({
			2: 0,
		});
	});

	it('drops the currency key on SET_LICENSING_DELETE_CURRENCY', () => {
		const {result} = renderNewAppContext();

		dispatchAction(result, {
			payload: {currency: 'USD'},
			type: NewAppTypes.SET_LICENSING_DELETE_CURRENCY,
		});

		expect(result.current[0].licensing.prices).toEqual({});
	});

	it('moves a price to a new quantity key on SET_LICENSING_UPDATE_PRICES', () => {
		const {result} = renderNewAppContext();

		dispatchAction(result, {
			payload: {
				currency: 'USD',
				index: 1,
				licenseTier: 'standard',
				price: 99,
				quantity: 5,
			},
			type: NewAppTypes.SET_LICENSING_UPDATE_PRICES,
		});

		expect(result.current[0].licensing.prices.USD.standard).toEqual({
			5: 99,
		});
	});

	it('updates the price in place when the quantity matches the index', () => {
		const {result} = renderNewAppContext();

		dispatchAction(result, {
			payload: {
				currency: 'USD',
				index: 1,
				licenseTier: 'standard',
				price: 10,
				quantity: 1,
			},
			type: NewAppTypes.SET_LICENSING_UPDATE_PRICES,
		});

		expect(result.current[0].licensing.prices.USD.standard).toEqual({
			1: 10,
		});
	});

	it('touches only the product ID on SET_PRODUCT_ID', () => {
		const {result} = renderNewAppContext();

		const [stateBefore] = result.current;

		dispatchAction(result, {
			payload: 77,
			type: NewAppTypes.SET_PRODUCT_ID,
		});

		const [state] = result.current;

		expect(state.productId).toBe(77);
		expect(state.licensing).toBe(stateBefore.licensing);
		expect(state.profile).toBe(stateBefore.profile);
	});

	it('shows the submission overlay only after SET_LOADING', () => {
		const {result} = renderNewAppContext();

		expect(
			screen.queryByTestId('submission-loading')
		).not.toBeInTheDocument();

		const [stateBefore] = result.current;

		dispatchAction(result, {
			payload: true,
			type: NewAppTypes.SET_LOADING,
		});

		expect(screen.getByTestId('submission-loading')).toBeInTheDocument();
		expect(result.current[0].productId).toBe(stateBefore.productId);
		expect(result.current[0].profile).toBe(stateBefore.profile);
	});
});
