/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {usePlacedOrder} from '~/hooks/usePlacedOrder';
import {Liferay} from '~/services/liferay/liferay';

import PurchaseCompleted from './PurchaseCompleted';

import type {DeliveryProduct} from '~/types/product';

const mocks = vi.hoisted(() => ({
	completeCloudApp: vi.fn(),
	useSWR: vi.fn(),
}));

vi.mock('swr', () => ({
	default: mocks.useSWR,
}));

vi.mock('~/hooks/usePlacedOrder', () => ({
	usePlacedOrder: vi.fn(),
}));

vi.mock(
	'~/pages/ProductPurchase/components/ProductPurchaseHeaderCards/ProductPurchaseHeaderCards',
	() => ({
		default: () => null,
	})
);

vi.mock('~/services/spring-boot/CommerceOrders', () => ({
	default: {completeCloudApp: mocks.completeCloudApp},
}));

vi.mock('~/utils/siteUtils', () => ({
	getSiteURL: () => '/web/one',
}));

const applicationURL =
	'/web/one/my-account#/project/one-time-purchases/applications/PRDCT-TEST';

function getProduct(specifications: [string, string][]) {
	return {
		externalReferenceCode: 'PRDCT-TEST',
		name: 'Test App',
		productSpecifications: specifications.map(
			([specificationKey, value]) => ({specificationKey, value})
		),
	} as unknown as DeliveryProduct;
}

function renderPurchaseCompleted(product: DeliveryProduct) {
	return render(
		<MemoryRouter initialEntries={['/?orderId=36188500']}>
			<PurchaseCompleted product={product} />
		</MemoryRouter>
	);
}

describe('[ROUTE-PRODUCT-PURCHASE-COMPLETED] PurchaseCompleted', () => {
	beforeEach(() => {
		mocks.completeCloudApp.mockResolvedValue(undefined);
		mocks.useSWR.mockReturnValue({data: {taxId: ''}, isLoading: false});
		vi.mocked(usePlacedOrder).mockReturnValue({
			data: {accountId: 7, paymentStatus: 'paid'},
			isLoading: false,
		} as unknown as ReturnType<typeof usePlacedOrder>);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('sends a paid app to its download tab', () => {
		const navigate = vi.spyOn(Liferay.Util, 'navigate');

		renderPurchaseCompleted(
			getProduct([
				['price-model', 'Paid'],
				['type', 'dxp'],
			])
		);

		fireEvent.click(
			screen.getByRole('button', {name: 'Continue to Download'})
		);

		expect(navigate).toHaveBeenCalledWith(`${applicationURL}?tab=download`);
	});

	it('sends a free app to its download tab', () => {
		const navigate = vi.spyOn(Liferay.Util, 'navigate');

		renderPurchaseCompleted(
			getProduct([
				['price-model', 'Free'],
				['type', 'client-extension'],
			])
		);

		fireEvent.click(
			screen.getByRole('button', {name: 'Continue to Download'})
		);

		expect(navigate).toHaveBeenCalledWith(`${applicationURL}?tab=download`);
	});

	it.each(['Free', 'Paid'])(
		'sends a %s cloud app to its activation tab',
		(priceModel) => {
			const navigate = vi.spyOn(Liferay.Util, 'navigate');

			renderPurchaseCompleted(
				getProduct([
					['price-model', priceModel],
					['type', 'cloud'],
				])
			);

			fireEvent.click(
				screen.getByRole('button', {name: 'Continue to Install'})
			);

			expect(navigate).toHaveBeenCalledWith(
				`${applicationURL}?tab=activation`
			);
		}
	);

	it('keeps sending the free DXP tier to its activation key', () => {
		const navigate = vi.spyOn(Liferay.Util, 'navigate');

		renderPurchaseCompleted(
			getProduct([
				['price-model', 'Free'],
				['solution-type', 'dxp'],
				['type', 'dxp'],
			])
		);

		fireEvent.click(screen.getByRole('button', {name: 'Activation Key'}));

		expect(navigate).toHaveBeenCalledWith(
			'/web/one/my-account#/project/one-time-purchases/products/PRDCT-TEST?tab=activation'
		);
	});
});
