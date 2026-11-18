/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayLink from '@clayui/link';
import {useNavigate, useParams} from 'react-router';
import Table, {
	IRow,
} from '~/components/BusinessEventsTable/BusinessEventsTable';
import Loading from '~/components/Loading/Loading';
import ProjectSelector from '~/components/ProjectSelector/ProjectSelector';
import {useOneContext} from '~/context/OneContextProvider';
import {useProperties} from '~/context/PropertiesContext';
import {useConfirmationModal} from '~/hooks/useConfirmationModal';
import {useFetch} from '~/hooks/useFetch';
import {translate} from '~/i18n';
import {useProjectsWithOrders} from '~/pages/MyAccount/Projects/projects';
import useDeleteTicketAttachment from '~/pages/TicketAttachments/hooks/useDeleteTicketAttachment';
import formatFileSize from '~/pages/TicketAttachments/utils/formatFileSize';
import {getTicketAttachmentsPath} from '~/pages/TicketAttachments/utils/getTicketAttachmentsPath';
import SearchBuilder from '~/services/fetcher/SearchBuilder';
import {Liferay} from '~/services/liferay/liferay';

import type {APIResponse} from '~/types/api';

interface ITicketAttachment {
	creator: {id: number};
	dateCreated: string;
	externalReferenceCode: string;
	fileName: string;
	fileSize: string;
	id: number;
	jiraIssueKey: string;
}

const columns = [
	{
		columnKey: 'fileName',
		label: translate('file-name'),
	},
	{
		columnKey: 'jiraIssueKey',
		label: translate('ticket'),
	},
	{
		columnKey: 'fileSize',
		label: translate('size'),
	},
	{
		columnKey: 'dateCreated',
		label: translate('date-added'),
	},
	{
		columnKey: 'actions',
		label: '',
	},
];

const TicketAttachmentsList = () => {
	const confirmationModal = useConfirmationModal();

	const {userAccountModel} = useOneContext();

	const currentUserId = Liferay.ThemeDisplay.getUserId();

	const canManageAttachments = Boolean(
		userAccountModel?.isAdmin || userAccountModel?.isAccountAdministrator
	);

	const {jiraFLSPortalURL, jiraFLSProject, jiraHCPortalURL} = useProperties();

	const navigate = useNavigate();

	const {accountERC = '', projectERC = ''} = useParams();

	const {projects} = useProjectsWithOrders();

	const selectProject = (id: string) => {
		if (id !== projectERC) {
			navigate(getTicketAttachmentsPath(accountERC, id));
		}
	};

	const {
		data,
		isLoading: loading,
		revalidate,
	} = useFetch<APIResponse<ITicketAttachment>>(
		projectERC ? '/o/c/ticketattachments' : null,
		{
			params: {
				filter: SearchBuilder.eq('projectKey', projectERC),
				pageSize: 200,
				sort: 'dateCreated:desc',
			},
		}
	);

	const {deleteAttachment, loading: deletingAttachment} =
		useDeleteTicketAttachment(revalidate);

	const getTicketURL = (jiraIssueKey: string) => {
		if (jiraFLSProject && jiraIssueKey.startsWith(jiraFLSProject)) {
			return `${jiraFLSPortalURL ?? ''}/${jiraIssueKey}`;
		}

		return `${jiraHCPortalURL ?? ''}/${jiraIssueKey}`;
	};

	const header = (
		<div className="align-items-start d-flex justify-content-between">
			<div>
				<h1 className="font-weight-bold text-neutral-10">
					{translate('ticket-attachments')}
				</h1>

				<h6 className="font-weight-normal text-neutral-7">
					{translate(
						'download-large-files-associated-with-your-support-tickets'
					)}
				</h6>
			</div>

			{!!projects.length && (
				<ProjectSelector
					onSelect={selectProject}
					projects={projects}
					selectedProjectERC={projectERC}
				/>
			)}
		</div>
	);

	const attachments = data?.items ?? [];

	const handleDeleteClick = (attachment: ITicketAttachment) => {
		confirmationModal.openModal({
			body: (
				<p>
					{translate(
						'are-you-sure-you-want-to-delete-this-attachment'
					)}
				</p>
			),
			header: translate('confirm-deletion'),
			onConfirm: () => deleteAttachment(attachment.id),
		});
	};

	const rows = attachments.map((attachment) => ({
		actions: (
			<div className="d-flex justify-content-end">
				<ClayLink
					href={`#/id/${attachment.id}`}
					title={translate('download')}
				>
					{translate('download')}
				</ClayLink>

				{(canManageAttachments ||
					String(attachment.creator?.id) === currentUserId) && (
					<ClayLink
						aria-disabled={deletingAttachment}
						className="ml-3"
						displayType="danger"
						onClick={() => {
							if (!deletingAttachment) {
								handleDeleteClick(attachment);
							}
						}}
						title={translate('delete')}
					>
						{translate('delete')}
					</ClayLink>
				)}
			</div>
		),
		dateCreated: (
			<div className="text-neutral-10">
				{new Date(attachment.dateCreated).toLocaleDateString(
					undefined,
					{
						timeZone: 'UTC',
					}
				)}
			</div>
		),
		fileName: (
			<div className="font-weight-semi-bold text-neutral-10">
				{attachment.fileName}
			</div>
		),
		fileSize: (
			<div className="text-neutral-10">
				{formatFileSize(attachment.fileSize)}
			</div>
		),
		jiraIssueKey: attachment.jiraIssueKey ? (
			<ClayLink
				href={getTicketURL(attachment.jiraIssueKey)}
				target="_blank"
			>
				{attachment.jiraIssueKey}
			</ClayLink>
		) : (
			''
		),
	}));

	return (
		<div className="py-4">
			{header}

			<div className="mt-3">
				{loading ? (
					<Loading.Page />
				) : attachments.length ? (
					<Table columns={columns} rows={rows as unknown as IRow[]} />
				) : (
					<div className="p-3">
						{translate('no-ticket-attachments-were-found')}
					</div>
				)}
			</div>
		</div>
	);
};

export default TicketAttachmentsList;
