/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter, Route, Routes} from 'react-router';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useSubscriptionUpgradeLayoutContext} from '~/pages/ProductPurchase/SubscriptionUpgrade/components/SubscriptionUpgradeLayout/SubscriptionUpgradeLayout';
import useAccountAddresses from '~/pages/ProductPurchase/hooks/useAccountAddresses';
import {Liferay} from '~/services/liferay/liferay';

import SubscriptionUpgradeSummary from './SubscriptionUpgradeSummary';

vi.mock(
	'~/pages/ProductPurchase/SubscriptionUpgrade/components/SubscriptionUpgradeLayout/SubscriptionUpgradeLayout',
	() => ({
		useSubscriptionUpgradeLayoutContext: vi.fn(),
	})
);

vi.mock('~/pages/ProductPurchase/hooks/useAccountAddresses', () => ({
	default: vi.fn(),
}));

const exit = vi.fn();
const previousStep = vi.fn();

function mockAddresses(items: unknown[]) {
	vi.mocked(useAccountAddresses).mockReturnValue({
		data: {items},
		isLoading: false,
	} as unknown as ReturnType<typeof useAccountAddresses>);
}

async function clickModalButton(name: string) {
	await userEvent.click(screen.getByRole('button', {name: 'Continue'}));

	const modal = (await screen.findByText('Confirm Your Purchase')).closest(
		'.modal'
	) as HTMLElement;

	await userEvent.click(within(modal).getByRole('button', {name}));
}

function renderSummary(onConfirm = vi.fn()) {
	render(
		<MemoryRouter>
			<Routes>
				<Route
					element={
						<SubscriptionUpgradeSummary onConfirm={onConfirm}>
							<span>Cost Breakdown</span>
						</SubscriptionUpgradeSummary>
					}
					index
				/>

				<Route
					element={<span>Order Received</span>}
					path="order-received"
				/>
			</Routes>
		</MemoryRouter>
	);

	return onConfirm;
}

describe('SubscriptionUpgradeSummary', () => {
	beforeEach(() => {
		Liferay.Util.openToast = vi.fn();

		vi.mocked(useSubscriptionUpgradeLayoutContext).mockReturnValue({
			account: {defaultBillingAddressId: 2, id: 7},
			actions: {exit, previousStep},
		} as unknown as ReturnType<typeof useSubscriptionUpgradeLayoutContext>);

		mockAddresses([
			{city: 'Recife', id: 1, name: 'Other Address'},
			{city: 'Milan', id: 2, name: 'Default Address'},
		]);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders the default billing address, the payment agreement, and no payment method selector', () => {
		renderSummary();

		expect(screen.getByText('Default Address')).toBeInTheDocument();
		expect(screen.queryByText('Other Address')).not.toBeInTheDocument();
		expect(
			screen.getByText(
				'This transaction will be processed according to your active billing and payment agreement.'
			)
		).toBeInTheDocument();
		expect(screen.getByText('Cost Breakdown')).toBeInTheDocument();
		expect(screen.queryByText('Payment Method')).not.toBeInTheDocument();
	});

	it('submits nothing when the confirmation modal is cancelled', async () => {
		const onConfirm = renderSummary();

		await clickModalButton('Cancel');

		expect(onConfirm).not.toHaveBeenCalled();
		expect(screen.queryByText('Order Received')).not.toBeInTheDocument();
	});

	it('submits the order with the billing address and goes to the order received page', async () => {
		const onConfirm = renderSummary(
			vi.fn().mockResolvedValue({orderId: 99})
		);

		await clickModalButton('Continue');

		expect(onConfirm).toHaveBeenCalledWith(
			expect.objectContaining({id: 2, name: 'Default Address'})
		);

		await waitFor(() =>
			expect(screen.getByText('Order Received')).toBeInTheDocument()
		);
	});

	it('stays on the summary and reports the failure when the order is rejected', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});

		renderSummary(vi.fn().mockRejectedValue(new Error('Forbidden')));

		await clickModalButton('Continue');

		await waitFor(() => expect(Liferay.Util.openToast).toHaveBeenCalled());

		expect(screen.queryByText('Order Received')).not.toBeInTheDocument();
		expect(screen.getByText('Cost Breakdown')).toBeInTheDocument();
	});

	it('blocks the purchase when the account has no billing address', () => {
		mockAddresses([]);

		renderSummary();

		expect(screen.getByRole('button', {name: 'Continue'})).toBeDisabled();
	});

	it('leaves the flow through the back and cancel buttons', async () => {
		renderSummary();

		await userEvent.click(screen.getByRole('button', {name: 'Back'}));
		await userEvent.click(screen.getByRole('button', {name: 'Cancel'}));

		expect(previousStep).toHaveBeenCalled();
		expect(exit).toHaveBeenCalled();
	});
});
