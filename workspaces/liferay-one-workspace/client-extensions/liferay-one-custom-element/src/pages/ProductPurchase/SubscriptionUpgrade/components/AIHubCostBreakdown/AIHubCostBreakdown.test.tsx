/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it} from 'vitest';
import {Liferay} from '~/services/liferay/liferay';

import AIHubCostBreakdown from './AIHubCostBreakdown';

import type {SubscriptionUpgradePricing} from '~/types/subscriptionUpgrade';

const tierChange = {
	creditForRemainingMonths: -4500,
	currentMonthlyPrice: 500,
	monthlyPriceDifference: 1000,
	newCostForRemainingMonths: 13500,
	newMonthlyPrice: 1500,
};

const pricing: SubscriptionUpgradePricing = {
	contractEndDate: '2027-06-10',
	currencyCode: 'USD',
	lineItems: [],
	remainingMonths: 9,
	termMonths: 12,
	tierChange,
	total: 9000,
};

function renderBreakdown() {
	render(<AIHubCostBreakdown pricing={pricing} tierChange={tierChange} />);
}

function getValue(label: string) {
	return screen.getByText(label).nextElementSibling;
}

describe('AIHubCostBreakdown', () => {
	beforeEach(() => {
		Liferay.ThemeDisplay.getBCP47LanguageId = () => 'en-US';
	});

	it('renders each line formatted in the pricing currency', () => {
		renderBreakdown();

		expect(getValue('Current Subscription')).toHaveTextContent(
			'$500.00 per Month'
		);
		expect(getValue('Credit (9 Months Remaining)')).toHaveTextContent(
			'-$4,500.00'
		);
		expect(getValue('New Subscription (Studio)')).toHaveTextContent(
			'$1,500.00 per Month'
		);
		expect(getValue('New Subscription Cost (9 Months)')).toHaveTextContent(
			'$13,500.00'
		);
	});

	it('shows the credit as a credit', () => {
		renderBreakdown();

		expect(getValue('Credit (9 Months Remaining)')).toHaveClass(
			'text-success'
		);
	});

	it('renders the total excluding taxes as sent by the backend', () => {
		renderBreakdown();

		expect(screen.getByText('$9,000.00')).toBeInTheDocument();
		expect(screen.getByText('Total (excl. taxes)')).toBeInTheDocument();
		expect(screen.queryByText(/due today/i)).not.toBeInTheDocument();
	});

	it('says that the contract end date does not change', () => {
		renderBreakdown();

		expect(
			screen.getByText(/The contract end date remains unchanged/)
		).toBeInTheDocument();
	});
});
