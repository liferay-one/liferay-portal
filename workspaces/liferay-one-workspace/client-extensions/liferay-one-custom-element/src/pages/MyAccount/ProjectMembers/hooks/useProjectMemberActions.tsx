/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import Button from '~/components/Button/Button';
import useModalContext from '~/hooks/useModalContext';
import {translate} from '~/i18n';
import EditProjectPermissionsModal from '~/pages/MyAccount/ProjectMembers/components/EditProjectPermissionsModal/EditProjectPermissionsModal';
import InviteProjectMemberModal from '~/pages/MyAccount/ProjectMembers/components/InviteProjectMemberModal/InviteProjectMemberModal';

import type {
	AccountMemberOption,
	ProjectMembersRow,
} from '~/pages/MyAccount/ProjectMembers/types';

type UseProjectMemberActionsProps = {
	accountExternalReferenceCode: string;
	accountMemberOptions: AccountMemberOption[];
	mutate: () => Promise<unknown>;
};

export function useProjectMemberActions({
	accountExternalReferenceCode,
	accountMemberOptions,
	mutate,
}: UseProjectMemberActionsProps) {
	const modalContext = useModalContext();

	const cancelButton = (
		<Button
			displayType="secondary"
			key="cancel"
			onClick={modalContext.onClose}
		>
			{translate('cancel')}
		</Button>
	);

	const openInviteProjectMember = (project: ProjectMembersRow) => {
		modalContext.onOpenModal({
			body: (
				<InviteProjectMemberModal
					accountExternalReferenceCode={accountExternalReferenceCode}
					mutate={mutate}
					onClose={modalContext.onClose}
					project={project}
				/>
			),
			footer: [
				cancelButton,
				null,
				<Button
					form="invite-project-member"
					key="confirm"
					type="submit"
				>
					{translate('send-invitation')}
				</Button>,
			],
			header: translate('invite-project-member'),
		});
	};

	const openEditProjectPermissions = (project: ProjectMembersRow) => {
		modalContext.onOpenModal({
			body: (
				<EditProjectPermissionsModal
					accountExternalReferenceCode={accountExternalReferenceCode}
					accountMemberOptions={accountMemberOptions}
					mutate={mutate}
					onClose={modalContext.onClose}
					project={project}
				/>
			),
			footer: [
				cancelButton,
				null,
				<Button
					form="edit-project-permissions"
					key="confirm"
					type="submit"
				>
					{translate('save-changes')}
				</Button>,
			],
			header: translate('project-permissions'),
		});
	};

	return {openEditProjectPermissions, openInviteProjectMember};
}
