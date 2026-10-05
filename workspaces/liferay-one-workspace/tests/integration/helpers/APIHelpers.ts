/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {APIRequestContext, APIResponse, expect} from '@playwright/test';

export interface IAPIOptions {
	baseURL?: string;
	basicAuth?: {password: string; user: string};
	oAuth2?: {clientId: string; clientSecret: string};
	springBootBaseURL?: string;
}

export type HeadlessPage<T> = {
	items: T[];
	page: number;
	pageSize: number;
	totalCount: number;
};

export class APIHelpers {
	readonly baseURL: string;
	readonly options: IAPIOptions;
	readonly request: APIRequestContext;
	readonly springBootBaseURL: string;

	private token: string | undefined;
	private tokenExpiry = 0;

	constructor(request: APIRequestContext, options: IAPIOptions = {}) {
		this.baseURL =
			options.baseURL ?? process.env.BASE_URL ?? 'http://localhost:8080';
		this.options = options;
		this.request = request;
		this.springBootBaseURL =
			options.springBootBaseURL ??
			process.env.SPRING_BOOT_BASE_URL ??
			'http://localhost:58081';
	}

	springBoot(path: string): string {
		return `${this.springBootBaseURL}${path}`;
	}

	async delete<T = unknown>(path: string): Promise<T | undefined> {
		const response = await this.request.delete(this._url(path), {
			headers: await this.headers(),
		});

		const text = await response.text();

		expect(response.ok(), text).toBeTruthy();

		if (!text) {
			return undefined;
		}

		return JSON.parse(text) as T;
	}

	async get<T = unknown>(path: string): Promise<T> {
		const response = await this.request.get(this._url(path), {
			headers: await this.headers(),
		});

		expect(response.ok(), await response.text()).toBeTruthy();

		return (await response.json()) as T;
	}

	async post<T = unknown>(path: string, body: unknown): Promise<T> {
		const response = await this.request.post(this._url(path), {
			data: body,
			headers: await this.headers(),
		});

		expect(response.ok(), await response.text()).toBeTruthy();

		return (await response.json()) as T;
	}

	async send(
		method: 'delete' | 'get' | 'patch' | 'post' | 'put',
		path: string,
		body?: unknown
	): Promise<APIResponse> {
		return this.request[method](this._url(path), {
			data: body,
			headers: await this.headers(),
		});
	}

	private _url(path: string): string {
		return /^https?:\/\//.test(path) ? path : `${this.baseURL}${path}`;
	}

	private async authHeader(): Promise<Record<string, string>> {
		if (this.options.oAuth2) {
			if (!this.token || Date.now() >= this.tokenExpiry) {
				this.token = await this.fetchOAuthToken();
			}

			return {Authorization: `Bearer ${this.token}`};
		}

		if (!this.options.basicAuth) {
			throw new Error(
				'APIHelpers: either oAuth2 or basicAuth must be configured'
			);
		}

		const {password, user} = this.options.basicAuth;
		const encoded = Buffer.from(`${user}:${password}`).toString('base64');

		return {Authorization: `Basic ${encoded}`};
	}

	private async fetchOAuthToken(): Promise<string> {
		const {clientId, clientSecret} = this.options.oAuth2!;

		const response = await this.request.post(
			`${this.baseURL}/o/oauth2/token`,
			{
				form: {
					client_id: clientId,
					client_secret: clientSecret,
					grant_type: 'client_credentials',
				},
			}
		);

		expect(response.ok(), await response.text()).toBeTruthy();

		const body = (await response.json()) as {
			access_token: string;
			expires_in?: number;
		};

		this.tokenExpiry = Date.now() + ((body.expires_in ?? 3600) - 60) * 1000;

		return body.access_token;
	}

	private async headers(): Promise<Record<string, string>> {
		return {
			...(await this.authHeader()),
			'Content-Type': 'application/json',
		};
	}
}
