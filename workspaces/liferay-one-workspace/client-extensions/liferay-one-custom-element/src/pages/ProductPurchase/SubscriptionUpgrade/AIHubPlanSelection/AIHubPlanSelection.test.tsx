/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {SubscriptionUpgradeType} from '~/enums/SubscriptionUpgradeType';
import {useSubscriptionUpgradeLayoutContext} from '~/pages/ProductPurchase/SubscriptionUpgrade/components/SubscriptionUpgradeLayout/SubscriptionUpgradeLayout';
import useSubscriptionUpgradePricing from '~/pages/ProductPurchase/SubscriptionUpgrade/hooks/useSubscriptionUpgradePricing';
import {Liferay} from '~/services/liferay/liferay';

import AIHubPlanSelection from './AIHubPlanSelection';

import type {Account} from '~/types/accounts';
import type {DeliveryProduct} from '~/types/product';
import type {SubscriptionUpgradePricing} from '~/types/subscriptionUpgrade';

const {openModal} = vi.hoisted(() => ({
	openModal: vi.fn(),
}));

vi.mock(
	'~/pages/ProductPurchase/SubscriptionUpgrade/AIHubPlanSelection/hooks/useAIHubRequirementsModal',
	() => ({
		useAIHubRequirementsModal: () => ({openModal}),
	})
);

vi.mock(
	'~/pages/ProductPurchase/SubscriptionUpgrade/components/SubscriptionUpgradeLayout/SubscriptionUpgradeLayout',
	() => ({
		useSubscriptionUpgradeLayoutContext: vi.fn(),
	})
);

vi.mock(
	'~/pages/ProductPurchase/SubscriptionUpgrade/hooks/useSubscriptionUpgradePricing',
	() => ({
		default: vi.fn(),
	})
);

const nextStep = vi.fn();

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

function mockPricing(data?: SubscriptionUpgradePricing) {
	vi.mocked(useSubscriptionUpgradePricing).mockReturnValue({
		data,
		isLoading: false,
	} as ReturnType<typeof useSubscriptionUpgradePricing>);
}

describe('AIHubPlanSelection', () => {
	beforeEach(() => {
		nextStep.mockReset();
		openModal.mockReset();

		Liferay.ThemeDisplay.getBCP47LanguageId = () => 'en-US';

		vi.mocked(useSubscriptionUpgradeLayoutContext).mockReturnValue({
			account: {id: 7} as Account,
			actions: {exit: vi.fn(), nextStep, previousStep: vi.fn()},
			product: {} as DeliveryProduct,
			projectExternalReferenceCode: 'PROJECT-1',
			subscriptionUpgrade: {
				contractEndDate: '2027-06-10',
				productExternalReferenceCode: 'AI-HUB',
				targetProductId: 4321,
				type: SubscriptionUpgradeType.AI_HUB_TIER,
			},
		});
	});

	it('asks for the pricing of the AI Hub tier upgrade', () => {
		mockPricing(pricing);

		render(<AIHubPlanSelection />);

		expect(useSubscriptionUpgradePricing).toHaveBeenCalledWith(
			7,
			'PROJECT-1',
			SubscriptionUpgradeType.AI_HUB_TIER
		);
	});

	it('marks Activate as the current plan with no change', () => {
		mockPricing(pricing);

		render(<AIHubPlanSelection />);

		expect(screen.getByText('No Change')).toBeInTheDocument();
		expect(
			screen.getByRole('button', {name: 'Current Plan'})
		).toBeDisabled();
	});

	it('shows the monthly difference sent by the backend for Studio', () => {
		mockPricing(pricing);

		render(<AIHubPlanSelection />);

		expect(screen.getByText('+ $1,000.00')).toBeInTheDocument();
	});

	it('shows the AI Hub requirements before it moves to the summary', async () => {
		mockPricing(pricing);

		render(<AIHubPlanSelection />);

		await userEvent.click(screen.getByRole('button', {name: 'Purchase'}));

		expect(openModal).toHaveBeenCalledWith(nextStep);
		expect(nextStep).not.toHaveBeenCalled();
	});

	it('shows the price per month only for Studio', () => {
		mockPricing(pricing);

		render(<AIHubPlanSelection />);

		expect(screen.getAllByText('per Month')).toHaveLength(1);
	});

	it('shows the upgrade as unavailable without a tier change price', () => {
		mockPricing({...pricing, tierChange: undefined});

		render(<AIHubPlanSelection />);

		expect(screen.getByText('Upgrade Unavailable')).toBeInTheDocument();
		expect(
			screen.queryByRole('button', {name: 'Purchase'})
		).not.toBeInTheDocument();
	});

	it('asks the user to try again when the pricing fails', () => {
		vi.mocked(useSubscriptionUpgradePricing).mockReturnValue({
			error: new Error('500'),
			isLoading: false,
		} as ReturnType<typeof useSubscriptionUpgradePricing>);

		render(<AIHubPlanSelection />);

		expect(screen.getByText('Upgrade Unavailable')).toBeInTheDocument();
		expect(screen.getByText('Try again later.')).toBeInTheDocument();
	});

	it('shows the upgrade as unavailable for another target tier', () => {
		mockPricing(pricing);

		vi.mocked(useSubscriptionUpgradeLayoutContext).mockReturnValue({
			...vi.mocked(useSubscriptionUpgradeLayoutContext)(),
			subscriptionUpgrade: {
				contractEndDate: '2027-06-10',
				productExternalReferenceCode: 'AI-HUB',
				targetProductId: 4321,
				targetTier: 'pro',
				type: SubscriptionUpgradeType.AI_HUB_TIER,
			},
		});

		render(<AIHubPlanSelection />);

		expect(screen.getByText('Upgrade Unavailable')).toBeInTheDocument();
	});
});
