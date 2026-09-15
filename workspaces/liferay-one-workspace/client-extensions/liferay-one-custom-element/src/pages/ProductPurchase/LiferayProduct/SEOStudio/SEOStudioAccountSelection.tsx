/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useModal} from '@clayui/modal';
import {useEffect, useState} from 'react';
import useSWR from 'swr';
import ProductPurchase from '~/components/ProductPurchase/ProductPurchase';
import {useOneContext} from '~/context/OneContextProvider';
import {ProductSpecificationKey, SolutionTypes} from '~/enums/Product';
import i18n from '~/i18n';
import {useProductPurchaseLayoutContext as useProductPurchaseOutletContext} from '~/pages/ProductPurchase/components/ProductPurchaseLayout/ProductPurchaseLayout';
import HeadlessCommerceDeliveryCatalog from '~/services/headless/HeadlessCommerceDeliveryCatalog';
import HeadlessCommerceDeliveryOrder from '~/services/headless/HeadlessCommerceDeliveryOrder';
import {Liferay} from '~/services/liferay/liferay';
import {OrderTypes} from '~/types/orders';
import SearchBuilder from '~/utils/SearchBuilder';
import {getProductSpecification} from '~/utils/productUtils';
import {getSiteURL} from '~/utils/siteUtils';

import AccountSelection from './CheckoutAccountSelection';
import CreateNewAccount from './CreateNewAccount';
import SEOStudioRequirementsModal from './SEOStudioRequirementsModal';

async function goToAIHubProductPage() {
	const {items: products} =
		await HeadlessCommerceDeliveryCatalog.getProductsPage(
			Liferay.CommerceContext.commerceChannelId,
			new URLSearchParams({
				accountId: '-1',
				filter: SearchBuilder.contains('name', 'AI Hub'),
				nestedFields: 'productSpecifications',
			})
		);

	const aiHubProduct = products?.find(
		(product: any) =>
			getProductSpecification(
				ProductSpecificationKey.SOLUTION_TYPE,
				product
			)?.value === SolutionTypes.AI_HUB
	);

	Liferay.Util.navigate(
		aiHubProduct
			? `${getSiteURL()}/p/${aiHubProduct.urls.en_US}`
			: `${getSiteURL()}/products`
	);
}

async function hasAIHubOrder(accountId: number) {
	const {items: aiHubOrders} =
		await HeadlessCommerceDeliveryOrder.getPlacedOrders(
			Liferay.CommerceContext.commerceChannelId,
			accountId,
			new URLSearchParams({
				filter: SearchBuilder.eq(
					'orderTypeExternalReferenceCode',
					OrderTypes.AI_HUB
				),
				pageSize: '1',
			})
		);

	return !!aiHubOrders?.length;
}

const SEOStudioAccountSelection = () => {
	const [loading, setLoading] = useState(false);
	const requirementsModal = useModal();
	const {myUserAccount} = useOneContext();

	const {
		accounts,
		actions: {nextStep},
		isSingleAccount,
		selectedAccount,
		setSelectedAccount,
	} = useProductPurchaseOutletContext();

	const isSelectedAccountListed = accounts.some(
		({id}: any) => id === selectedAccount?.id
	);

	const skipAccountSelection = isSingleAccount;

	useEffect(() => {
		if (
			skipAccountSelection &&
			!isSelectedAccountListed &&
			!!accounts.length
		) {
			setSelectedAccount(accounts[0]);
		}
	}, [
		accounts,
		isSelectedAccountListed,
		setSelectedAccount,
		skipAccountSelection,
	]);

	const {data: singleAccountHasAIHubOrder} = useSWR(
		skipAccountSelection && !!accounts.length
			? `/seo-studio/ai-hub-orders/${accounts[0].id}`
			: null,
		() => hasAIHubOrder(accounts[0].id)
	);

	useEffect(() => {
		if (
			skipAccountSelection &&
			singleAccountHasAIHubOrder &&
			isSelectedAccountListed
		) {
			nextStep();
		}
	}, [
		skipAccountSelection,
		singleAccountHasAIHubOrder,
		isSelectedAccountListed,
		nextStep,
	]);

	async function handleContinue() {
		setLoading(true);

		try {
			if (await hasAIHubOrder(selectedAccount.id)) {
				return nextStep();
			}

			requirementsModal.onOpenChange(true);
		}
		catch (error) {
			console.error(error);
		}

		setLoading(false);
	}

	if (
		skipAccountSelection &&
		isSelectedAccountListed &&
		singleAccountHasAIHubOrder
	) {
		return null;
	}

	return (
		<ProductPurchase.Shell
			footerProps={{
				backButtonProps: {className: 'd-none'},
				continueButtonProps: {
					disabled: loading || !isSelectedAccountListed,
					onClick: handleContinue,
				},
			}}
			title={i18n.translate('account-selection')}
		>
			{!!accounts.length && (
				<AccountSelection
					accounts={accounts}
					onSelectAccount={setSelectedAccount}
					selectedAccount={selectedAccount}
					userAccount={myUserAccount}
				/>
			)}

			<CreateNewAccount accounts={accounts} />

			{requirementsModal.open && (
				<SEOStudioRequirementsModal
					{...requirementsModal}
					onContinue={goToAIHubProductPage}
				/>
			)}
		</ProductPurchase.Shell>
	);
};

export default SEOStudioAccountSelection;
