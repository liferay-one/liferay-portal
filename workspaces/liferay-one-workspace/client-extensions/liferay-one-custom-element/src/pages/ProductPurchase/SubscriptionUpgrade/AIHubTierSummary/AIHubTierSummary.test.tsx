/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {ReactNode} from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {SubscriptionUpgradeType} from '~/enums/SubscriptionUpgradeType';
import {useSubscriptionUpgradeLayoutContext} from '~/pages/ProductPurchase/SubscriptionUpgrade/components/SubscriptionUpgradeLayout/SubscriptionUpgradeLayout';
import SubscriptionUpgradeSummary from '~/pages/ProductPurchase/SubscriptionUpgrade/components/SubscriptionUpgradeSummary/SubscriptionUpgradeSummary';
import useSubscriptionUpgradePricing from '~/pages/ProductPurchase/SubscriptionUpgrade/hooks/useSubscriptionUpgradePricing';
import SubscriptionUpgrades from '~/services/spring-boot/SubscriptionUpgrades';

import AIHubTierSummary from './AIHubTierSummary';

import type {Account} from '~/types/accounts';
import type {BillingAddress} from '~/types/orders';
import type {DeliveryProduct} from '~/types/product';
import type {
	SubscriptionUpgrade,
	SubscriptionUpgradePricing,
} from '~/types/subscriptionUpgrade';

vi.mock(
	'~/pages/ProductPurchase/SubscriptionUpgrade/components/AIHubCostBreakdown/AIHubCostBreakdown',
	() => ({
		default: () => <div>Cost Breakdown</div>,
	})
);

vi.mock(
	'~/pages/ProductPurchase/SubscriptionUpgrade/components/SubscriptionUpgradeLayout/SubscriptionUpgradeLayout',
	() => ({
		useSubscriptionUpgradeLayoutContext: vi.fn(),
	})
);

vi.mock(
	'~/pages/ProductPurchase/SubscriptionUpgrade/components/SubscriptionUpgradeSummary/SubscriptionUpgradeSummary',
	() => ({
		default: vi.fn(({children}: {children: ReactNode}) => (
			<div>{children}</div>
		)),
	})
);

vi.mock(
	'~/pages/ProductPurchase/SubscriptionUpgrade/hooks/useSubscriptionUpgradePricing',
	() => ({
		default: vi.fn(),
	})
);

vi.mock('~/services/spring-boot/SubscriptionUpgrades', () => ({
	default: {postOrder: vi.fn()},
}));

const pricing: SubscriptionUpgradePricing = {
	contractEndDate: '2027-06-10',
	currencyCode: 'USD',
	lineItems: [],
	remainingMonths: 9,
	termMonths: 12,
	tierChange: {
		creditForRemainingMonths: -4500,
		currentMonthlyPrice: 500,
		monthlyPriceDifference: 1000,
		newCostForRemainingMonths: 13500,
		newMonthlyPrice: 1500,
	},
	total: 9000,
};

const subscriptionUpgrade: SubscriptionUpgrade = {
	contractEndDate: '2027-06-10',
	currentTier: 'activate',
	productExternalReferenceCode: 'AI-HUB',
	targetProductId: 4321,
	targetTier: 'studio',
	type: SubscriptionUpgradeType.AI_HUB_TIER,
};

function mockContext(upgrade: SubscriptionUpgrade = subscriptionUpgrade) {
	vi.mocked(useSubscriptionUpgradeLayoutContext).mockReturnValue({
		account: {id: 7} as Account,
		actions: {exit: vi.fn(), nextStep: vi.fn(), previousStep: vi.fn()},
		product: {} as DeliveryProduct,
		projectExternalReferenceCode: 'PROJECT-1',
		subscriptionUpgrade: upgrade,
	});
}

function mockPricing(
	value: Partial<ReturnType<typeof useSubscriptionUpgradePricing>>
) {
	vi.mocked(useSubscriptionUpgradePricing).mockReturnValue({
		isLoading: false,
		...value,
	} as ReturnType<typeof useSubscriptionUpgradePricing>);
}

describe('AIHubTierSummary', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockContext();
	});

	it('renders the cost breakdown in the summary with the AI Hub confirm modal', () => {
		mockPricing({data: pricing});

		render(<AIHubTierSummary />);

		expect(screen.getByText('Cost Breakdown')).toBeInTheDocument();
		expect(vi.mocked(SubscriptionUpgradeSummary).mock.calls[0][0]).toEqual(
			expect.objectContaining({
				confirmPurchaseModalClassName: 'ai-hub-confirm-purchase-modal',
			})
		);
	});

	it('places the order for the project with the billing address', () => {
		mockPricing({data: pricing});

		render(<AIHubTierSummary />);

		vi.mocked(SubscriptionUpgradeSummary).mock.calls[0][0].onConfirm({
			id: 11,
		} as BillingAddress);

		expect(SubscriptionUpgrades.postOrder).toHaveBeenCalledWith({
			accountId: 7,
			billingAddressId: 11,
			projectExternalReferenceCode: 'PROJECT-1',
			type: SubscriptionUpgradeType.AI_HUB_TIER,
		});
	});

	it('shows the upgrade as unavailable without a tier change price', () => {
		mockPricing({data: {...pricing, tierChange: undefined}});

		render(<AIHubTierSummary />);

		expect(screen.getByText('Upgrade Unavailable')).toBeInTheDocument();
		expect(SubscriptionUpgradeSummary).not.toHaveBeenCalled();
	});

	it('asks the user to try again when the pricing fails', () => {
		mockPricing({error: new Error('500')});

		render(<AIHubTierSummary />);

		expect(screen.getByText('Try again later.')).toBeInTheDocument();
		expect(SubscriptionUpgradeSummary).not.toHaveBeenCalled();
	});

	it('shows the upgrade as unavailable for another target tier', () => {
		mockContext({...subscriptionUpgrade, targetTier: 'pro'});
		mockPricing({data: pricing});

		render(<AIHubTierSummary />);

		expect(screen.getByText('Upgrade Unavailable')).toBeInTheDocument();
	});
});
