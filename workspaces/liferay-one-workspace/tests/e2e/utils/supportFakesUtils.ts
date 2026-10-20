/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page} from '@playwright/test';

import SpringBootStub from './SpringBootStub';

export const EVENT_TYPES = ['Go Live', 'Migration', 'Other Event', 'Upgrade'];

export const PRODUCT_VERSIONS = [
	{id: '7.3', name: 'Liferay DXP 7.3'},
	{id: '7.4', name: 'Liferay DXP 7.4'},
	{id: '2025.q1', name: 'Liferay DXP 2025.Q1'},
];

export const TIME_ZONES = ['UTC +0', 'UTC -8', 'UTC +1'];

type JSONObject = Record<string, unknown>;

export type FakeBusinessEvent = {
	actualEventDate?: string;
	associatedTickets?: string;
	currentLiferayVersion: {key: string; name: string};
	description?: string;
	eventStatus: {key: string; name: string};
	eventType: {key: string; name: string};
	id: string;
	name: string;
	newLiferayVersion: {key: string; name: string};
	plannedEventDate?: string;
	timeZone: {key: string; name: string};
};

export type FakeTicket = {
	link: string;
	status: string;
	subject: string;
	ticketId: string;
};

function asString(value: unknown): string {
	if (value && typeof value === 'object' && 'key' in value) {
		return String((value as {key: unknown}).key ?? '');
	}

	return value === undefined || value === null ? '' : String(value);
}

function keyName(value: string) {
	return {key: value, name: value};
}

function versionKeyName(value: string) {
	const productVersion = PRODUCT_VERSIONS.find(({id}) => id === value);

	return {key: value, name: productVersion?.name ?? value};
}

export class FakeJira {
	readonly events = new Map<string, FakeBusinessEvent>();
	readonly tickets: FakeTicket[] = [
		{
			link: 'https://liferay.atlassian.net/servicedesk/customer/portal/1/LRHC-1001',
			status: 'Open',
			subject: 'Search results are empty after the upgrade',
			ticketId: 'LRHC-1001',
		},
		{
			link: 'https://liferay.atlassian.net/servicedesk/customer/portal/1/LRHC-1002',
			status: 'Open',
			subject: 'Login page returns an error',
			ticketId: 'LRHC-1002',
		},
	];
	readonly versions = new Map<string, JSONObject[]>();

	failDetail = false;
	failObjectKey = false;

	constructor(private readonly springBoot: SpringBootStub) {}

	addEvent(event: Partial<FakeBusinessEvent> & {name: string}) {
		const id = `${this._nextID++}`;

		const businessEvent: FakeBusinessEvent = {
			currentLiferayVersion: versionKeyName('7.4'),
			eventStatus: keyName('Open'),
			eventType: keyName('Go Live'),
			newLiferayVersion: {key: '', name: ''},
			timeZone: keyName('UTC +0'),
			...event,
			id,
		};

		this.events.set(id, businessEvent);

		this._addVersion(id, 'Created', 'New business event has been created.');

		return businessEvent;
	}

	async install(): Promise<void> {
		const {springBoot} = this;

		await springBoot.on(
			'GET',
			'/jira/business-events/fields/:fieldName/options',
			({params}) => ({
				body: {
					items: (params.fieldName === 'Event Type'
						? EVENT_TYPES
						: TIME_ZONES
					).map((value) => ({label: value, value})),
				},
			})
		);

		await springBoot.on('GET', '/jira/product-versions', {
			body: {items: PRODUCT_VERSIONS},
		});

		await springBoot.on(
			'GET',
			'/projects/:projectERC/jira/object-key',
			({params}) =>
				this.failObjectKey
					? {body: 'UNEXPECTED_ERROR', status: 500}
					: {body: `ONE-${params.projectERC}`}
		);

		await springBoot.on(
			'GET',
			'/jira/projects/:projectERC/tickets',
			() => ({
				body: {items: this.tickets},
			})
		);

		await springBoot.on(
			'GET',
			'/jira/projects/:projectERC/business-events',
			() => ({body: {items: [...this.events.values()]}})
		);

		await springBoot.on(
			'GET',
			'/jira/projects/:projectERC/business-events/:id',
			({params}) => {
				const businessEvent = this.events.get(params.id);

				if (this.failDetail || !businessEvent) {
					return {body: 'UNEXPECTED_ERROR', status: 500};
				}

				return {body: businessEvent};
			}
		);

		await springBoot.on(
			'GET',
			'/jira/projects/:projectERC/business-events/:id/versions',
			({params}) => ({body: {items: this.versions.get(params.id) ?? []}})
		);

		await springBoot.on(
			'POST',
			'/jira/projects/:projectERC/business-events',
			({body}) => {
				const data = body as JSONObject;

				this.addEvent({
					associatedTickets: asString(data.associatedTickets),
					currentLiferayVersion: versionKeyName(
						asString(data.currentLiferayVersion)
					),
					description: asString(data.description),
					eventType: keyName(asString(data.eventType)),
					name: asString(data.name),
					newLiferayVersion: versionKeyName(
						asString(data.newLiferayVersion)
					),
					plannedEventDate: asString(data.plannedEventDate),
					timeZone: keyName(asString(data.timeZone)),
				});

				return {body: {items: [...this.events.values()]}};
			}
		);

		await springBoot.on(
			'PUT',
			'/jira/projects/:projectERC/business-events/:id',
			({body, params}) => {
				const businessEvent = this.events.get(params.id);

				if (!businessEvent) {
					return {body: 'UNEXPECTED_ERROR', status: 500};
				}

				const data = body as JSONObject;

				const previousStatus = businessEvent.eventStatus.key;

				Object.assign(businessEvent, {
					actualEventDate:
						asString(data.actualEventDate) ||
						businessEvent.actualEventDate,
					associatedTickets: asString(data.associatedTickets),
					currentLiferayVersion: versionKeyName(
						asString(data.currentLiferayVersion)
					),
					description: asString(data.description),
					eventStatus: keyName(
						asString(data.eventStatus) || previousStatus
					),
					eventType: keyName(asString(data.eventType)),
					name: asString(data.name) || businessEvent.name,
					newLiferayVersion: versionKeyName(
						asString(data.newLiferayVersion)
					),
					plannedEventDate:
						asString(data.plannedEventDate) ||
						businessEvent.plannedEventDate,
					timeZone: keyName(asString(data.timeZone)),
				});

				this._addVersion(
					params.id,
					businessEvent.eventStatus.key === previousStatus
						? 'Updated'
						: businessEvent.eventStatus.key,
					asString(data.lastComment)
				);

				return {body: businessEvent};
			}
		);
	}

