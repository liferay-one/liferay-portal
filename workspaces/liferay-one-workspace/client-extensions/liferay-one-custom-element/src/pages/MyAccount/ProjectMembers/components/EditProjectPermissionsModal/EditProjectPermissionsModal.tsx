/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import ClayDropDown from '@clayui/drop-down';
import ClayIcon from '@clayui/icon';
import {useState} from 'react';
import {translate} from '~/i18n';
import PermissionsSelect from '~/pages/MyAccount/ProjectMembers/components/PermissionsSelect/PermissionsSelect';
import HeadlessAdminUser from '~/services/headless/HeadlessAdminUser';
import {Liferay} from '~/services/liferay/liferay';
import Accounts from '~/services/spring-boot/Accounts';
import Projects from '~/services/spring-boot/Projects';

import '../../ProjectMembers.css';

import type {
	AccountMemberOption,
	ProjectMembersRow,
} from '~/pages/MyAccount/ProjectMembers/types';

type MemberDropDownProps = {
	filteredOptions: AccountMemberOption[];
	onChange: (option: AccountMemberOption) => void;
	selectedName: string;
};

const MemberDropDown = ({
	filteredOptions,
	onChange,
	selectedName,
}: MemberDropDownProps) => {
	const [active, setActive] = useState(false);

	return (
		<ClayDropDown
			active={active}
			className="project-permissions-role-dropdown"
			menuElementAttrs={{className: 'project-permissions-role-menu'}}
			onActiveChange={setActive}
			trigger={
				<button
					className="align-items-center d-flex form-control justify-content-between project-permissions-role-trigger"
					type="button"
				>
					<span>{selectedName || translate('select-a-member')}</span>

					<ClayIcon symbol="caret-bottom" />
				</button>
			}
		>
			<ClayDropDown.ItemList>
				{filteredOptions.map((option) => (
					<ClayDropDown.Item
						key={option.userId}
						onClick={() => onChange(option)}
					>
						{option.name}
					</ClayDropDown.Item>
				))}
			</ClayDropDown.ItemList>
		</ClayDropDown>
	);
};

type WorkingMember = {
	accountRoleIds: number[];
	designations: string[];
	email: string;
	isNew: boolean;
	membershipId: number;
	name: string;
	originalDesignations: string[];
	originalRoleExternalReferenceCode: string;
	removed: boolean;
	roleExternalReferenceCode: string;
	userId: number;
};

type EditProjectPermissionsModalProps = {
	accountExternalReferenceCode: string;
	accountMemberOptions: AccountMemberOption[];
	mutate: () => Promise<unknown>;
	onClose: () => void;
	project: ProjectMembersRow;
};

