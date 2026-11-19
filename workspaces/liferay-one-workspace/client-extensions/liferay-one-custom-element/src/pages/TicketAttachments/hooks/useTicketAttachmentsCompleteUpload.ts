/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useCallback, useState} from 'react';
import {fetchSpringBoot} from '~/services/spring-boot/OAuth2Client';

interface IParams {
	comment: string;
	fileMd5: string;
	ticketAttachmentId: string;
}

interface IProps {
	completeUpload: (params: IParams) => Promise<void>;
	loading: boolean;
}

const useTicketAttachmentsCompleteUpload = (): IProps => {
	const [loading, setLoading] = useState(false);

	const completeUpload = useCallback(async (params: IParams) => {
		setLoading(true);

		const {comment, fileMd5, ticketAttachmentId} = params;

		try {
			const response: Response = (await fetchSpringBoot(
				`/ticket-attachments/${ticketAttachmentId}/complete-upload`,
				{
					body: JSON.stringify({
						commentBody: comment,
					}),
					method: 'POST',
				}
			)) as unknown as Response;

			if (!response.ok) {
				throw new Error(
					`Failed to complete upload: ${response.text()}`
				);
			}

			sessionStorage.removeItem(`gcsSessionURL:${fileMd5}`);
		}
		finally {
			setLoading(false);
		}
	}, []);

	return {completeUpload, loading};
};

export default useTicketAttachmentsCompleteUpload;
