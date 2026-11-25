/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {ReactNode} from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useDeliveryProduct} from '~/hooks/useDeliveryProduct';
import {Liferay} from '~/services/liferay/liferay';

import AIHubUtilization from './AIHubUtilization';

type Column = {
	id: string;
	render?: (value: unknown, item: unknown) => ReactNode;
};

const {placedOrders} = vi.hoisted(() => ({
	placedOrders: [] as Record<string, unknown>[],
}));

vi.mock('~/components/DetailedCard/DetailedCard', () => ({
	DetailedCard: ({children}: {children: ReactNode}) => <div>{children}</div>,
}));

vi.mock('~/components/ListView/ListView', () => ({
	default: ({tableProps}: {tableProps: {columns: Column[]}}) => (
		<div>
			{placedOrders.map((placedOrder, index) => (
				<div key={index}>
					{tableProps.columns
						.filter(({id}) => id === 'placedOrderItems')
						.map(({id, render}) => (
							<span data-testid="tokens" key={id}>
								{render?.(placedOrder[id], placedOrder)}
							</span>
						))}
				</div>
			))}
		</div>
	),
}));

vi.mock('~/components/OrderStatus/OrderStatus', () => ({
	default: () => null,
}));

vi.mock('~/hooks/useAITokenBlockSizes', () => ({
	useAITokenBlockSizes: () => ({
		isLoading: false,
		tokenBlockSizes: new Map([['01tVO00000TVrlkYAD', 5000]]),
	}),
}));

vi.mock('~/hooks/useDeliveryProduct', () => ({
	useDeliveryProduct: vi.fn(),
}));

describe('[ROUTE-MY-ACCOUNT-PRODUCTERC] AIHubUtilization', () => {
	beforeEach(() => {
		Liferay.CommerceContext.account = {accountId: 1, accountName: 'Acme'};

		vi.mocked(useDeliveryProduct).mockReturnValue({
			data: {
				skus: [
					{
						externalReferenceCode: '01tVO00000TVrlkYAD',
						id: 30,
						sku: '5,000 LR TOKENS',
					},
				],
			},
			isLoading: false,
		} as unknown as ReturnType<typeof useDeliveryProduct>);

		placedOrders.length = 0;
	});

	it('finds the block size of a token order item by its SKU, whose code differs from its external reference code', () => {
		placedOrders.push({
			placedOrderItems: [
				{quantity: 2, sku: '5,000 LR TOKENS', skuId: 30},
			],
		});

		render(<AIHubUtilization productId={20} />);

		expect(useDeliveryProduct).toHaveBeenCalledWith('20');
		expect(screen.getByTestId('tokens').textContent).toBe(
			Intl.NumberFormat().format(10000)
		);
	});

	it('shows a dash for a token order item whose SKU has no block size', () => {
		placedOrders.push({
			placedOrderItems: [{quantity: 1, sku: 'OTHER', skuId: 99}],
		});

		render(<AIHubUtilization productId={20} />);

		expect(screen.getByTestId('tokens').textContent).toBe('-');
	});
});
