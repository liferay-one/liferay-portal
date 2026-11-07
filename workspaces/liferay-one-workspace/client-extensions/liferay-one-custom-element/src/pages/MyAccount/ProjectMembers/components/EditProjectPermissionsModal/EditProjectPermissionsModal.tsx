/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import ClayIcon from '@clayui/icon';
import {useRef, useState} from 'react';
import Button from '~/components/Button/Button';
import {translate} from '~/i18n';
import MemberDropDown from '~/pages/MyAccount/ProjectMembers/components/MemberDropDown/MemberDropDown';
import PermissionsSelect from '~/pages/MyAccount/ProjectMembers/components/PermissionsSelect/PermissionsSelect';
import {getContactRoleChanges} from '~/pages/MyAccount/ProjectMembers/projectRoles';
import {Liferay} from '~/services/liferay/liferay';
import Projects from '~/services/spring-boot/Projects';

import '../../ProjectMembers.css';

import type {
	AccountMemberOption,
	ProjectMembersRow,
} from '~/pages/MyAccount/ProjectMembers/types';

type WorkingMember = {
	designations: string[];
	email: string;
	isNew: boolean;
	membershipId: number;
	name: string;
	originalDesignations: string[];
	originalRoleExternalReferenceCode: string;
	removed: boolean;
	roleExternalReferenceCode: string;
	rowKey: string;
	userId: number;
};

type EditProjectPermissionsModalProps = {
	accountMemberOptions: AccountMemberOption[];
	mutate: () => Promise<unknown>;
	onClose: () => void;
	project: ProjectMembersRow;
};

const EditProjectPermissionsModal = ({
	accountMemberOptions,
	mutate,
	onClose,
	project,
}: EditProjectPermissionsModalProps) => {
	const {availableDesignations} = project;

	const [members, setMembers] = useState<WorkingMember[]>(
		project.members.map((member) => ({
			designations: member.designations,
			email: member.email,
			isNew: false,
			membershipId: member.membershipId,
			name: member.name,
			originalDesignations: member.designations,
			originalRoleExternalReferenceCode: member.roleExternalReferenceCode,
			removed: false,
			roleExternalReferenceCode: member.roleExternalReferenceCode,
			rowKey: `membership-${member.membershipId}`,
			userId: member.userId,
		}))
	);
	const [error, setError] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	const newRowCountRef = useRef(0);
	const submittingRef = useRef(false);

	const updateMember = (index: number, patch: Partial<WorkingMember>) =>
		setMembers((previous) =>
			previous.map((member, memberIndex) =>
				memberIndex === index ? {...member, ...patch} : member
			)
		);

	const toggleDesignation = (
		index: number,
		designationExternalReferenceCode: string
	) =>
		setMembers((previous) =>
			previous.map((member, memberIndex) =>
				memberIndex === index
					? {
							...member,
							designations: member.designations.includes(
								designationExternalReferenceCode
							)
								? member.designations.filter(
										(value) =>
											value !==
											designationExternalReferenceCode
									)
								: [
										...member.designations,
										designationExternalReferenceCode,
									],
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

		if (submittingRef.current) {
			return;
		}

		const activeMembers = members.filter((member) => !member.removed);

		if (activeMembers.some((member) => !member.userId)) {
			setError(translate('please-select-a-user-for-every-new-member'));

			return;
		}

		if (activeMembers.some((member) => !member.roleExternalReferenceCode)) {
			setError(translate('a-role-is-required-for-every-member'));

			return;
		}

		submittingRef.current = true;

		setIsSubmitting(true);

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

			await Promise.all(
				getContactRoleChanges(availableDesignations, members).map(
					({assigned, contactRoleExternalReferenceCode, userId}) =>
						assigned
							? Projects.postContactRole(
									project.externalReferenceCode,
									userId,
									contactRoleExternalReferenceCode
								)
							: Projects.deleteContactRole(
									project.externalReferenceCode,
									userId,
									contactRoleExternalReferenceCode
								)
				)
			);

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
		finally {
			submittingRef.current = false;

			setIsSubmitting(false);
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
							key={member.rowKey}
						>
							{member.isNew && !member.userId ? (
								<MemberDropDown
									onChange={(option) =>
										updateMember(index, {
											email: option.email,
											name: option.name,
											userId: option.userId,
										})
									}
									options={accountMemberOptions.filter(
										(option) =>
											!members.some(
												(m, i) =>
													i !== index &&
													!m.removed &&
													m.userId === option.userId
											)
									)}
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
								onToggleDesignation={(
									designationExternalReferenceCode
								) =>
									toggleDesignation(
										index,
										designationExternalReferenceCode
									)
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
				onClick={() => {
					newRowCountRef.current += 1;

					setMembers((previous) => [
						...previous,
						{
							designations: [],
							email: '',
							isNew: true,
							membershipId: 0,
							name: '',
							originalDesignations: [],
							originalRoleExternalReferenceCode: '',
							removed: false,
							roleExternalReferenceCode: '',
							rowKey: `new-${newRowCountRef.current}`,
							userId: 0,
						},
					]);
				}}
				type="button"
			>
				<ClayIcon className="mr-2" symbol="plus" />

				{translate('add-more-people')}
			</ClayButton>

			{error && <div className="mt-2 text-danger">{error}</div>}

			<div className="d-flex justify-content-end mt-4">
				<Button
					className="mr-3"
					disabled={isSubmitting}
					displayType="secondary"
					onClick={onClose}
					type="button"
				>
					{translate('cancel')}
				</Button>

				<Button
					disabled={isSubmitting}
					isLoading={isSubmitting}
					type="submit"
				>
					{translate('save-changes')}
				</Button>
			</div>
		</form>
	);
};

export default EditProjectPermissionsModal;
