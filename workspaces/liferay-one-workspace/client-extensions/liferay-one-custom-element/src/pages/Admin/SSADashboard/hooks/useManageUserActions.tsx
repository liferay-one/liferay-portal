/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import Button from '@clayui/button';
import {useMemo} from 'react';
import {Tooltip} from '~/components/Tooltip/Tooltip';
import {useOneContext} from '~/context/OneContextProvider';
import useModalContext from '~/hooks/useModalContext';
import i18n from '~/i18n';
import ManageUserModal from '~/pages/Admin/SSADashboard/components/ManageUserRolesModal';
import {ssaRoles as ssaRolesValues} from '~/pages/Admin/SSADashboard/utils/constants';
import {Liferay} from '~/services/liferay/liferay';
import Accounts from '~/services/spring-boot/Accounts';
import {Action} from '~/utils/appConstants';

import type {UserAccount} from '~/types/accounts';
import type {APIResponse} from '~/types/api';

function mutateUser(
	accountERC: string,
	userId: number,
	userAccountPage: APIResponse<UserAccount>
) {
	return {
		...userAccountPage,
		items: userAccountPage.items.map((userAccount) => {
			if (userAccount.id !== userId) {
				return userAccount;
			}

			return {
				...userAccount,
				accountBriefs: userAccount.accountBriefs.map((account) =>
					account.externalReferenceCode === accountERC
						? {
								...account,
								roleBriefs: [],
							}
						: account
				),
			};
		}),
	};
}

const useManageUserActions = () => {
	const {properties} = useOneContext();
	const modalContext = useModalContext();

	return useMemo(
		() =>
			[
				{
					name: i18n.translate('manage-roles'),
					onClick: (user: UserAccount, mutate) => {
						modalContext.onOpenModal({
							body: (
								<ManageUserModal
									accountERC={
										properties.ssaAccountExternalReferenceCode
									}
									mutate={mutate}
									onClose={modalContext.onClose}
									user={user}
								/>
							),
							footer: [
								<Button
									displayType="secondary"
									key="cancel"
									onClick={modalContext.onClose}
								>
									{i18n.translate('cancel')}
								</Button>,
								null,
								<Button
									form="manage-roles"
									key="confirm"
									type="submit"
								>
									{i18n.translate('apply')}
								</Button>,
							],
							header: (
								<div className="align-items-center d-flex">
									<span className="mr-2">
										{i18n.translate('manage-user-roles')}
									</span>
									<Tooltip
										tooltip={i18n.translate(
											'set-the-users-role-ssa-users-can-create-trials-while-ssa-admins-can-manage-users-roles-and-trials'
										)}
									/>
								</div>
							),
						});
					},
				},
				{
					name: i18n.translate('remove-all-roles'),
					onClick: (userAccount: UserAccount, mutate) => {
						modalContext.onOpenModal({
							body: (
								<div>
									{i18n.translate(
										'you-are-about-to-remove-this-user-from-ssa-they-will-lose-access-to-their-account-and-all-associated-features-but-dont-worry-you-can-invite-them-again-later-if-needed'
									)}
								</div>
							),
							footer: [
								<Button
									displayType="secondary"
									key="cancel"
									onClick={modalContext.onClose}
								>
									{i18n.translate('cancel')}
								</Button>,
								null,
								<Button
									displayType="warning"
									key="confirm"
									onClick={async () => {
										const ssaAccountBrief =
											userAccount.accountBriefs.find(
												(accountBrief) =>
													accountBrief.externalReferenceCode ===
													properties.ssaAccountExternalReferenceCode
											);

										try {
											await Accounts.putUserAccountsAccountRoles(
												properties.ssaAccountExternalReferenceCode,
												userAccount.id,
												(ssaAccountBrief?.roleBriefs ?? [])
													.filter(
														(roleBrief) =>
															!ssaRolesValues.some(
																(ssaRole) =>
																	ssaRole.key ===
																	roleBrief.name
															)
													)
													.map(
														(roleBrief) =>
															roleBrief.id
													)
											);
										}
										catch {
											return Liferay.Util.openToast({
												message: i18n.translate(
													'unable-to-remove-roles'
												),
												title: i18n.translate('error'),
												type: 'danger',
											});
										}

										Liferay.Util.openToast({
											message: i18n.translate(
												'successfully-removed-roles'
											),
										});

										mutate(
											(
												usersPage: APIResponse<UserAccount>
											) => {
												return mutateUser(
													properties.ssaAccountExternalReferenceCode,
													userAccount.id,
													usersPage
												);
											},
											{revalidate: false}
										);

										modalContext.onClose();
									}}
								>
									{i18n.translate('confirm')}
								</Button>,
							],
							header: i18n.translate('remove-user'),
							status: 'warning',
						});
					},
				},
			] as Action[],
		[modalContext, properties.ssaAccountExternalReferenceCode]
	);
};

export default useManageUserActions;
