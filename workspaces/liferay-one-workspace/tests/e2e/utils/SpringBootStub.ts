/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Page, Request, Route} from '@playwright/test';

import {IS_STUBBED, SPRING_BOOT_BASE_URL} from './environmentUtils';

export type StubRequest = {
	body: unknown;
	method: string;
	params: Record<string, string>;
	request: Request;
	url: URL;
};

export type StubResponse = {
	body?: unknown;
	contentType?: string;
	headers?: Record<string, string>;
	status?: number;
};

export type StubHandler =
	| StubResponse
	| ((request: StubRequest) => Promise<StubResponse> | StubResponse);

type StubRoute = {
	handler: StubHandler;
	method: string;
	paramNames: string[];
	pattern: RegExp;
	patternText: string;
};

export default class SpringBootStub {
	readonly calls: Array<{body: unknown; method: string; path: string}> = [];

	constructor(private readonly page: Page) {}

	get enabled(): boolean {
		return IS_STUBBED;
	}

	async on(
		method: string,
		path: string,
		handler: StubHandler
	): Promise<void> {
		if (!IS_STUBBED) {
			return;
		}

		const paramNames: string[] = [];

		const pattern = new RegExp(
			'^' +
				path
					.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
					.replace(/:(\w+)/g, (_match, name: string) => {
						paramNames.push(name);

						return '([^/]+)';
					}) +
				'/?$'
		);

		this._routes.unshift({
			handler,
			method: method.toUpperCase(),
			paramNames,
			pattern,
			patternText: path,
		});

		await this._install();
	}

	callsTo(method: string, path: RegExp | string) {
		return this.calls.filter(
			(call) =>
				call.method === method.toUpperCase() &&
				(typeof path === 'string'
					? call.path === path
					: path.test(call.path))
		);
	}

	private async _handle(route: Route, request: Request): Promise<void> {
		const url = new URL(request.url());

		const origin = request.headers()['origin'] ?? '*';

		const corsHeaders = {
			'Access-Control-Allow-Credentials': 'true',
			'Access-Control-Allow-Headers': '*, Authorization, Content-Type',
			'Access-Control-Allow-Methods':
				'DELETE, GET, OPTIONS, PATCH, POST, PUT',
			'Access-Control-Allow-Origin': origin,
		};

		if (request.method() === 'OPTIONS') {
			const preflightMethod =
				request.headers()['access-control-request-method'] ?? '';

			if (this._match(preflightMethod, url.pathname)) {
				await route.fulfill({headers: corsHeaders, status: 204});

				return;
			}

			await route.fallback();

			return;
		}

		const match = this._match(request.method(), url.pathname);

		if (!match) {
			await route.fallback();

			return;
		}

		let body: unknown = request.postData();

		try {
			body = request.postDataJSON();
		}
		catch {}

		this.calls.push({body, method: request.method(), path: url.pathname});

		const {handler, params} = match;

		const response =
			typeof handler === 'function'
				? await handler({
						body,
						method: request.method(),
						params,
						request,
						url,
					})
				: handler;

		const responseBody =
			response.body === undefined
				? ''
				: typeof response.body === 'string'
					? response.body
					: JSON.stringify(response.body);

		await route.fulfill({
			body: responseBody,
			contentType: response.contentType ?? 'text/plain;charset=UTF-8',
			headers: {
				...corsHeaders,
				'Content-Length': String(Buffer.byteLength(responseBody)),
				...response.headers,
			},
			status: response.status ?? 200,
		});
	}

	private async _install(): Promise<void> {
		if (this._installed) {
			return;
		}

		this._installed = true;

		await this.page.route(`${SPRING_BOOT_BASE_URL}/**`, (route, request) =>
			this._handle(route, request)
		);
	}

	private _match(method: string, pathname: string) {
		for (const route of this._routes) {
			if (route.method !== method.toUpperCase()) {
				continue;
			}

			const result = route.pattern.exec(pathname);

			if (!result) {
				continue;
			}

			const params: Record<string, string> = {};

			route.paramNames.forEach((name, index) => {
				params[name] = decodeURIComponent(result[index + 1]);
			});

			return {handler: route.handler, params};
		}

		return null;
	}

	private _installed = false;
	private readonly _routes: StubRoute[] = [];
}
