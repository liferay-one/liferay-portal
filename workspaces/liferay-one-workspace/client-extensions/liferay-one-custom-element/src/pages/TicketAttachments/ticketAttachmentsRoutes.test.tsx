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

import type {AppRoute} from '~/utils/routeUtils';

function outletMock(label: string) {
	return async () => {
		const {Fragment, createElement} = await import('react');
		const {Outlet} = await import('react-router');

		return {
			default: () =>
				createElement(
					Fragment,
					null,
					createElement('span', null, label),
					createElement(Outlet)
				),
		};
	};
}

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
	outletMock('TicketAttachmentsLayout')
);
vi.mock('~/components/ProjectLinkRedirect/ProjectLinkRedirect', () => ({
	default: () => 'ProjectLinkRedirect',
}));
vi.mock(
	'~/components/ProjectRouteLayout/ProjectRouteLayout',
	outletMock('ProjectRouteLayout')
);
vi.mock('~/components/ProjectRouteRedirect/ProjectRouteRedirect', () => ({
	default: () => 'ProjectRouteRedirect',
}));
vi.mock('~/context/AccountContext', async () => ({
	AccountProvider: (await outletMock('AccountProvider')()).default,
}));

function TicketAttachmentsRoutesUnderTest() {
	return useRoutes(toRouteObjects(ticketAttachmentsRoutes));
}

function childPaths(route: AppRoute | undefined) {
	return route?.children?.map((child) =>
		child.index ? 'index' : child.path
	);
}

function findChild(route: AppRoute | undefined, path: string) {
	return route?.children?.find((child) => child.path === path);
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

const accountRoute = findChild(ticketAttachmentsRoutes[0], ':accountERC');

const projectRoute = findChild(accountRoute, 'project');

describe('ticketAttachmentsRoutes', () => {
	it('nests every path under one layout route', () => {
		expect(ticketAttachmentsRoutes).toHaveLength(1);
		expect(childPaths(ticketAttachmentsRoutes[0])).toEqual([
			'index',
			'new',
			'new/:ticketId',
			'erc/:ticketAttachmentERC',
			'id/:ticketAttachmentId',
			'project/:projectERC',
			':ticketId',
			':accountERC',
			'*',
		]);
	});

	it('[ROUTE-TICKET-ATTACHMENTS-PROJECT] renders / as ProjectRouteRedirect under the TicketAttachmentsLayout', async () => {
		renderAt('/');

		expect(
			await screen.findByText('ProjectRouteRedirect')
		).toBeInTheDocument();
		expect(screen.getByText('TicketAttachmentsLayout')).toBeInTheDocument();
		expect(screen.queryByText('AccountProvider')).not.toBeInTheDocument();
	});

	it('[ROUTE-TICKET-ATTACHMENTS-NEW] redirects /new to the ProjectRouteRedirect', async () => {
		renderAt('/new');

		expect(
			await screen.findByText('ProjectRouteRedirect')
		).toBeInTheDocument();
		expect(
			screen.queryByText('TicketAttachmentsUploaderOutlet page')
		).not.toBeInTheDocument();
	});

	describe('[ROUTE-TICKET-ATTACHMENTS-ACCOUNTERC] :accountERC', () => {
		it('nests the project route under AccountProvider', () => {
			expect(childPaths(accountRoute)).toEqual(['project']);
		});

		it('leaves a single segment to the uploader', async () => {
			renderAt('/ACCNT-1');

			expect(
				await screen.findByText('TicketAttachmentsUploaderOutlet page')
			).toBeInTheDocument();
			expect(
				screen.queryByText('AccountProvider')
			).not.toBeInTheDocument();
		});
	});

	describe('[ROUTE-TICKET-ATTACHMENTS-PROJECT] project', () => {
		it('nests the redirect index and the project', () => {
			expect(childPaths(projectRoute)).toEqual(['index', ':projectERC']);
		});

		it('renders ProjectRouteRedirect at its index', async () => {
			renderAt('/ACCNT-1/project');

			expect(
				await screen.findByText('ProjectRouteRedirect')
			).toBeInTheDocument();
			expect(screen.getByText('AccountProvider')).toBeInTheDocument();
		});
	});

	describe('[ROUTE-TICKET-ATTACHMENTS-PROJECTERC] :projectERC', () => {
		it('renders the list under the account and the project layout', async () => {
			renderAt('/ACCNT-1/project/PRJCT-1');

			expect(
				await screen.findByText('TicketAttachmentsList page')
			).toBeInTheDocument();
			expect(screen.getByText('AccountProvider')).toBeInTheDocument();
			expect(screen.getByText('ProjectRouteLayout')).toBeInTheDocument();
		});
	});

	describe('[ROUTE-TICKET-ATTACHMENTS-PROJECT-PROJECTERC] project/:projectERC', () => {
		it('renders ProjectLinkRedirect for a link without an account', async () => {
			renderAt('/project/PRJCT-1');

			expect(
				await screen.findByText('ProjectLinkRedirect')
			).toBeInTheDocument();
			expect(
				screen.queryByText('AccountProvider')
			).not.toBeInTheDocument();
		});
	});

	it.each([
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
