/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter, Route, Routes} from 'react-router';
import {SWRConfig} from 'swr';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {SubscriptionUpgradeType} from '~/enums/SubscriptionUpgradeType';
import {useSubscriptionUpgrades} from '~/hooks/useSubscriptionUpgrades';
import {queryGraphQL} from '~/services/graphql/GraphQL';
import HeadlessAdminUser from '~/services/headless/HeadlessAdminUser';
import {Liferay} from '~/services/liferay/liferay';

import SubscriptionUpgradeLayout, {
	useSubscriptionUpgradeLayoutContext,
} from './SubscriptionUpgradeLayout';

import type {ProductPurchaseStepItem} from '~/pages/ProductPurchase/productPurchaseRoutes';
import type {DeliveryProduct} from '~/types/product';

vi.mock('~/hooks/useSubscriptionUpgrades', () => ({
	useSubscriptionUpgrades: vi.fn(),
}));

vi.mock('~/services/graphql/GraphQL', () => ({
	queryGraphQL: vi.fn(),
	toGraphQLString: (value: string) => JSON.stringify(value),
}));

vi.mock('~/services/headless/HeadlessAdminUser', () => ({
	default: {getAccount: vi.fn()},
}));

const product = {
	name: 'Content Marketing Platform',
	skus: [{price: {priceFormatted: '$10,000.00'}}],
} as unknown as DeliveryProduct;

const Step = () => {
	const {
		actions: {previousStep},
		subscriptionUpgrade,
	} = useSubscriptionUpgradeLayoutContext();

	return (
		<button onClick={previousStep}>{subscriptionUpgrade.type} step</button>
	);
};

function mockSubscriptionUpgrades(data: unknown[]) {
	vi.mocked(useSubscriptionUpgrades).mockReturnValue({
		data,
		isLoading: false,
	} as unknown as ReturnType<typeof useSubscriptionUpgrades>);
}

function renderLayout(
	steps: ProductPurchaseStepItem[] = [{key: '/', title: 'Summary'}]
) {
	return render(
		<SWRConfig value={{dedupingInterval: 0, provider: () => new Map()}}>
			<MemoryRouter>
				<Routes>
					<Route
						element={
							<SubscriptionUpgradeLayout
								product={product}
								steps={steps}
								type={SubscriptionUpgradeType.CMP_ADD_ON}
							/>
						}
					>
						<Route element={<Step />} index />
					</Route>
				</Routes>
			</MemoryRouter>
		</SWRConfig>
	);
}

describe('SubscriptionUpgradeLayout', () => {
	beforeEach(() => {
		window.history.replaceState(
			null,
			'',
			'?productId=42&projectExternalReferenceCode=PRJCT-1&upgradeType=cmp-add-on'
		);

		Liferay.CommerceContext.account = {
			accountId: 7,
			accountName: 'El Torero Spa',
		};
		Liferay.ThemeDisplay.getUserEmailAddress = () => 'test@liferay.com';
		Liferay.Util.navigate = vi.fn();

		vi.mocked(HeadlessAdminUser.getAccount).mockResolvedValue({
			id: 7,
			name: 'El Torero Spa',
		} as Awaited<ReturnType<typeof HeadlessAdminUser.getAccount>>);

		vi.mocked(queryGraphQL).mockResolvedValue({
			projects: {items: [{name: 'North America Enterprise'}]},
		});

		mockSubscriptionUpgrades([
			{
				contractEndDate: '2027-06-25',
				productExternalReferenceCode: 'PRDCT-DXP',
				targetProductId: 42,
				type: SubscriptionUpgradeType.CMP_ADD_ON,
			},
		]);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders the product, the account, the project, and the step for an eligible upgrade', async () => {
		renderLayout();

		expect(await screen.findByText('cmp-add-on step')).toBeInTheDocument();
		expect(
			screen.getByText('Content Marketing Platform')
		).toBeInTheDocument();
		expect(screen.getByText('$10,000.00')).toBeInTheDocument();
		expect(screen.getByText('El Torero Spa')).toBeInTheDocument();
		expect(
			await screen.findByText('North America Enterprise')
		).toBeInTheDocument();
	});

	it('requests the upgrades of the account project in the URL', async () => {
		renderLayout();

		await screen.findByText('cmp-add-on step');

		expect(useSubscriptionUpgrades).toHaveBeenCalledWith(7, 'PRJCT-1');
	});

	it('renders no step when the upgrade is not eligible', async () => {
		mockSubscriptionUpgrades([{type: SubscriptionUpgradeType.AI_HUB_TIER}]);

		renderLayout();

		expect(
			await screen.findByText('Upgrade Unavailable')
		).toBeInTheDocument();
		expect(screen.queryByText('cmp-add-on step')).not.toBeInTheDocument();
	});

	it('returns to the product details when going back from the first step', async () => {
		renderLayout();

		await userEvent.click(await screen.findByText('cmp-add-on step'));

		expect(Liferay.Util.navigate).toHaveBeenCalledWith(
			expect.stringContaining(
				'/my-account/#/project/PRJCT-1/products/PRDCT-DXP'
			)
		);
	});

	it('renders a standalone step without the product header and the steps', async () => {
		const {container} = renderLayout([
			{key: '/', standalone: true, title: 'Plan'},
			{key: '/summary', title: 'Summary'},
		]);

		expect(await screen.findByText('cmp-add-on step')).toBeInTheDocument();
		expect(screen.getByText('Go Back')).toBeInTheDocument();
		expect(
			container.querySelector('.subscription-upgrade-standalone')
		).toBeInTheDocument();
		expect(
			screen.queryByText('Content Marketing Platform')
		).not.toBeInTheDocument();
		expect(screen.queryByText('Summary')).not.toBeInTheDocument();
	});

	it('hides a standalone step from the steps of the other steps', async () => {
		window.history.replaceState(
			null,
			'',
			'?productId=42&projectExternalReferenceCode=PRJCT-1&upgradeType=cmp-add-on'
		);

		render(
			<SWRConfig value={{dedupingInterval: 0, provider: () => new Map()}}>
				<MemoryRouter initialEntries={['/summary']}>
					<Routes>
						<Route
							element={
								<SubscriptionUpgradeLayout
									product={product}
									steps={[
										{
											key: '/',
											standalone: true,
											title: 'Plan',
										},
										{key: '/summary', title: 'Summary'},
									]}
									type={SubscriptionUpgradeType.CMP_ADD_ON}
								/>
							}
						>
							<Route element={<Step />} path="summary" />
						</Route>
					</Routes>
				</MemoryRouter>
			</SWRConfig>
		);

		expect(await screen.findByText('cmp-add-on step')).toBeInTheDocument();
		expect(
			screen.getByText('Content Marketing Platform')
		).toBeInTheDocument();
		expect(screen.getByText('Summary')).toBeInTheDocument();
		expect(screen.queryByText('Plan')).not.toBeInTheDocument();
	});
});
