/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {Suspense} from 'react';
import {MemoryRouter, useRoutes} from 'react-router';
import {describe, expect, it, vi} from 'vitest';
import {toRouteObjects} from '~/utils/routeUtils';

import {ticketAttachmentsRoutes} from './ticketAttachmentsRoutes';

vi.mock('./TicketAttachmentsAdd/TicketAttachmentsAdd', () => ({
	default: () => 'TicketAttachmentsAdd page',
}));
vi.mock(
	'./TicketAttachmentsDownloader/TicketAttachmentsDownloaderOutlet',
	() => ({default: () => 'TicketAttachmentsDownloaderOutlet page'})
);
vi.mock('./TicketAttachmentsList/TicketAttachmentsList', () => ({
	default: () => 'TicketAttachmentsList page',
}));
vi.mock('./TicketAttachmentsUploader/TicketAttachmentsUploaderOutlet', () => ({
	default: () => 'TicketAttachmentsUploaderOutlet page',
}));
vi.mock(
	'./components/TicketAttachmentsLayout/TicketAttachmentsLayout',
	async () => {
		const {Fragment, createElement} = await import('react');
		const {Outlet} = await import('react-router');

		return {
			default: () =>
				createElement(
					Fragment,
					null,
					createElement('span', null, 'TicketAttachmentsLayout'),
					createElement(Outlet)
				),
		};
	}
);

function TicketAttachmentsRoutesUnderTest() {
	return useRoutes(toRouteObjects(ticketAttachmentsRoutes));
}

function renderAt(pathname: string) {
	return render(
		<MemoryRouter initialEntries={[pathname]}>
			<Suspense fallback={null}>
				<TicketAttachmentsRoutesUnderTest />
			</Suspense>
		</MemoryRouter>
	);
}

describe('ticketAttachmentsRoutes', () => {
	it('nests every path under one layout route', () => {
		expect(ticketAttachmentsRoutes).toHaveLength(1);
		expect(
			ticketAttachmentsRoutes[0].children?.map((child) =>
				child.index ? 'index' : child.path
			)
		).toEqual([
			'index',
			'new',
			'new/:ticketId',
			'erc/:ticketAttachmentERC',
			'id/:ticketAttachmentId',
			':ticketId',
			'*',
		]);
	});

	it('renders / as TicketAttachmentsList page under the TicketAttachmentsLayout', async () => {
		renderAt('/');

		expect(
			await screen.findByText('TicketAttachmentsList page')
		).toBeInTheDocument();
		expect(screen.getByText('TicketAttachmentsLayout')).toBeInTheDocument();
	});

	it.each([
		['ROUTE-TICKET-ATTACHMENTS-NEW', '/new', 'TicketAttachmentsAdd page'],
		[
			'ROUTE-TICKET-ATTACHMENTS-NEW-TICKETID',
			'/new/12345',
			'TicketAttachmentsUploaderOutlet page',
		],
		[
			'ROUTE-TICKET-ATTACHMENTS-ERC-TICKETATTACHMENTERC',
			'/erc/ATTACHMENT-ERC',
			'TicketAttachmentsDownloaderOutlet page',
		],
		[
			'ROUTE-TICKET-ATTACHMENTS-ID-TICKETATTACHMENTID',
			'/id/678',
			'TicketAttachmentsDownloaderOutlet page',
		],
		[
			'ROUTE-TICKET-ATTACHMENTS-TICKETID',
			'/12345',
			'TicketAttachmentsUploaderOutlet page',
		],
	])(
		'[%s] renders %s as %s under the TicketAttachmentsLayout',
		async (_id, pathname, page) => {
			renderAt(pathname);

			expect(await screen.findByText(page)).toBeInTheDocument();
			expect(
				screen.getByText('TicketAttachmentsLayout')
			).toBeInTheDocument();
		}
	);
});
