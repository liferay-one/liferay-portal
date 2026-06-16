/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {
	ReactNode,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from 'react';

import {
	LAST_PROJECT_STORAGE_KEY,
	UserProject,
	resolveProjectId,
	useUserProjects,
} from '../pages/MyAccount/Projects/projects';

type ProjectContextValue = {
	loading: boolean;
	projectId: string;
	projects: UserProject[];
	setProjectId: (projectId: string) => void;
};

const ProjectContext = createContext<ProjectContextValue>(
	{} as ProjectContextValue
);

export function ProjectProvider({children}: {children: ReactNode}) {
	const {loading, projects} = useUserProjects();

	const [projectId, setProjectIdState] = useState(() => resolveProjectId());

	const setProjectId = useCallback((nextProjectId: string) => {
		localStorage.setItem(LAST_PROJECT_STORAGE_KEY, nextProjectId);

		setProjectIdState(nextProjectId);
	}, []);

	useEffect(() => {
		if (loading || !projects.length) {
			return;
		}

		const accessible = projects.some(
			(project) => project.externalReferenceCode === projectId
		);

		if (!accessible) {
			setProjectId(projects[0].externalReferenceCode);
		}
	}, [loading, projectId, projects, setProjectId]);

	return (
		<ProjectContext.Provider
			value={{loading, projectId, projects, setProjectId}}
		>
			{children}
		</ProjectContext.Provider>
	);
}

export function useProject() {
	return useContext(ProjectContext);
}
