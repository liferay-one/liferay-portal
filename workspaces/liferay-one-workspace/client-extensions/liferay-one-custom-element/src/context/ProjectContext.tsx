/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ReactNode, createContext, useContext, useEffect, useMemo} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import {useUnassignedCommerce} from '../hooks/data/useProjectCommerce';
import i18n from '../i18n';
import {
	LAST_PROJECT_STORAGE_KEY,
	UNASSIGNED_PROJECT_ERC,
	UserProject,
	resolveProjectId,
	useUserProjects,
} from '../pages/MyAccount/Projects/projects';

type ProjectContextValue = {
	loading: boolean;
	projectId: string;
	projects: UserProject[];
};

const ProjectContext = createContext<ProjectContextValue>(
	{} as ProjectContextValue
);

export function ProjectProvider({children}: {children: ReactNode}) {
	const {accountERC, projectERC} = useParams();
	const navigate = useNavigate();

	const {loading: projectsLoading, projects: userProjects} =
		useUserProjects();

	const {entitlements: unassignedEntitlements, loading: unassignedLoading} =
		useUnassignedCommerce();

	// When the account has products or applications on contracts that are not
	// linked to a project, surface them through a synthetic "One-Time Purchases"
	// project appended after the real ones.

	const projects = useMemo<UserProject[]>(() => {
		if (!unassignedEntitlements.length) {
			return userProjects;
		}

		return [
			...userProjects,
			{
				externalReferenceCode: UNASSIGNED_PROJECT_ERC,
				id: -1,
				name: i18n.translate('one-time-purchases'),
				unassigned: true,
			},
		];
	}, [unassignedEntitlements.length, userProjects]);

	const loading = projectsLoading || unassignedLoading;

	const projectId = projectERC ?? '';

	const accessible = projects.some(
		(project) => project.externalReferenceCode === projectId
	);

	// The selected project lives in the URL. Persist it so it can be restored
	// as the default the next time the user lands without a project in the URL.

	useEffect(() => {
		if (accessible) {
			localStorage.setItem(LAST_PROJECT_STORAGE_KEY, projectId);
		}
	}, [accessible, projectId]);

	// When the URL has no project (or one the user cannot access), redirect to
	// the last viewed project, falling back to the first accessible one.

	useEffect(() => {
		if (loading || !projects.length || accessible) {
			return;
		}

		const lastProjectId = resolveProjectId();

		const target =
			projects.find(
				(project) => project.externalReferenceCode === lastProjectId
			) ?? projects[0];

		navigate(
			`/${accountERC}/project/${target.externalReferenceCode}/products`,
			{replace: true}
		);
	}, [accessible, accountERC, loading, navigate, projects]);

	return (
		<ProjectContext.Provider value={{loading, projectId, projects}}>
			{children}
		</ProjectContext.Provider>
	);
}

export function useProject() {
	return useContext(ProjectContext);
}
