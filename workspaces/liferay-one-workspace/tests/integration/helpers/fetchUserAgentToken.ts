/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {APIRequestContext, expect} from '@playwright/test';
import {createHash, randomBytes} from 'crypto';

const LOGIN_PORTLET_NAMESPACE = '_com_liferay_login_web_portlet_LoginPortlet_';

const USER_AGENT_APPLICATION_ERC = 'liferay-one-etc-spring-boot-oaua';

export async function fetchUserAgentToken(
	request: APIRequestContext,
	{baseURL, password, user}: {baseURL: string; password: string; user: string}
): Promise<string> {
	const signInResponse = await request.get(`${baseURL}/c/portal/login`);

	const formAction = (await signInResponse.text()).match(
		new RegExp(`<form action="([^"]*${LOGIN_PORTLET_NAMESPACE}[^"]*)"`)
	);

	expect(formAction, 'The sign in form was not found').toBeTruthy();

	await request.post(formAction![1].replace(/&amp;/g, '&'), {
		form: {
			[`${LOGIN_PORTLET_NAMESPACE}login`]: user,
			[`${LOGIN_PORTLET_NAMESPACE}password`]: password,
		},
	});

	const applicationResponse = await request.get(
		`${baseURL}/o/oauth2/application?externalReferenceCode=${USER_AGENT_APPLICATION_ERC}`
	);

	expect(
		applicationResponse.ok(),
		await applicationResponse.text()
	).toBeTruthy();

	const {client_id: clientId} = (await applicationResponse.json()) as {
		client_id: string;
	};

	const codeVerifier = randomBytes(32).toString('base64url');
	const redirectURI = `${baseURL}/o/oauth2/redirect`;

	const authorizeResponse = await request.get(
		`${baseURL}/o/oauth2/authorize`,
		{
			maxRedirects: 0,
			params: {
				client_id: clientId,
				code_challenge: createHash('sha256')
					.update(codeVerifier)
					.digest('base64url'),
				code_challenge_method: 'S256',
				redirect_uri: redirectURI,
				response_type: 'code',
			},
		}
	);

	const location = authorizeResponse.headers()['location'] ?? '';

	const code = new URL(location, baseURL).searchParams.get('code');

	expect(
		code,
		`No authorization code was returned to ${location}`
	).toBeTruthy();

	const tokenResponse = await request.post(`${baseURL}/o/oauth2/token`, {
		form: {
			client_id: clientId,
			code: code!,
			code_verifier: codeVerifier,
			grant_type: 'authorization_code',
			redirect_uri: redirectURI,
		},
	});

	expect(tokenResponse.ok(), await tokenResponse.text()).toBeTruthy();

	const {access_token: accessToken} = (await tokenResponse.json()) as {
		access_token: string;
	};

	return accessToken;
}
