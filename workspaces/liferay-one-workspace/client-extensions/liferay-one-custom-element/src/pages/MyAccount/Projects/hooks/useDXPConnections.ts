/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useFetch} from '~/hooks/useFetch';
import SearchBuilder from '~/services/fetcher/SearchBuilder';
import {Liferay} from '~/services/liferay/liferay';

import type {APIResponse} from '~/types/api';

export type Creator = {
	additionalName: string;
	contentType: string;
	externalReferenceCode: string;
	familyName: string;
	givenName: string;
	id: number;
	image: string;
	name: string;
};

type DXPConnectionAPIItem = {
	connectionSource: string;
	creator?: Creator;
	dateCreated: string;
};

export function useDXPConnections(): {
	connections: DXPConnectionAPIItem[];
	isLoading: boolean;
	isValidating: boolean;
	revalidate: () => void;
} {
	const accountId = Liferay.CommerceContext.account?.accountId;

	const {
		data: response,
		isLoading,
		isValidating,
		revalidate,
	} = useFetch<APIResponse<DXPConnectionAPIItem>>(
		accountId ? '/o/c/oauth2dxpauthorizations' : null,
		{
			params: {
				filter: SearchBuilder.eq(
					'r_accountEntryToOAuth2DxpAuthorization_accountEntryId',
					accountId as number
				),
				pageSize: 20,
				sort: 'dateCreated:desc',
			},
		}
	);

	const connections = (response?.items || []).filter(({creator}) => creator);

	return {connections, isLoading, isValidating, revalidate};
}
