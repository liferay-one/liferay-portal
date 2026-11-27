/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import Section from '~/components/Section/Section';
import i18n from '~/i18n';
import {Liferay} from '~/services/liferay/liferay';
import {formatDate} from '~/utils/dateUtils';
import {formatCurrency} from '~/utils/formatCurrency';

import type {SubscriptionUpgradePricing} from '~/types/subscriptionUpgrade';

type CostBreakdownProps = {
	pricing: SubscriptionUpgradePricing;
};

const CostBreakdown = ({pricing}: CostBreakdownProps) => {
	const format = (amount: number) =>
		formatCurrency(
			amount,
			pricing.currencyCode,
			Liferay.ThemeDisplay.getBCP47LanguageId()
		);

	return (
		<Section label={i18n.translate('cost-breakdown')}>
			<table className="table table-autofit">
				<thead>
					<tr>
						<th className="table-cell-expand">
							{i18n.translate('item')}
						</th>

						<th className="text-right">{i18n.translate('qty')}</th>

						<th className="text-right">
							{i18n.translate('unit-price')}
						</th>

						<th className="text-right">
							{i18n.translate('total')}
						</th>
					</tr>
				</thead>

				<tbody>
					{pricing.lineItems.map((lineItem) => (
						<tr key={lineItem.name}>
							<td className="table-cell-expand">
								{lineItem.name}
							</td>

							<td className="text-right">{lineItem.quantity}</td>

							<td className="text-right">
								{format(lineItem.unitPrice)}
							</td>

							<td className="font-weight-semi-bold text-right">
								{format(lineItem.total)}
							</td>
						</tr>
					))}
				</tbody>
			</table>

			<div className="align-items-center d-flex justify-content-between">
				<strong>{i18n.translate('total-excl-taxes')}</strong>

				<strong>{format(pricing.total)}</strong>
			</div>

			<div className="d-flex justify-content-between mt-4">
				<div>
					<span className="d-block">
						{i18n.translate('remaining-term')}
					</span>

					<small className="text-muted">
						{i18n.sub(
							'current-contract-ends-x-the-contract-end-date-remains-unchanged',
							formatDate(pricing.contractEndDate)
						)}
					</small>
				</div>

				<strong>
					{i18n.sub('x-of-x-months', [
						String(pricing.remainingMonths),
						String(pricing.termMonths),
					])}
				</strong>
			</div>
		</Section>
	);
};

export default CostBreakdown;
