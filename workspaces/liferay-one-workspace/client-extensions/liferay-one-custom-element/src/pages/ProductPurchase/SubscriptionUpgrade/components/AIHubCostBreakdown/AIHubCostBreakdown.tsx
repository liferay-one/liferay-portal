/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import classNames from 'classnames';
import Section from '~/components/Section/Section';
import i18n from '~/i18n';
import {Liferay} from '~/services/liferay/liferay';
import {formatDate} from '~/utils/dateUtils';
import {formatCurrency} from '~/utils/formatCurrency';

import type {
	SubscriptionUpgradePricing,
	SubscriptionUpgradeTierChange,
} from '~/types/subscriptionUpgrade';

type AIHubCostBreakdownProps = {
	pricing: SubscriptionUpgradePricing;
	tierChange: SubscriptionUpgradeTierChange;
};

const AIHubCostBreakdown = ({pricing, tierChange}: AIHubCostBreakdownProps) => {
	const format = (amount: number) =>
		formatCurrency(
			amount,
			pricing.currencyCode,
			Liferay.ThemeDisplay.getBCP47LanguageId()
		);

	const remainingMonths = String(pricing.remainingMonths);

	const rows = [
		{
			label: i18n.translate('current-subscription'),
			value: i18n.sub(
				'x-per-month',
				format(tierChange.currentMonthlyPrice)
			),
		},
		{
			credit: true,
			label: i18n.sub('credit-x-months-remaining', remainingMonths),
			value: format(tierChange.creditForRemainingMonths),
		},
		{
			label: i18n.sub('new-subscription-x', 'studio'),
			value: i18n.sub('x-per-month', format(tierChange.newMonthlyPrice)),
		},
		{
			label: i18n.sub('new-subscription-cost-x-months', remainingMonths),
			value: format(tierChange.newCostForRemainingMonths),
		},
	];

	return (
		<>
			<Section
				className="subscription-upgrade-summary-item"
				label={i18n.translate('cost-breakdown')}
			>
				{rows.map(({credit, label, value}) => (
					<div
						className="d-flex justify-content-between mb-2"
						key={label}
					>
						<span>{label}</span>

						<span
							className={classNames('font-weight-semi-bold', {
								'text-success': credit,
							})}
						>
							{value}
						</span>
					</div>
				))}
			</Section>

			<Section
				className="subscription-upgrade-summary-item"
				label={i18n.translate('total-excl-taxes')}
			>
				<div className="align-items-center d-flex justify-content-between">
					<small className="text-muted">
						{i18n.sub(
							'current-contract-ends-x-the-contract-end-date-remains-unchanged',
							formatDate(pricing.contractEndDate)
						)}
					</small>

					<strong className="h4 mb-0">{format(pricing.total)}</strong>
				</div>
			</Section>
		</>
	);
};

export default AIHubCostBreakdown;
