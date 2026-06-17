/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {lazy} from 'react';
import {Navigate} from 'react-router-dom';

import {AppRoute} from '../../../utils/routes';
import Layout from './components/Layout';

const AttachmentDownloaderOutlet = lazy(
	() => import('./pages/AttachmentDownloader/AttachmentDownloaderOutlet')
);
const AttachmentUploaderOutlet = lazy(
	() => import('./pages/AttachmentUploader/AttachmentUploaderOutlet')
);
const NewAttachment = lazy(() => import('./pages/NewAttachment/NewAttachment'));
const TicketAttachmentsList = lazy(
	() => import('./pages/TicketAttachmentsList/TicketAttachmentsList')
);

export const attachmentsRoutes: AppRoute[] = [
	{
		children: [
			{element: <TicketAttachmentsList />, index: true},
			{element: <NewAttachment />, path: 'new'},
			{element: <AttachmentUploaderOutlet />, path: 'new/:ticketId'},
			{
				element: <AttachmentDownloaderOutlet />,
				path: 'erc/:ticketAttachmentERC',
			},
			{
				element: <AttachmentDownloaderOutlet />,
				path: 'id/:ticketAttachmentId',
			},
			{element: <AttachmentUploaderOutlet />, path: ':ticketId'},
			{element: <Navigate replace to="." />, path: '*'},
		],
		element: <Layout />,
	},
];