	private _addVersion(id: string, change: string, comment: string) {
		const versions = this.versions.get(id) ?? [];

		versions.unshift({
			author: 'e2e@liferay.com',
			change: keyName(change),
			comment,
			createdDate: new Date().toISOString(),
		});

		this.versions.set(id, versions);
	}

	private _nextID = 90001;
}

export class FakeTicketAttachmentBackend {
	accessError:
		| ''
		| 'FORBIDDEN_ACCESS'
		| 'INVALID_TICKET_NUMBER'
		| 'TICKET_IS_CLOSED' = '';
	readonly deletedIds: string[] = [];
	readonly uploadedBytes: number[] = [];

	static readonly DOWNLOAD_URL =
		'https://storage.googleapis.com/one-e2e-fake/download/attachment.txt';

	static readonly SESSION_URL =
		'https://storage.googleapis.com/one-e2e-fake/upload-session';

	constructor(
		private readonly page: Page,
		private readonly springBoot: SpringBootStub,
		private readonly deleteRecord?: (id: string) => Promise<void>
	) {}

	async install(): Promise<void> {
		const {springBoot} = this;

		const accessCheck = () => {
			if (!this.accessError) {
				return {body: ''};
			}

			return {
				body: this.accessError,
				status:
					this.accessError === 'FORBIDDEN_ACCESS'
						? 403
						: this.accessError === 'INVALID_TICKET_NUMBER'
							? 404
							: 400,
			};
		};

		await springBoot.on(
			'GET',
			'/tickets/:ticketId/ticket-attachments/upload-access-check',
			accessCheck
		);

		await springBoot.on(
			'GET',
			'/tickets/:ticketId/ticket-attachments/download-access-check',
			accessCheck
		);

		await springBoot.on('POST', '/ticket-attachments/initiate-upload', {
			body: {
				gcsSessionURL: FakeTicketAttachmentBackend.SESSION_URL,
				projectKey: 'PRJCT-001',
				ticketAttachmentId: 'e2e-fake-attachment',
			},
		});

		await springBoot.on(
			'POST',
			'/ticket-attachments/:ticketAttachmentId/complete-upload',
			{body: ''}
		);

		await springBoot.on('GET', '/ticket-attachments/by-id/:id/download', {
			body: FakeTicketAttachmentBackend.DOWNLOAD_URL,
		});

		await springBoot.on(
			'GET',
			'/ticket-attachments/by-external-reference-code/:erc/download',
			{body: FakeTicketAttachmentBackend.DOWNLOAD_URL}
		);

		await springBoot.on(
			'DELETE',
			'/ticket-attachments/:ticketAttachmentId',
			async ({params}) => {
				this.deletedIds.push(params.ticketAttachmentId);

				await this.deleteRecord?.(params.ticketAttachmentId);

				return {body: ''};
			}
		);

		if (!springBoot.enabled) {
			return;
		}

		await this.page.route(
			'https://storage.googleapis.com/one-e2e-fake/**',
			async (route, request) => {
				const corsHeaders = {
					'Access-Control-Allow-Headers': '*',
					'Access-Control-Allow-Methods': 'GET, OPTIONS, PUT',
					'Access-Control-Allow-Origin':
						request.headers()['origin'] ?? '*',
					'Access-Control-Expose-Headers': 'Range',
				};

				if (request.method() === 'OPTIONS') {
					await route.fulfill({headers: corsHeaders, status: 204});

					return;
				}

				if (request.method() === 'GET') {
					await route.fulfill({
						body: 'e2e attachment',
						contentType: 'text/plain',
						headers: {
							...corsHeaders,
							'Content-Disposition':
								'attachment; filename="attachment.txt"',
						},
					});

					return;
				}

				const size = request.postDataBuffer()?.length ?? 0;

				if (!size) {
					await route.fulfill({headers: corsHeaders, status: 308});

					return;
				}

				this.uploadedBytes.push(size);

				await route.fulfill({headers: corsHeaders, status: 200});
			}
		);
	}
}
