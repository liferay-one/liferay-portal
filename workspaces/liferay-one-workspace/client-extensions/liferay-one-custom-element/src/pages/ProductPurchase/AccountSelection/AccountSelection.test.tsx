/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {useNavigate} from 'react-router-dom';
import {SWRConfig} from 'swr';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useProductPurchaseLayoutContext} from '~/pages/ProductPurchase/components/ProductPurchaseLayout/ProductPurchaseLayout';
import HeadlessCommerceDeliveryOrder from '~/services/headless/HeadlessCommerceDeliveryOrder';
import {Liferay} from '~/services/liferay/liferay';

import AccountSelection from './AccountSelection';

const {navigate, nextStep, openModal} = vi.hoisted(() => ({
	navigate: vi.fn(),
	nextStep: vi.fn(),
	openModal: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => ({
	...(await importOriginal<typeof import('react-router-dom')>()),
	useNavigate: vi.fn(),
}));

vi.mock('~/components/AccountAvatar/AccountAvatar', () => ({
	default: () => null,
}));

vi.mock('~/components/Loading/Loading', () => ({
	default: {
		Page: () => <div data-testid="loading-page" />,
	},
}));

vi.mock(
	'~/pages/ProductPurchase/components/ProductPurchaseLayout/ProductPurchaseLayout',
	() => ({
		useProductPurchaseLayoutContext: vi.fn(),
	})
);

vi.mock('../components/CreateNewAccount/CreateNewAccount', () => ({
	default: () => null,
}));

vi.mock('../hooks/useSEOStudioRequirementsModal', () => ({
	useSEOStudioRequirementsModal: () => ({openModal}),
}));

const accounts = [
	{id: 7, name: 'Acme', type: 'business'},
	{id: 8, name: 'Globex', type: 'business'},
];

const seoStudioProduct = {
	productSpecifications: [
		{specificationKey: 'solution-type', value: 'seo-studio'},
	],
};

const steps = [
	{key: 'account-selection'},
	{key: 'project-selection'},
	{key: 'seo-studio-form'},
];

function mockLayoutContext({
	isSingleAccount = false,
	product = seoStudioProduct,
	selectedAccount = accounts[0],
}: {
	isSingleAccount?: boolean;
	product?: unknown;
	selectedAccount?: unknown;
} = {}) {
	vi.mocked(useProductPurchaseLayoutContext).mockReturnValue({
		accounts: isSingleAccount ? [accounts[0]] : accounts,
		actions: {nextStep},
		isLoadingAccounts: false,
		isSingleAccount,
		product,
		selectedAccount,
		setSelectedAccount: vi.fn(),
		steps,
	} as unknown as ReturnType<typeof useProductPurchaseLayoutContext>);
}

function mockPlacedOrders(items: unknown[]) {
	return vi
		.spyOn(HeadlessCommerceDeliveryOrder, 'getPlacedOrders')
		.mockResolvedValue({items} as unknown as Awaited<
			ReturnType<typeof HeadlessCommerceDeliveryOrder.getPlacedOrders>
		>);
}

function renderAccountSelection() {
	return render(
		<SWRConfig value={{dedupingInterval: 0, provider: () => new Map()}}>
			<AccountSelection />
		</SWRConfig>
	);
}

async function clickContinue() {
	const continueButton = await screen.findByRole('button', {
		name: 'Continue',
	});

	await waitFor(() => expect(continueButton).toBeEnabled());

	fireEvent.click(continueButton);
}

describe('[FLOW-SEO-STUDIO-SIGNUP] AccountSelection AI Hub eligibility gate', () => {
	const commerceContext = {...Liferay.CommerceContext};

	beforeEach(() => {
		vi.clearAllMocks();

		Liferay.CommerceContext.commerceChannelId = '42';

		vi.mocked(useNavigate).mockReturnValue(navigate);
	});

	afterEach(() => {
		Liferay.CommerceContext = {...commerceContext};

		vi.restoreAllMocks();
	});

	it('opens the requirements modal instead of advancing when the account has no AI Hub order', async () => {
		const getPlacedOrders = mockPlacedOrders([]);

		mockLayoutContext();

		renderAccountSelection();

		await clickContinue();

		expect(openModal).toHaveBeenCalledTimes(1);
		expect(nextStep).not.toHaveBeenCalled();

		const [channelId, accountId, params] = getPlacedOrders.mock.calls[0];

		expect(channelId).toBe('42');
		expect(accountId).toBe(7);
		expect(params?.get('filter')).toBe(
			"orderTypeExternalReferenceCode eq 'AI_HUB'"
		);
		expect(params?.get('pageSize')).toBe('1');
	});

	it('advances to the next step when the account holds an AI Hub order', async () => {
		mockPlacedOrders([{orderTypeExternalReferenceCode: 'AI_HUB'}]);

		mockLayoutContext();

		renderAccountSelection();

		await clickContinue();

		expect(nextStep).toHaveBeenCalledTimes(1);
		expect(openModal).not.toHaveBeenCalled();
	});

	it('keeps a single ineligible account on the account step without navigating', async () => {
		mockPlacedOrders([]);

		mockLayoutContext({isSingleAccount: true});

		renderAccountSelection();

		await clickContinue();

		expect(navigate).not.toHaveBeenCalled();
		expect(openModal).toHaveBeenCalledTimes(1);
		expect(nextStep).not.toHaveBeenCalled();
	});

	it('skips the account step for a single eligible account', async () => {
		mockPlacedOrders([{orderTypeExternalReferenceCode: 'AI_HUB'}]);

		mockLayoutContext({isSingleAccount: true});

		renderAccountSelection();

		await waitFor(() =>
			expect(navigate).toHaveBeenCalledWith('project-selection', {
				replace: true,
			})
		);

		expect(screen.getByTestId('loading-page')).toBeInTheDocument();
		expect(openModal).not.toHaveBeenCalled();
	});

	it('does not look up AI Hub orders for a product other than SEO Studio', async () => {
		const getPlacedOrders = mockPlacedOrders([]);

		mockLayoutContext({product: {productSpecifications: []}});

		renderAccountSelection();

		await clickContinue();

		expect(nextStep).toHaveBeenCalledTimes(1);
		expect(getPlacedOrders).not.toHaveBeenCalled();
		expect(openModal).not.toHaveBeenCalled();
	});
});
