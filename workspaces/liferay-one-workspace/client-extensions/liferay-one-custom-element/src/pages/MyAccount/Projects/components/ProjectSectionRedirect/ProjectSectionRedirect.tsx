/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayLoadingIndicator from '@clayui/loading-indicator';
import {Navigate, useParams} from 'react-router-dom';
import {useProject} from '~/context/ProjectContext';
import {
	useProjectItems,
	useProjectsWithProjectItemType,
} from '~/hooks/useProjectItems';
import {
	ONE_TIME_PURCHASES,
	isUnassignedProject,
} from '~/pages/MyAccount/Projects/projects';

export default function ProjectSectionRedirect() {
	const {accountERC} = useParams();

	const {projectId} = useProject();

	const {applications, error, loading, products} = useProjectItems();
	const {loading: projectERCsLoading, projectERCs} =
		useProjectsWithProjectItemType('application');

	if (loading || projectERCsLoading) {
		return (
			<div className="mx-auto p-4">
				<ClayLoadingIndicator size="sm" />
			</div>
		);
	}

	if (!error && !products.length) {
		if (applications.length) {
			return <Navigate replace to="applications" />;
		}

		if (
			!isUnassignedProject(projectId) &&
			projectERCs.includes(ONE_TIME_PURCHASES)
		) {
			return (
				<Navigate
					replace
					to={`/${accountERC}/project/${ONE_TIME_PURCHASES}/applications`}
				/>
			);
		}
	}

	return <Navigate replace to="products" />;
}
