/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayAlert from '@clayui/alert';
import ClayButton from '@clayui/button';
import ClayLink from '@clayui/link';
import ClayLoadingIndicator from '@clayui/loading-indicator';
import {useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import useSWR from 'swr';
import {useOneContext} from '~/context/OneContextProvider';
import i18n from '~/i18n';
import CheckoutAccountSelection from '~/pages/ProductPurchase/LiferayProduct/SEOStudio/CheckoutAccountSelection';
import HeadlessAdminUser from '~/services/headless/HeadlessAdminUser';
import {getIconSpriteMap} from '~/services/liferay/liferay';
import SearchBuilder from '~/utils/SearchBuilder';

import useOAuth2AuthorizeContext from '../hooks/useOAuth2AuthorizeContext';

import type {Account} from '~/types/accounts';

function hasRequiredBillingAddress(account?: Account) {
	if (account?.type !== 'business') {
		return true;
	}

	return Boolean(account.defaultBillingAddressId);
}

export default function AccountSelection() {
	const {myUserAccount} = useOneContext();
	const {code, origin, selectedAccount, setSelectedAccount} =
		useOAuth2AuthorizeContext();

	const navigate = useNavigate();

	const accountIds = (myUserAccount?.accountBriefs ?? []).map(({id}) => id);

	const {
		data: accounts,
		error,
		isLoading,
	} = useSWR(
		accountIds.length
			? {accountIds, key: 'oauth2-authorize-accounts'}
			: null,
		async () => {
			const {items} = await HeadlessAdminUser.getAccounts(
				new URLSearchParams({
					filter: SearchBuilder.in('id', accountIds),
					pageSize: '-1',
				})
			);

			return items;
		}
	);

	useEffect(() => {
		if (
			selectedAccount ||
			accounts?.length !== 1 ||
			!hasRequiredBillingAddress(accounts[0])
		) {
			return;
		}

		setSelectedAccount(accounts[0]);
	}, [accounts, selectedAccount, setSelectedAccount]);

	if (error || !code || !origin) {
		return (
			<div className="border mt-2 p-4 rounded">
				<h1 className="align-items-center d-flex flex-column mt-2 p-2 pb-5">
					{i18n.translate('something-went-wrong')}
				</h1>

				<p className="secondary-text">
					{i18n.translate('an-unexpected-error-occurred')}
				</p>
			</div>
		);
	}

	const missingBillingAddress =
		Boolean(selectedAccount) && !hasRequiredBillingAddress(selectedAccount);

	return (
		<div className="border mt-2 p-4 pt-2 rounded">
			<h1 className="align-items-center d-flex flex-column mt-2 p-2 pb-5">
				{i18n.translate('account-selection')}
			</h1>

			<ClayAlert
				displayType="info"
				spritemap={getIconSpriteMap()}
				title={origin}
			>
				{i18n.translate(
					'this-liferay-dxp-is-requesting-access-to-the-account-you-select-below'
				)}{' '}
				{i18n.translate(
					'only-continue-if-you-started-this-connection-from-that-liferay-dxp'
				)}
			</ClayAlert>

			<p className="secondary-text">
				{i18n.translate(
					'please-select-the-account-you-wish-to-link-to-your-liferay-dxp-below'
				)}
			</p>

			{isLoading ? (
				<ClayLoadingIndicator />
			) : (
				<CheckoutAccountSelection
					accounts={accounts}
					onSelectAccount={setSelectedAccount}
					selectedAccount={selectedAccount}
					showAccountsAvailableText={false}
					showContactSupport={false}
					userAccount={myUserAccount}
				/>
			)}

			{missingBillingAddress && (
				<ClayAlert
					className="mt-3"
					displayType="warning"
					spritemap={getIconSpriteMap()}
					title={i18n.translate('billing-address')}
				>
					{i18n.translate(
						'this-account-has-no-default-billing-address-so-a-connected-dxp-cannot-install-products-for-it'
					)}{' '}
					{i18n.translate('need-help')}{' '}
					<ClayLink href="mailto:support@liferay.com">
						{i18n.translate('contact-support')}
					</ClayLink>
				</ClayAlert>
			)}

			<div className="d-flex justify-content-end mt-3">
				<ClayButton
					disabled={!selectedAccount || missingBillingAddress}
					onClick={() => navigate('/project-selection')}
				>
					{i18n.translate('continue')}
				</ClayButton>
			</div>
		</div>
	);
}
