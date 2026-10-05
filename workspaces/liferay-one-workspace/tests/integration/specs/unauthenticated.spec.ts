/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {APIRequestContext, APIResponse, expect, test} from '@playwright/test';

import {
	enumerateSpringBootRoutes,
	getMatchingMethods,
	getUnmappedMethod,
	isExcluded,
	readExcludedURLPatterns,
} from '../helpers/springBootEndpoints';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8080';

const PUBLIC_ROUTE_PATHS = [
	'/cloud/environments/{environmentId}/activation',
	'/cloud/environments/{environmentId}/manifest',
	'/cloud/products/{externalReferenceCode}/virtual-entry/{virtualEntryId}/download',
	'/invitations/accept',
	'/ready',
];

const SPRING_BOOT_BASE_URL =
	process.env.SPRING_BOOT_BASE_URL ?? 'http://localhost:58081';

const SPRING_BOOT_OAUTH_APPLICATION_ERC = 'liferay-one-etc-spring-boot-oahs';

const excludedURLPatterns = readExcludedURLPatterns();

const routes = enumerateSpringBootRoutes();

const protectedRoutes = routes.filter(
	(route) => !isExcluded(route.url, excludedURLPatterns)
);

const publicRoutes = routes.filter((route) =>
	isExcluded(route.url, excludedURLPatterns)
);

function allowedMethods(response: APIResponse): string[] {
	return (response.headers()['allow'] ?? '')
		.split(/,\s*/)
		.filter((method) => method !== 'HEAD' && method !== 'OPTIONS')
		.sort();
}

function springBoot(url: string): string {
	return `${SPRING_BOOT_BASE_URL}${url}`;
}

async function fetchSpringBootAccessToken(
	request: APIRequestContext
): Promise<string | undefined> {
	const clientSecret = process.env.SPRING_BOOT_OAUTH_CLIENT_SECRET;

	if (!clientSecret) {
		return undefined;
	}

	let clientId = process.env.SPRING_BOOT_OAUTH_CLIENT_ID;

	if (!clientId) {
		const applicationResponse = await request.get(
			`${BASE_URL}/o/oauth2/application?externalReferenceCode=${SPRING_BOOT_OAUTH_APPLICATION_ERC}`
		);

		expect(
			applicationResponse.ok(),
			await applicationResponse.text()
		).toBeTruthy();

		clientId = ((await applicationResponse.json()) as {client_id: string})
			.client_id;
	}

	const tokenResponse = await request.post(`${BASE_URL}/o/oauth2/token`, {
		form: {
			client_id: clientId,
			client_secret: clientSecret,
			grant_type: 'client_credentials',
			scope: 'Liferay.Headless.Admin.User.everything',
		},
	});

	expect(tokenResponse.ok(), await tokenResponse.text()).toBeTruthy();

	return ((await tokenResponse.json()) as {access_token: string})
		.access_token;
}

test.describe('[AUTH-UNAUTHENTICATED] Spring Boot unauthenticated access', () => {
	test('[AUTH-UNAUTHENTICATED] the controllers expose routes to probe', () => {
		expect(protectedRoutes.length).toBeGreaterThan(50);
	});

	test('[AUTH-UNAUTHENTICATED] the exclude list makes exactly the five public routes public', () => {
		expect(publicRoutes.map((route) => route.path)).toEqual(
			PUBLIC_ROUTE_PATHS
		);
	});

	test('[AUTH-UNAUTHENTICATED] every exclude pattern other than the Spring error page matches a controller route', () => {
		expect(
			excludedURLPatterns.filter(
				(pattern) =>
					!routes.some((route) => isExcluded(route.url, [pattern]))
			)
		).toEqual(['/error']);
	});

	test('[AUTH-UNAUTHENTICATED] an unmapped path answers 401, so a 401 alone does not prove a route exists', async ({
		request,
	}) => {
		const response = await request.patch(
			springBoot('/unauthenticated-probe/no-such-route')
		);

		expect(response.status()).toBe(401);
	});

	for (const route of protectedRoutes) {
		for (const method of route.methods) {
			test(`[AUTH-UNAUTHENTICATED] ${method} ${route.path} answers 401`, async ({
				request,
			}) => {
				const response = await request.fetch(springBoot(route.url), {
					method,
				});

				expect(response.status()).toBe(401);
				expect(response.headers()['www-authenticate']).toMatch(
					/^Bearer/
				);
			});
		}
	}

	for (const route of publicRoutes) {
		const matchingMethods = getMatchingMethods(route, routes);
		const unmappedMethod = getUnmappedMethod(matchingMethods, route.path);

		test(`[AUTH-UNAUTHENTICATED] ${unmappedMethod} ${route.path} answers 405 with Allow ${matchingMethods.join(', ')}`, async ({
			request,
		}) => {
			const response = await request.fetch(springBoot(route.url), {
				method: unmappedMethod,
			});

			expect(response.status()).toBe(405);
			expect(allowedMethods(response)).toEqual(matchingMethods);
		});

		for (const method of route.methods) {
			test(`[AUTH-UNAUTHENTICATED] ${method} ${route.path} does not answer 401`, async ({
				request,
			}) => {
				const response = await request.fetch(springBoot(route.url), {
					method,
				});

				expect(response.status()).not.toBe(401);
			});
		}
	}

	test.describe('route existence with a Spring Boot access token', () => {
		let accessToken: string | undefined;

		test.beforeAll(async ({playwright}) => {
			const request = await playwright.request.newContext();

			try {
				accessToken = await fetchSpringBootAccessToken(request);
			}
			finally {
				await request.dispose();
			}
		});

		test.beforeEach(() => {
			test.skip(
				!accessToken,
				'Set SPRING_BOOT_OAUTH_CLIENT_SECRET (and optionally SPRING_BOOT_OAUTH_CLIENT_ID) to the liferay-one-etc-spring-boot-oahs credentials to probe route existence'
			);
		});

		test('[AUTH-UNAUTHENTICATED] an unmapped path answers 404 with a token', async ({
			request,
		}) => {
			const response = await request.patch(
				springBoot('/unauthenticated-probe/no-such-route'),
				{headers: {Authorization: `Bearer ${accessToken}`}}
			);

			expect(response.status()).toBe(404);
		});

		for (const route of protectedRoutes) {
			const matchingMethods = getMatchingMethods(route, routes);
			const method = getUnmappedMethod(matchingMethods, route.path);

			test(`[AUTH-UNAUTHENTICATED] ${method} ${route.path} answers 405 with Allow ${matchingMethods.join(', ')}`, async ({
				request,
			}) => {
				const response = await request.fetch(springBoot(route.url), {
					headers: {Authorization: `Bearer ${accessToken}`},
					method,
				});

				expect(response.status()).toBe(405);
				expect(allowedMethods(response)).toEqual(matchingMethods);
			});
		}
	});
});
