/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useCallback, useState} from 'react';
import {translate} from '~/i18n';
import {Liferay} from '~/services/liferay/liferay';
import {fetchSpringBoot} from '~/services/spring-boot/OAuth2Client';

const useDeleteTicketAttachment = (refetch: () => void) => {
	const [loading, setLoading] = useState(false);

	const deleteAttachment = useCallback(
		async (ticketAttachmentId: number) => {
			setLoading(true);

			try {
				const response = await fetchSpringBoot(
					`/ticket-attachments/${ticketAttachmentId}`,
					{method: 'DELETE'}
				);

				if (response.status === 200) {
					Liferay.Util.openToast({
						message: translate('attachment-deleted-successfully'),
						type: 'success',
					});

					refetch();
				}
				else {
					Liferay.Util.openToast({
						message: translate('unable-to-delete-attachment'),
						type: 'danger',
					});
				}
			}
			catch {
				Liferay.Util.openToast({
					message: translate('unable-to-delete-attachment'),
					type: 'danger',
				});
			}
			finally {
				setLoading(false);
			}
		},
		[refetch]
	);

	return {deleteAttachment, loading};
};

export default useDeleteTicketAttachment;
