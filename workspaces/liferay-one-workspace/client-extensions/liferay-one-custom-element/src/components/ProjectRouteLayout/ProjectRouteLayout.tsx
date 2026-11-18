/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useEffect} from 'react';
import {Outlet, useParams} from 'react-router';
import Loading from '~/components/Loading/Loading';
import NoAccessPage from '~/components/NoAccessPage/NoAccessPage';
import NoProjectPage from '~/components/NoProjectPage/NoProjectPage';
import {useAccount} from '~/context/AccountContext';
import {
	getCurrentUserId,
	getSelectedAccountId,
	setLastViewedProjectCookie,
	useProjectsWithOrders,
} from '~/pages/MyAccount/Projects/projects';

export default function ProjectRouteLayout({title}: {title: string}) {
	const {projectERC = ''} = useParams();

	const {loading: accountLoading} = useAccount();

	const {
		hasAccountProjects,
		loading: projectsLoading,
		projects,
	} = useProjectsWithOrders();

	const accountId = getSelectedAccountId();
	const userId = getCurrentUserId();

	const loading = accountLoading || projectsLoading;

	const accessible = projects.some(
		(project) => project.externalReferenceCode === projectERC
	);

	useEffect(() => {
		if (accessible && !loading) {
			setLastViewedProjectCookie(accountId, projectERC, userId);
		}
	}, [accessible, accountId, loading, projectERC, userId]);

	if (loading) {
		return <Loading.Page />;
	}

	if (accessible) {
		return <Outlet />;
	}

	if (!projects.length) {
		return (
			<NoProjectPage
				hasAccountProjects={hasAccountProjects}
				title={title}
			/>
		);
	}

	return <NoAccessPage title={title} />;
}
