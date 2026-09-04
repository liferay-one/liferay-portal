/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import AlertBox from '~/components/AlertBox/AlertBox';
import ProductPurchase from '~/components/ProductPurchase/ProductPurchase';
import i18n from '~/i18n';
import {useProductPurchaseLayoutContext} from '~/pages/ProductPurchase/components/ProductPurchaseLayout/ProductPurchaseLayout';
import {useAppPurchaseContext} from '~/pages/ProductPurchase/context/AppPurchaseContext';

const NoContractAvailable = () => {
	const {
		actions: {previousStep},
	} = useProductPurchaseLayoutContext();

	const {salesforceProject} = useAppPurchaseContext();

	return (
		<ProductPurchase.Shell
			className="d-flex flex-column"
			footerProps={{
				backButtonProps: {onClick: previousStep},
				continueButtonProps: {
					disabled: true,
				},
			}}
			title={i18n.translate('contract-selection')}
		>
			<div className="align-items-center d-flex flex-column justify-content-center text-center">
				<AlertBox className="mb-4" />

				<h2>
					{i18n.sub(
						'no-contracts-available-for-x',
						salesforceProject?.name ?? ''
					)}
				</h2>

				<p className="px-2">
					{i18n.translate(
						'it-looks-like-this-project-does-not-have-any-contracts-yet-please-contact-your-administrator-or-liferay-sales-to-set-one-up-before-purchasing'
					)}
				</p>

				<p className="d-flex justify-content-center my-4 next-step-page-text-bold">
					{i18n.translate('need-help')}&nbsp;{' '}
					<a href="mailto:support@liferay.com">support@liferay.com</a>
				</p>
			</div>
		</ProductPurchase.Shell>
	);
};

export default NoContractAvailable;
