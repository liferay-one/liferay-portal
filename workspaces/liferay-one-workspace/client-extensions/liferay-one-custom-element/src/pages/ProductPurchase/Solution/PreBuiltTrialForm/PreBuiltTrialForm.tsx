/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import {useNavigate} from 'react-router-dom';
import {Header} from '~/components/Header/Header';
import Loading from '~/components/Loading/Loading';
import MarketoForm from '~/components/MarketoForm/MarketoForm';
import {useOneContext} from '~/context/OneContextProvider';
import i18n from '~/i18n';
import {useProductPurchaseLayoutContext} from '~/pages/ProductPurchase/components/ProductPurchaseLayout/ProductPurchaseLayout';
import useTrialOrders from '~/pages/ProductPurchase/hooks/useTrialOrders';
import ProductPurchaseSolutionTrial from '~/services/commerce/ProductPurchaseSolutionTrial';
import {Liferay} from '~/services/liferay/liferay';
import {getSiteURL} from '~/utils/siteUtils';

const SALES_EMAIL_ADDRESS = 'sales@liferay.com';

const TrialUnavailable = () => (
	<div>
		<h1 className="text-center">{i18n.translate('trial-not-available')}</h1>

		<p className="mt-7">
			{i18n.sub(
				'dear-x-based-on-our-records-you-have-already-completed-a-trial-therefore-currently-we-are-unable-to-start-your-trial-please-contact-our-sales-department-via-email',
				Liferay.ThemeDisplay.getUserName()
			)}
			<a className="ml-1" href={`mailto:${SALES_EMAIL_ADDRESS}`}>
				{SALES_EMAIL_ADDRESS}
			</a>
			.
		</p>

		<ClayButton
			displayType="secondary"
			onClick={() =>
				Liferay.Util.navigate(`${getSiteURL()}/pre-built-trial`)
			}
		>
			{i18n.translate('return-to-trial-page')}
		</ClayButton>
	</div>
);

const PreBuiltTrialForm = () => {
	const {handlePurchase, product, selectedAccount} =
		useProductPurchaseLayoutContext();

	const {properties} = useOneContext();

	const navigate = useNavigate();

	const {data: trialOrders = [], isLoading} = useTrialOrders(
		selectedAccount?.id
	);

	if (isLoading) {
		return <Loading />;
	}

	if (properties.trialAccountCheck === 'true' && trialOrders.length) {
		return <TrialUnavailable />;
	}

	const onSubmit = () =>
		handlePurchase(
			new ProductPurchaseSolutionTrial(selectedAccount, product)
		);

	return (
		<>
			<Header
				description={
					<div className="d-flex flex-column justify-content-center text-center w-100">
						<p className="m-0">
							{i18n.translate(
								'your-trial-is-provisioned-by-liferay'
							)}
						</p>

						<p>
							{i18n.translate(
								'to-continue-please-enter-the-required-information'
							)}
						</p>
					</div>
				}
				title={
					<div className="d-flex flex-column justify-content-center text-center">
						{i18n.translate('create-a-trial')}
					</div>
				}
			/>

			<MarketoForm
				footerElement={(buttonElement) => {
					const backButton = document.createElement('button');
					const parentElement = buttonElement.parentElement;

					if (parentElement) {
						parentElement.classList.add(
							'd-flex',
							'justify-content-between'
						);
					}

					backButton.classList.add('btn', 'btn-secondary');
					backButton.onclick = () => navigate('..');
					backButton.textContent = i18n.translate('back');
					backButton.type = 'button';

					buttonElement.classList.add('btn', 'btn-primary');
					buttonElement.classList.remove('mktoButton');
					buttonElement.insertAdjacentElement(
						'beforebegin',
						backButton
					);
				}}
				formId={properties.marketoFormIdDefault}
				onSubmit={onSubmit}
				submitText={i18n.translate('start-trial')}
			/>
		</>
	);
};

export default PreBuiltTrialForm;
