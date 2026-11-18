/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Navigate, useParams} from 'react-router';
import Loading from '~/components/Loading/Loading';
import NoAccessPage from '~/components/NoAccessPage/NoAccessPage';
import NoProjectPage from '~/components/NoProjectPage/NoProjectPage';
import {useAccount} from '~/context/AccountContext';
import {useCurrentAccount} from '~/hooks/useAccounts';
import {
	getCurrentUserId,
	getLastViewedProjectCookie,
	getSelectedAccountId,
	resolveProjectERC,
	useProjectsWithOrders,
} from '~/pages/MyAccount/Projects/projects';

export default function ProjectRouteRedirect({
	getPath,
	title,
}: {
	getPath: (accountERC: string, projectERC: string) => string;
	title: string;
}) {
	const {accountERC: requestedAccountERC} = useParams();

	const {loading: accountLoading} = useAccount();

	const {data: currentAccount, isLoading: currentAccountLoading} =
		useCurrentAccount();

	const {hasAccountProjects, loading, projects} = useProjectsWithOrders();

	const accountId = getSelectedAccountId();
	const userId = getCurrentUserId();

	if (accountLoading || currentAccountLoading || loading) {
		return <Loading.Page />;
	}

	if (!projects.length) {
		return (
			<NoProjectPage
				hasAccountProjects={hasAccountProjects}
				title={title}
			/>
		);
	}

	const accountERC =
		requestedAccountERC ?? currentAccount?.externalReferenceCode;

	const projectERC = resolveProjectERC(
		projects,
		getLastViewedProjectCookie(accountId, userId)
	);

	if (!accountERC || !projectERC) {
		return <NoAccessPage title={title} />;
	}

	return <Navigate replace to={getPath(accountERC, projectERC)} />;
}
