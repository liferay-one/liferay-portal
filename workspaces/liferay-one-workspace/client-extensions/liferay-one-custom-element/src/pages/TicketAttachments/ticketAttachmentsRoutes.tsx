/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {lazy} from 'react';
import {Navigate} from 'react-router';
import ProjectLinkRedirect from '~/components/ProjectLinkRedirect/ProjectLinkRedirect';
import ProjectRouteLayout from '~/components/ProjectRouteLayout/ProjectRouteLayout';
import ProjectRouteRedirect from '~/components/ProjectRouteRedirect/ProjectRouteRedirect';
import {AccountProvider} from '~/context/AccountContext';
import {translate} from '~/i18n';
import {getTicketAttachmentsPath} from '~/pages/TicketAttachments/utils/getTicketAttachmentsPath';
import {AppRoute} from '~/utils/routeUtils';

import TicketAttachmentsLayout from './components/TicketAttachmentsLayout/TicketAttachmentsLayout';

const TicketAttachmentsDownloaderOutlet = lazy(
	() =>
		import(
			'./TicketAttachmentsDownloader/TicketAttachmentsDownloaderOutlet'
		)
);
const TicketAttachmentsList = lazy(
	() => import('./TicketAttachmentsList/TicketAttachmentsList')
);
const TicketAttachmentsUploaderOutlet = lazy(
	() => import('./TicketAttachmentsUploader/TicketAttachmentsUploaderOutlet')
);

const TITLE = translate('ticket-attachments');

const redirect = (
	<ProjectRouteRedirect getPath={getTicketAttachmentsPath} title={TITLE} />
);

export const ticketAttachmentsRoutes: AppRoute[] = [
	{
		children: [
			{element: redirect, index: true},
			{element: <Navigate replace to=".." />, path: 'new'},
			{
				element: <TicketAttachmentsUploaderOutlet />,
				path: 'new/:ticketId',
			},
			{
				element: <TicketAttachmentsDownloaderOutlet />,
				path: 'erc/:ticketAttachmentERC',
			},
			{
				element: <TicketAttachmentsDownloaderOutlet />,
				path: 'id/:ticketAttachmentId',
			},
			{
				element: (
					<ProjectLinkRedirect
						getPath={getTicketAttachmentsPath}
						title={TITLE}
					/>
				),
				path: 'project/:projectERC',
			},
			{element: <TicketAttachmentsUploaderOutlet />, path: ':ticketId'},
			{
				children: [
					{
						children: [
							{element: redirect, index: true},
							{
								children: [
									{
										element: <TicketAttachmentsList />,
										index: true,
									},
								],
								element: <ProjectRouteLayout title={TITLE} />,
								path: ':projectERC',
							},
						],
						path: 'project',
					},
				],
				element: <AccountProvider />,
				path: ':accountERC',
			},
			{element: <Navigate replace to=".." />, path: '*'},
		],
		element: <TicketAttachmentsLayout />,
	},
];
