/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {useProjectOrders} from '~/hooks/useProjectOrders';

import {getProjectsWithOrders} from '../utils/getProjectsWithOrders';
import {useUserProjects} from './useUserProjects';

export function useProjectsWithOrders() {
	const {
		error: ordersError,
		loading: ordersLoading,
		placedOrders,
	} = useProjectOrders();

	const {
		accountProjects,
		hasAccountProjects,
		loading: projectsLoading,
		projects,
	} = useUserProjects();

	const projectsWithOrders = useMemo(
		() =>
			ordersError
				? projects
				: getProjectsWithOrders(projects, placedOrders),
		[ordersError, placedOrders, projects]
	);

	const hasAccountProjectsWithOrders = useMemo(
		() =>
			ordersError
				? hasAccountProjects
				: Boolean(
						getProjectsWithOrders(accountProjects, placedOrders)
							.length
					),
		[accountProjects, hasAccountProjects, ordersError, placedOrders]
	);

	return {
		hasAccountProjects: hasAccountProjectsWithOrders,
		loading: ordersLoading || projectsLoading,
		projects: projectsWithOrders,
	};
}
