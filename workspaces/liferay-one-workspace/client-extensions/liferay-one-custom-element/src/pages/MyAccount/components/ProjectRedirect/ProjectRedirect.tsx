/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Navigate, useLocation} from 'react-router-dom';
import Loading from '~/components/Loading/Loading';
import {useCurrentAccount} from '~/hooks/useAccounts';
import {
	PROJECT_SECTION_PATHS,
	isUnassignedProject,
	resolveDefaultProject,
	useUserProjects,
} from '~/pages/MyAccount/Projects/projects';
import {Liferay} from '~/services/liferay/liferay';


export default function ProjectRedirect() {
	const currentAccountId = Liferay.CommerceContext.account?.accountId;

	const {pathname, search} = useLocation();

	const {data: account, isLoading: accountLoading} = useCurrentAccount();

	const {loading: projectsLoading, projects} = useUserProjects();

	if (account && !projectsLoading) {
		const accountERC = account.externalReferenceCode;

		const segments = pathname
			.replace(/^\/project\/?/, '')
			.split('/')
			.filter(Boolean);

		const [firstSegment = '', ...restSegments] = segments;

		const sectionRequested = PROJECT_SECTION_PATHS.includes(firstSegment);

		const requestedProjectERC =
			!sectionRequested &&
			(isUnassignedProject(firstSegment) ||
				projects.some(
					(project) => project.externalReferenceCode === firstSegment
				))
				? firstSegment
				: undefined;

		const projectERC =
			requestedProjectERC ??
			resolveDefaultProject(projects)?.externalReferenceCode;

		if (!projectERC) {
			return <Navigate replace to={`/${accountERC}/project`} />;
		}

		const tab = (sectionRequested ? segments : restSegments).join('/');

		return (
			<Navigate
				replace
				to={`/${accountERC}/project/${projectERC}${tab ? `/${tab}` : ''}${search}`}
			/>
		);
	}

	if (!currentAccountId || (!accountLoading && !projectsLoading)) {
		return null;
	}

	return <Loading.Page />;
}
