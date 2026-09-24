/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayRadio} from '@clayui/form';
import classNames from 'classnames';
import {useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import AccountAvatar from '~/components/AccountAvatar/AccountAvatar';
import Loading from '~/components/Loading/Loading';
import i18n from '~/i18n';
import {useProductPurchaseLayoutContext} from '~/pages/ProductPurchase/components/ProductPurchaseLayout/ProductPurchaseLayout';
import ProductPurchaseShell from '~/pages/ProductPurchase/components/ProductPurchaseShell/ProductPurchaseShell';
import {Liferay} from '~/services/liferay/liferay';
import {hasAIHubOrder} from '~/utils/orderUtils';
import {isSEOStudioProduct} from '~/utils/productUtils';

import useAIHubOrders from '../hooks/useAIHubOrders';
import {useSEOStudioRequirementsModal} from '../hooks/useSEOStudioRequirementsModal';

const HELP_CENTER_URL = 'https://help.liferay.com';

const AccountSelection = () => {
	const {
		accounts,
		actions: {nextStep},
		isLoadingAccounts,
		isSingleAccount,
		product,
		selectedAccount,
		setSelectedAccount,
		steps,
	} = useProductPurchaseLayoutContext();

	const navigate = useNavigate();

	const isSEOStudio = isSEOStudioProduct(product);

	const {data: aiHubOrders, isLoading: isLoadingAIHubOrders} = useAIHubOrders(
		isSEOStudio ? selectedAccount?.id : undefined
	);

	const {openModal: openSEOStudioRequirementsModal} =
		useSEOStudioRequirementsModal();

	const isEligible = !isSEOStudio || hasAIHubOrder(aiHubOrders);

	const stepAfterAccountKey = steps[1]?.key;

	useEffect(() => {
		if (!product) {
			return;
		}

		if (isSingleAccount) {
			if (selectedAccount?.id !== accounts[0]?.id) {
				setSelectedAccount(accounts[0]);
			}

			if (!isEligible) {
				return;
			}

			if (stepAfterAccountKey) {
				navigate(stepAfterAccountKey, {replace: true});
			}
		}
	}, [
		accounts,
		isEligible,
		isSingleAccount,
		navigate,
		setSelectedAccount,
		product,
		selectedAccount,
		stepAfterAccountKey,
	]);

	if (
		isLoadingAccounts ||
		(isSingleAccount && (isLoadingAIHubOrders || isEligible))
	) {
		return <Loading.Page />;
	}

	return (
		<ProductPurchaseShell
			footerProps={{
				backButtonProps: {className: 'd-none'},
				continueButtonProps: {
					disabled: !selectedAccount?.id || isLoadingAIHubOrders,
					onClick: () =>
						isEligible
							? nextStep()
							: openSEOStudioRequirementsModal(),
				},
			}}
			title={i18n.translate('account-selection')}
		>
			<p className="text-muted">
				{i18n.sub(
					'accounts-available-for-x-you',
					Liferay.ThemeDisplay.getUserEmailAddress()
				)}
			</p>

			{accounts.length ? (
				accounts.map((account) => {
					const selected = selectedAccount?.id === account.id;

					return (
						<div
							className={classNames(
								'border mb-3 p-4 product-purchase-account-card rounded',
								{selected}
							)}
							key={account.id}
							onClick={() => setSelectedAccount(account)}
							role="button"
							tabIndex={0}
						>
							<div className="align-items-center d-flex">
								<div className="mr-2">
									<ClayRadio
										checked={selected}
										onChange={() =>
											setSelectedAccount(account)
										}
										value={String(account.id)}
									/>
								</div>

								<AccountAvatar
									logoURL={account.logoURL}
									type={account.type}
								/>

								<div className="ml-3">
									<strong className="d-block">
										{account.name}
									</strong>

									<small className="text-capitalize text-muted">
										{account.type}
									</small>
								</div>
							</div>
						</div>
					);
				})
			) : (
				<p className="font-weight-bold my-5">
					{i18n.translate('no-accounts-available')}
				</p>
			)}

			<span className="mr-1 text-muted">
				{i18n.translate('not-seeing-a-specific-account')}
			</span>

			<a
				className="font-weight-bold"
				href={HELP_CENTER_URL}
				rel="noopener noreferrer"
				target="_blank"
			>
				{i18n.translate('contact-support')}
			</a>
		</ProductPurchaseShell>
	);
};

export default AccountSelection;
