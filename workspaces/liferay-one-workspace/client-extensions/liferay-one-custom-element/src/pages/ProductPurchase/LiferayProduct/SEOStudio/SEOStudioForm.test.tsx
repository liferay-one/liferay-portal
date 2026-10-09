/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useProductPurchaseLayoutContext} from '~/pages/ProductPurchase/components/ProductPurchaseLayout/ProductPurchaseLayout';
import HeadlessCommerceDeliveryOrder from '~/services/headless/HeadlessCommerceDeliveryOrder';
import {Liferay} from '~/services/liferay/liferay';

import SEOStudioForm from './SEOStudioForm';

const {ProductPurchaseSEOStudio, handlePurchase, setForm} = vi.hoisted(() => {
	const setForm = vi.fn();

	return {
		ProductPurchaseSEOStudio: vi.fn(function (this: {setForm: unknown}) {
			this.setForm = setForm;
		}),
		handlePurchase: vi.fn(),
		setForm,
	};
});

vi.mock('@hookform/resolvers/zod', () => ({
	zodResolver: () => async (values: unknown) => ({errors: {}, values}),
}));

vi.mock('~/components/EmptyState/EmptyState', () => ({
	default: ({title}: {title: string}) => (
		<div data-testid="not-eligible">{title}</div>
	),
}));

vi.mock(
	'~/pages/ProductPurchase/LiferayProduct/AIHub/AIHubForm/AIHubForm',
	() => ({
		PURPOSE_OPTIONS: [],
	})
);

vi.mock(
	'~/pages/ProductPurchase/components/ProductPurchaseLayout/ProductPurchaseLayout',
	() => ({
		useProductPurchaseLayoutContext: vi.fn(),
	})
);

vi.mock('~/pages/ProductPurchase/context/AppPurchaseContext', () => ({
	useAppPurchaseContext: () => ({
		salesforceProject: {
			externalReferenceCode: 'PRJCT-1',
			name: 'Acme Project',
		},
	}),
}));

vi.mock('~/pages/ProductPurchase/hooks/useCommerceRegions', () => ({
	default: () => ({data: {items: []}}),
}));

vi.mock('~/services/commerce/ProductPurchaseSEOStudio', () => ({
	ProductPurchaseSEOStudio,
}));

const product = {
	productSpecifications: [
		{specificationKey: 'solution-type', value: 'seo-studio'},
	],
};

const selectedAccount = {id: 7, name: 'Acme'};

function toAIHubOrder(code: number, salesforceProjectId: string) {
	return {
		customFields: {
			'order-metadata': JSON.stringify({
				aiHubAccountEntryId: 4321,
				aiHubForm: {aiHubAccountName: 'Acme AI Hub'},
				salesforceProjectId,
			}),
		},
		orderStatusInfo: {code},
		orderTypeExternalReferenceCode: 'AI_HUB',
	};
}

function mockPlacedOrders(items: unknown[]) {
	return vi
		.spyOn(HeadlessCommerceDeliveryOrder, 'getPlacedOrders')
		.mockResolvedValue({items} as unknown as Awaited<
			ReturnType<typeof HeadlessCommerceDeliveryOrder.getPlacedOrders>
		>);
}

async function submitForm() {
	render(
		<MemoryRouter>
			<SEOStudioForm />
		</MemoryRouter>
	);

	const sendRequestButton = screen.getByRole('button', {
		name: 'Send Request',
	});

	await waitFor(() => expect(sendRequestButton).toBeEnabled());

	fireEvent.click(sendRequestButton);
}

describe('[FLOW-SEO-STUDIO-SIGNUP] SEOStudioForm AI Hub eligibility gate', () => {
	const commerceContext = {...Liferay.CommerceContext};

	beforeEach(() => {
		vi.clearAllMocks();

		Liferay.CommerceContext.commerceChannelId = '42';

		vi.mocked(useProductPurchaseLayoutContext).mockReturnValue({
			actions: {previousStep: vi.fn()},
			handlePurchase,
			product,
			selectedAccount,
		} as unknown as ReturnType<typeof useProductPurchaseLayoutContext>);
	});

	afterEach(() => {
		Liferay.CommerceContext = {...commerceContext};

		vi.restoreAllMocks();
	});

	it('refuses the submit with the not eligible view when the account has no AI Hub order', async () => {
		const getPlacedOrders = mockPlacedOrders([]);

		await submitForm();

		expect(await screen.findByTestId('not-eligible')).toHaveTextContent(
			'SEO&AEO Studio Beta Is Available Only for AI Hub Customers'
		);
		expect(
			screen.queryByRole('button', {name: 'Send Request'})
		).not.toBeInTheDocument();
		expect(handlePurchase).not.toHaveBeenCalled();
		expect(ProductPurchaseSEOStudio).not.toHaveBeenCalled();

		const [channelId, accountId, params] = getPlacedOrders.mock.calls[0];

		expect(channelId).toBe('42');
		expect(accountId).toBe(7);
		expect(params?.get('filter')).toBe(
			"orderTypeExternalReferenceCode eq 'AI_HUB'"
		);
		expect(params?.get('pageSize')).toBe('-1');
	});

	it('refuses the submit when the AI Hub order of the project is not completed', async () => {
		mockPlacedOrders([toAIHubOrder(1, 'PRJCT-1')]);

		await submitForm();

		expect(await screen.findByTestId('not-eligible')).toBeInTheDocument();
		expect(handlePurchase).not.toHaveBeenCalled();
	});

	it('refuses the submit when the AI Hub order belongs to another project', async () => {
		mockPlacedOrders([toAIHubOrder(0, 'PRJCT-2')]);

		await submitForm();

		expect(await screen.findByTestId('not-eligible')).toBeInTheDocument();
		expect(handlePurchase).not.toHaveBeenCalled();
	});

	it('places the SEO Studio purchase when the project holds a provisioned AI Hub order', async () => {
		mockPlacedOrders([toAIHubOrder(0, 'PRJCT-1')]);

		await submitForm();

		await waitFor(() => expect(handlePurchase).toHaveBeenCalledTimes(1));

		expect(ProductPurchaseSEOStudio).toHaveBeenCalledWith(
			selectedAccount,
			product
		);
		expect(setForm).toHaveBeenCalledWith(
			expect.objectContaining({
				salesforceProjectId: 'PRJCT-1',
				salesforceProjectName: 'Acme Project',
			})
		);
		expect(screen.queryByTestId('not-eligible')).not.toBeInTheDocument();
	});
});
