/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {APIRequestContext, APIResponse, expect} from '@playwright/test';

import {
	DEFAULT_ADMIN_EMAIL,
	DEFAULT_ADMIN_PASSWORD,
} from '../../utils/constants';

export type HeadlessPage<T> = {
	items: T[];
	lastPage?: number;
	page: number;
	pageSize: number;
	totalCount: number;
};

/**
 * Administrator access to the portal's headless APIs for e2e setup and
 * cleanup. A spec uses it to look up the environment specific ID behind a seed
 * external reference code, to create the record a journey needs, and to remove
 * what the journey created. The journey itself always runs through the
 * browser.
 */

export default class HeadlessAPI {
	constructor(readonly request: APIRequestContext) {}

	async delete(path: string): Promise<void> {
		const response = await this.request.delete(path, {
			headers: this._headers(),
		});

		await this._expectOK(response, 'DELETE', path);
	}

	/**
	 * Deletes a record during cleanup, and tolerates a record that is already
	 * gone, so a cleanup step never fails a test whose journey deleted it.
	 */

	async deleteIfExists(path: string): Promise<void> {
		const response = await this.request.delete(path, {
			headers: this._headers(),
		});

		if (response.status() !== 404) {
			await this._expectOK(response, 'DELETE', path);
		}
	}

	async get<T>(path: string): Promise<T> {
		const response = await this.request.get(path, {
			headers: this._headers(),
		});

		await this._expectOK(response, 'GET', path);

		return (await response.json()) as T;
	}

	async getAccountByERC<T = {id: number; name: string}>(
		externalReferenceCode: string
	): Promise<T> {
		return this.get<T>(
			`/o/headless-admin-user/v1.0/accounts/by-external-reference-code/${externalReferenceCode}`
		);
	}

	/**
	 * Returns the admin catalog product behind a seed external reference code.
	 * `productId` is the CProduct ID the purchase flow and the display pages
	 * use; `id` is the CPDefinition ID.
	 */

	async getProductByERC<
		T = {id: number; name: {en_US: string}; productId: number},
	>(externalReferenceCode: string): Promise<T> {
		return this.get<T>(
			`/o/headless-commerce-admin-catalog/v1.0/products/by-externalReferenceCode/${externalReferenceCode}`
		);
	}

	async patch<T>(path: string, data: unknown): Promise<T> {
		return this._send<T>('PATCH', path, data);
	}

	async post<T>(path: string, data: unknown): Promise<T> {
		return this._send<T>('POST', path, data);
	}

	async put<T>(path: string, data: unknown): Promise<T> {
		return this._send<T>('PUT', path, data);
	}

	private async _expectOK(
		response: APIResponse,
		method: string,
		path: string
	): Promise<void> {
		if (response.ok()) {
			return;
		}

		const body = await response.text().catch(() => '');

		expect(
			response.ok(),
			`${method} ${path} returned ${response.status()} ${body}`
		).toBe(true);
	}

	private _headers(): Record<string, string> {
		const credentials = Buffer.from(
			`${DEFAULT_ADMIN_EMAIL}:${DEFAULT_ADMIN_PASSWORD}`
		).toString('base64');

		return {
			Accept: 'application/json',
			Authorization: `Basic ${credentials}`,
		};
	}

	private async _send<T>(
		method: 'PATCH' | 'POST' | 'PUT',
		path: string,
		data: unknown
	): Promise<T> {
		const response = await this.request.fetch(path, {
			data,
			headers: {
				...this._headers(),
				'Content-Type': 'application/json',
			},
			method,
		});

		await this._expectOK(response, method, path);

		const text = await response.text();

		return (text ? JSON.parse(text) : undefined) as T;
	}
}
