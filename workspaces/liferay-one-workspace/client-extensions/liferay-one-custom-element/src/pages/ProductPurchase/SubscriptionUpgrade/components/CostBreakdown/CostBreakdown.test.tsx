/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen, within} from '@testing-library/react';
import {beforeEach, describe, expect, it} from 'vitest';
import {Liferay} from '~/services/liferay/liferay';

import CostBreakdown from './CostBreakdown';

const pricing = {
	contractEndDate: '2027-06-25',
	currencyCode: 'EUR',
	lineItems: [
		{
			name: 'CMP Production License',
			quantity: 2,
			total: 15000,
			unitPrice: 10000,
		},
		{
			name: 'CMP Non-Production License',
			quantity: 3,
			total: 5625,
			unitPrice: 2500,
		},
	],
	remainingMonths: 9,
	termMonths: 12,
	total: 20625,
};

describe('CostBreakdown', () => {
	beforeEach(() => {
		Liferay.ThemeDisplay.getBCP47LanguageId = () => 'en-US';
	});

	it('renders a row per line item formatted in the pricing currency', () => {
		render(<CostBreakdown pricing={pricing} />);

		const row = screen
			.getByText('CMP Production License')
			.closest('tr') as HTMLElement;

		expect(within(row).getByText('2')).toBeInTheDocument();
		expect(within(row).getByText('€10,000.00')).toBeInTheDocument();
		expect(within(row).getByText('€15,000.00')).toBeInTheDocument();
	});

	it('renders the total excluding taxes as sent by the backend', () => {
		render(<CostBreakdown pricing={pricing} />);

		expect(
			screen.getByText('Total (excl. taxes)').nextElementSibling
		).toHaveTextContent('€20,625.00');

		expect(screen.queryByText(/due today/i)).not.toBeInTheDocument();
	});

	it('renders the remaining term and the unchanged contract end date', () => {
		render(<CostBreakdown pricing={pricing} />);

		expect(screen.getByText('9 of 12 months')).toBeInTheDocument();
		expect(
			screen.getByText(/The contract end date remains unchanged/)
		).toBeInTheDocument();
	});
});
