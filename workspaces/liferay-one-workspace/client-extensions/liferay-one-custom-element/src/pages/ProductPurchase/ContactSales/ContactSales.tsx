/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayLink from '@clayui/link';
import EmptyState from '~/components/EmptyState/EmptyState';
import i18n from '~/i18n';
import {
	ProductLicenseTierLabels,
	getProductLicenseTiers,
} from '~/utils/licenseTierUtils';
import {CONTACT_SALES_URL} from '~/utils/productUtils';

import type {DeliveryProduct} from '~/types/product';

type ContactSalesProps = {
	product: DeliveryProduct;
};

export default function ContactSales({product}: ContactSalesProps) {
	const licenseTiers = getProductLicenseTiers(product);

	return (
		<EmptyState
			description={i18n.sub(
				'x-is-sold-through-our-sales-team-contact-sales-to-get-a-quote-and-choose-the-license-tier-that-fits-your-team',
				product.name
			)}
			title={i18n.translate('contact-sales')}
			type="EMPTY_STATE"
		>
			{!!licenseTiers.length && (
				<p className="text-neutral-7">
					{i18n.sub(
						'available-license-tiers-x',
						licenseTiers
							.map((licenseTier) =>
								i18n.translate(
									ProductLicenseTierLabels[licenseTier]
								)
							)
							.join(', ')
					)}
				</p>
			)}

			<ClayLink
				button
				displayType="primary"
				href={CONTACT_SALES_URL}
				target="_blank"
			>
				{i18n.translate('contact-sales')}
			</ClayLink>
		</EmptyState>
	);
}
