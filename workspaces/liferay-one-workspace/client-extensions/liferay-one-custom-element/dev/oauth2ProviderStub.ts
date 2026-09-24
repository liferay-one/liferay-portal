/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

type AnyLiferay = {
	ThemeDisplay: {getPathContext: () => string};
};

const getLiferay = (): AnyLiferay =>
	(window as unknown as {Liferay: AnyLiferay}).Liferay;

export async function getUserAgentApplication(externalReferenceCode: string) {
	const pathContext = getLiferay().ThemeDisplay.getPathContext();

	const response = await fetch(
		`${pathContext}/o/oauth2/application` +
			`?externalReferenceCode=${externalReferenceCode}`
	);

	const data = await response.json();

	return {
		clientId: data.client_id as string,
		homePageURL: data.homePageURL as string,
		redirectURIs: data.redirectURIs as string[],
	};
}

async function getUserAgentApplicationHomePageURL(
	userAgentApplicationName: string
): Promise<string> {
	const {homePageURL} = await getUserAgentApplication(
		userAgentApplicationName
	);

	return homePageURL;
}

class DevOAuth2Client {
	private readonly _homePageURL: string;

	constructor(homePageURL: string) {
		this._homePageURL = homePageURL;
	}

	async fetch(
		resource: string,
		options: RequestInit = {}
	): Promise<Response> {
		let resourceUrl = resource;

		if (!resourceUrl.startsWith(this._homePageURL)) {
			if (resourceUrl.startsWith('/')) {
				resourceUrl = resourceUrl.substring(1);
			}

			resourceUrl = `${this._homePageURL}/${resourceUrl}`;
		}

		return fetch(resourceUrl, {...options, credentials: 'include'});
	}
}

export async function FromUserAgentApplication(
	userAgentApplicationName: string
): Promise<DevOAuth2Client> {
	const homePageURL = await getUserAgentApplicationHomePageURL(
		userAgentApplicationName
	);

	return new DevOAuth2Client(homePageURL);
}
