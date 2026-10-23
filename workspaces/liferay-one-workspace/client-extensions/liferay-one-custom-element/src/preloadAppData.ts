/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {accountsQuery, currentAccountQuery} from '~/hooks/useAccounts';
import {preloadDataQuery} from '~/hooks/useDataQuery';
import {
	accountLevelContractsQuery,
	projectContractsQuery,
	projectEntitlementsQuery,
	projectProductsQuery,
} from '~/hooks/useProjectCommerce';
import {projectOrdersQuery} from '~/hooks/useProjectOrders';
import {activationKeySummaryQuery} from '~/pages/MyAccount/Projects/LicenseKeys/hooks/useActivationKeySummary';
import {userProjectsQuery} from '~/pages/MyAccount/Projects/hooks/useUserProjects';
import {toActivationKeyScope} from '~/pages/MyAccount/Projects/utils/toActivationKeyScope';
import HeadlessAdminUser, {
	MY_USER_ACCOUNT_URL,
} from '~/services/headless/HeadlessAdminUser';
import {Liferay} from '~/services/liferay/liferay';

const ACTIVATION_SECTION = 'activation';

const MY_ACCOUNT_ROUTE = 'my-account';

const preloadedRoutes = new Set<string>();

function parseHash() {
	const [
		accountExternalReferenceCode = '',
		section = '',
		projectExternalReferenceCode = '',
		projectSection = '',
	] = window.location.hash.replace(/^#\/?/, '').split('/');

	return {
		accountExternalReferenceCode,
		projectExternalReferenceCode:
			section === 'project' ? projectExternalReferenceCode : '',
		projectSection,
	};
}

function getContractScopedProjectExternalReferenceCode(): string {
	const {projectExternalReferenceCode, projectSection} = parseHash();

	if (projectSection && projectSection !== 'products') {
		return '';
	}

	return projectExternalReferenceCode;
}

function getActivationKeyScope() {
	const {
		accountExternalReferenceCode,
		projectExternalReferenceCode,
		projectSection,
	} = parseHash();

	if (projectSection !== ACTIVATION_SECTION) {
		return undefined;
	}

	return toActivationKeyScope(
		accountExternalReferenceCode,
		projectExternalReferenceCode
	);
}

export default function preloadAppData(route: string) {
	const accountId = Liferay.CommerceContext?.account?.accountId;

	if (
		!Liferay.ThemeDisplay.isSignedIn() ||
		!accountId ||
		preloadedRoutes.has(route)
	) {
		return;
	}

	preloadedRoutes.add(route);

	preloadDataQuery({
		fetcher: HeadlessAdminUser.getMyUserAccount,
		key: MY_USER_ACCOUNT_URL,
	});
	const currentAccount = preloadDataQuery(currentAccountQuery(accountId));
	preloadDataQuery(accountsQuery(accountId));

	if (route !== MY_ACCOUNT_ROUTE) {
		return;
	}

	preloadDataQuery(userProjectsQuery(accountId));
	preloadDataQuery(accountLevelContractsQuery(accountId));
	preloadDataQuery(
		projectContractsQuery(parseHash().projectExternalReferenceCode)
	);
	preloadDataQuery(
		projectEntitlementsQuery(
			getContractScopedProjectExternalReferenceCode()
		)
	);
	currentAccount
		?.then((account) => {
			if (account?.externalReferenceCode) {
				preloadDataQuery(
					projectProductsQuery(account.externalReferenceCode)
				);
			}
		})
		.catch(() => undefined);

	const activationKeyScope = getActivationKeyScope();

	if (activationKeyScope) {
		preloadDataQuery(activationKeySummaryQuery(activationKeyScope));
	}

	preloadDataQuery(projectOrdersQuery(accountId));
}
