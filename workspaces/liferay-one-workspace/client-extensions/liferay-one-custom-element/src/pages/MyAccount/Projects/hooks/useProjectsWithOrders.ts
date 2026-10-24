/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {
	getProjectExternalReferenceCode,
	getProjectName,
	useProjectOrders,
} from '~/hooks/useProjectOrders';

import {useUserProjects} from './useUserProjects';

export function useProjectsWithOrders() {
	const {
		error: ordersError,
		loading: ordersLoading,
		placedOrders,
	} = useProjectOrders();

	const {loading: projectsLoading, projects} = useUserProjects();

	const projectsWithOrders = useMemo(() => {
		if (ordersError) {
			return projects;
		}

		const projectExternalReferenceCodes = new Set<string>();
		const projectNames = new Set<string>();

		placedOrders.forEach((order) => {
			const projectExternalReferenceCode =
				getProjectExternalReferenceCode(order);

			if (projectExternalReferenceCode) {
				projectExternalReferenceCodes.add(projectExternalReferenceCode);
			}
			else {
				projectNames.add(getProjectName(order));
			}
		});

		return projects.filter(
			(project) =>
				projectExternalReferenceCodes.has(
					project.externalReferenceCode
				) || projectNames.has(project.name)
		);
	}, [ordersError, placedOrders, projects]);

	return {
		loading: ordersLoading || projectsLoading,
		projects: projectsWithOrders,
	};
}
