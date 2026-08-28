/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ProductPurchase from '~/components/ProductPurchase/ProductPurchase';
import i18n from '~/i18n';
import {useProductPurchaseLayoutContext as useProductPurchaseOutletContext} from '~/pages/ProductPurchase/components/ProductPurchaseLayout/ProductPurchaseLayout';
import EmptyState from '~/components/EmptyState/EmptyState';

const SEOStudioNotEligible = () => {
	const {
		actions: {previousStep},
		selectedAccount,
	} = useProductPurchaseOutletContext();

	return (
		<ProductPurchase.Shell
			className="d-flex flex-column"
			footerProps={{
				backButtonProps: {onClick: previousStep},
				continueButtonProps: {
					disabled: true,
				},
			}}
			title={i18n.translate('seo-studio' as any)}
		>
			<EmptyState
				description={
					<>
						<p className="px-2">
							SEO Studio is a beta add-on for Liferay AI Hub, and
							the account <strong>{selectedAccount?.name}</strong>{' '}
							does not have an AI Hub purchase yet. Please select
							another account or explore AI Hub to get started.
						</p>

						<p className="d-flex justify-content-center my-4 next-step-page-text-bold">
							Need help?&nbsp;{' '}
							<a href="mailto:support@liferay.com">
								support@liferay.com
							</a>
						</p>
					</>
				}
				title={i18n.translate(
					'seo-studio-is-available-only-for-ai-hub-customers' as any
				)}
				type="NO_ACCESS"
			/>
		</ProductPurchase.Shell>
	);
};

export default SEOStudioNotEligible;
