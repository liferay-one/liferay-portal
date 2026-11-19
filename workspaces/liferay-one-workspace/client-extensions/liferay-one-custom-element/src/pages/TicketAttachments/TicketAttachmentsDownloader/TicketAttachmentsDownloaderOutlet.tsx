/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useEffect, useState} from 'react';
import {useParams} from 'react-router';
import Loading from '~/components/Loading/Loading';
import i18n from '~/i18n';
import AttachmentNotFound from '~/pages/TicketAttachments/components/TicketAttachmentsMessages/AttachmentNotFound';
import ForbiddenAccessDownload from '~/pages/TicketAttachments/components/TicketAttachmentsMessages/ForbiddenAccessDownload';
import InvalidTicketAttachment from '~/pages/TicketAttachments/components/TicketAttachmentsMessages/InvalidTicketAttachment';
import UnexpectedError from '~/pages/TicketAttachments/components/TicketAttachmentsMessages/UnexpectedError';
import useCheckAttachmentAccess from '~/pages/TicketAttachments/hooks/useCheckAttachmentAccess';
import {fetchSpringBoot} from '~/services/spring-boot/OAuth2Client';

import TicketAttachmentsDownloader from './TicketAttachmentsDownloader';

const renderErrorComponent = (errorCode: string | null) => {
	switch (errorCode) {
		case 'FORBIDDEN_ACCESS':
			return <ForbiddenAccessDownload />;
		case 'INVALID_TICKET_ATTACHMENT':
			return <InvalidTicketAttachment />;
		case 'JIRA_ORGANIZATION_ERROR':
			return <AttachmentNotFound />;
		default:
			return <UnexpectedError uploadErrorMessage="try-again-later" />;
	}
};

const TicketAttachmentsDownloaderOutlet = () => {
	const [downloadError, setDownloadError] = useState<string | null>(null);
	const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
	const [downloadUrlLoading, setDownloadUrlLoading] = useState(false);
	const {errorCode, hasAccess, loading} = useCheckAttachmentAccess();
	const {ticketAttachmentERC, ticketAttachmentId} = useParams();

	useEffect(() => {
		const fetchDownloadURL = async () => {
			setDownloadUrlLoading(true);

			try {
				const endpoint = ticketAttachmentId
					? `/ticket-attachments/by-id/${ticketAttachmentId}/download`
					: `/ticket-attachments/by-external-reference-code/${ticketAttachmentERC}/download`;

				const response = await fetchSpringBoot(endpoint);

				if (response.ok) {
					setDownloadUrl(await response.text());
				}
				else {
					setDownloadError(
						i18n.translate('error-downloading-attachment')
					);
				}
			}
			catch (error) {
				setDownloadError(
					i18n.translate('error-downloading-attachment')
				);
			}
			finally {
				setDownloadUrlLoading(false);
			}
		};

		if (hasAccess && (ticketAttachmentERC || ticketAttachmentId)) {
			fetchDownloadURL();
		}
	}, [hasAccess, ticketAttachmentERC, ticketAttachmentId]);

	if (loading || downloadUrlLoading) {
		return <Loading.Page />;
	}

	if (downloadError) {
		return renderErrorComponent(downloadError);
	}

	if (hasAccess && downloadUrl) {
		return <TicketAttachmentsDownloader downloadUrl={downloadUrl} />;
	}

	return renderErrorComponent(errorCode);
};

export default TicketAttachmentsDownloaderOutlet;