const EditProjectPermissionsModal = ({
	accountExternalReferenceCode,
	accountMemberOptions,
	mutate,
	onClose,
	project,
}: EditProjectPermissionsModalProps) => {
	const {availableDesignations} = project;

	const [members, setMembers] = useState<WorkingMember[]>(
		project.members.map((member) => ({
			accountRoleIds: member.accountRoleIds,
			designations: member.designations,
			email: member.email,
			isNew: false,
			membershipId: member.membershipId,
			name: member.name,
			originalDesignations: member.designations,
			originalRoleExternalReferenceCode: member.roleExternalReferenceCode,
			removed: false,
			roleExternalReferenceCode: member.roleExternalReferenceCode,
			userId: member.userId,
		}))
	);
	const [error, setError] = useState('');

	const updateMember = (index: number, patch: Partial<WorkingMember>) =>
		setMembers((previous) =>
			previous.map((member, memberIndex) =>
				memberIndex === index ? {...member, ...patch} : member
			)
		);

	const toggleDesignation = (index: number, designation: string) =>
		setMembers((previous) =>
			previous.map((member, memberIndex) =>
				memberIndex === index
					? {
							...member,
							designations: member.designations.includes(
								designation
							)
								? member.designations.filter(
										(value) => value !== designation
									)
								: [...member.designations, designation],
						}
					: member
			)
		);

	const removeMember = (index: number) =>
		setMembers((previous) =>
			previous
				.map((member, memberIndex) =>
					memberIndex === index ? {...member, removed: true} : member
				)
				.filter((member) => !(member.isNew && member.removed))
		);

	const onSubmit = async (event: React.FormEvent) => {
		event.preventDefault();

		const activeMembers = members.filter((member) => !member.removed);

		if (activeMembers.some((member) => !member.userId)) {
			setError(translate('please-select-a-user-for-every-new-member'));

			return;
		}

		if (activeMembers.some((member) => !member.roleExternalReferenceCode)) {
			setError(translate('a-role-is-required-for-every-member'));

			return;
		}

		try {
			await Promise.all(
				members.map((member) => {
					if (member.isNew && !member.removed) {
						return Projects.postProjectMembership(
							project.externalReferenceCode,
							member.userId,
							member.roleExternalReferenceCode
						);
					}

					if (!member.isNew && member.removed) {
						return Projects.deleteProjectMembership(
							project.externalReferenceCode,
							member.userId,
							member.originalRoleExternalReferenceCode
						);
					}

					if (
						!member.isNew &&
						member.roleExternalReferenceCode !==
							member.originalRoleExternalReferenceCode
					) {
						return Projects.putProjectMembership(
							project.externalReferenceCode,
							member.userId,
							member.roleExternalReferenceCode
						);
					}

					return null;
				})
			);

			const designationMembers = members.filter(
				(member) =>
					!member.removed &&
					member.userId &&
					availableDesignations.some(
						(designation) =>
							member.designations.includes(designation) !==
							member.originalDesignations.includes(designation)
					)
			);

			if (designationMembers.length) {
				const {items: accountRoles} =
					await HeadlessAdminUser.getAccountRoles(
						accountExternalReferenceCode
					);

				const accountRoleIdsByName = new Map(
					accountRoles.map((accountRole) => [
						accountRole.name,
						accountRole.id,
					])
				);

				await Promise.all(
					designationMembers.map((member) => {
						const accountRoleIds = new Set(member.accountRoleIds);

						availableDesignations.forEach((designation) => {
							const accountRoleId =
								accountRoleIdsByName.get(designation);

							if (!accountRoleId) {
								return;
							}

							if (member.designations.includes(designation)) {
								accountRoleIds.add(accountRoleId);
							}
							else {
								accountRoleIds.delete(accountRoleId);
							}
						});

						return Accounts.putUserAccountsAccountRoles(
							accountExternalReferenceCode,
							member.userId,
							[...accountRoleIds]
						);
					})
				);
			}

			await mutate();

			Liferay.Util.openToast({
				message: translate('project-members-successfully-updated'),
				title: translate('success'),
			});

			onClose();
		}
		catch {
			Liferay.Util.openToast({
				message: translate('unable-to-update-project-members'),
				title: translate('error'),
				type: 'danger',
			});
		}
	};

	return (
		<form id="edit-project-permissions" onSubmit={onSubmit}>
			<div className="project-permissions-grid">
				<div className="project-permissions-grid-header project-permissions-grid-row">
					<span>{translate('team-member')}</span>

					<span>{translate('role')}</span>

					<span />
				</div>

				{members.map((member, index) =>
					member.removed ? null : (
						<div
							className="project-permissions-grid-row"
							key={index}
						>
							{member.isNew && !member.userId ? (
								<MemberDropDown
									filteredOptions={accountMemberOptions.filter(
										(option) =>
											!members.some(
												(m, i) =>
													i !== index &&
													!m.removed &&
													m.userId === option.userId
											)
									)}
									onChange={(option) =>
										updateMember(index, {
											accountRoleIds:
												option.accountRoleIds,
											email: option.email,
											name: option.name,
											userId: option.userId,
										})
									}
									selectedName={member.name}
								/>
							) : (
								<span className="form-control project-permissions-member-box">
									{member.name}
								</span>
							)}

							<PermissionsSelect
								availableDesignations={availableDesignations}
								designations={member.designations}
								onRoleChange={(roleExternalReferenceCode) =>
									updateMember(index, {
										roleExternalReferenceCode,
									})
								}
								onToggleDesignation={(designation) =>
									toggleDesignation(index, designation)
								}
								roleExternalReferenceCode={
									member.roleExternalReferenceCode
								}
							/>

							<ClayButton
								className="project-permissions-remove-button"
								onClick={() => removeMember(index)}
								type="button"
							>
								<ClayIcon className="mr-2" symbol="hr" />

								{translate('remove')}
							</ClayButton>
						</div>
					)
				)}
			</div>

			<ClayButton
				className="project-permissions-add-button"
				displayType="secondary"
				onClick={() =>
					setMembers((previous) => [
						...previous,
						{
							accountRoleIds: [],
							designations: [],
							email: '',
							isNew: true,
							membershipId: 0,
							name: '',
							originalDesignations: [],
							originalRoleExternalReferenceCode: '',
							removed: false,
							roleExternalReferenceCode: '',
							userId: 0,
						},
					])
				}
				type="button"
			>
				<ClayIcon className="mr-2" symbol="plus" />

				{translate('add-more-people')}
			</ClayButton>

			{error && <div className="mt-2 text-danger">{error}</div>}
		</form>
	);
};

export default EditProjectPermissionsModal;
