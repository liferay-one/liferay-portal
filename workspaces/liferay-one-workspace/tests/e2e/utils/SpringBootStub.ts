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

/**
 * Answers the browser's calls to the Spring Boot client extension for the
 * endpoints that proxy an external system, while every other call still
 * reaches the real client extension.
 *
 * Register a handler per endpoint with `on`, using `:name` segments for path
 * parameters. A handler that holds state (a list it appends to on POST and
 * returns on GET) lets one test body run unchanged against the stub locally
 * and against the real system with `ONE_E2E_BACKEND=live`, where `on` does
 * nothing. Assert on what the journey wrote, not on canned values, when the
 * test must also pass live.
 *
 * Match the content type of the real endpoint. The portal's OAuth2 client
 * resolves an `application/json` response to the parsed body but any other
 * response to the `Response` itself, and the services in the custom element
 * are written against whichever the endpoint really sends. A controller that
 * returns `ResponseEntity<String>` sends `text/plain`, which is the default
 * here; pass `contentType: 'application/json'` for one that returns a DTO.
 */

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

	/**
	 * Returns the calls the browser made to the stubbed endpoints whose path
	 * matches, for asserting what a journey sent.
	 */

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
		catch {

			// Leave a non JSON body (a multipart upload) as text

		}

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
