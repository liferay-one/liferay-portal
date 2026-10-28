/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayLoadingIndicator from '@clayui/loading-indicator';
import {Suspense, useMemo} from 'react';
import {Outlet, useMatch, useNavigate, useParams} from 'react-router';
import AppLayout from '~/components/AppLayout/AppLayout';
import Breadcrumb from '~/components/Breadcrumb/Breadcrumb';
import ProjectSelector from '~/components/ProjectSelector/ProjectSelector';
import {useProject} from '~/context/ProjectContext';
import {buildNavItems} from '~/utils/routeUtils';

import ProjectHeader from '../../Projects/components/ProjectHeader/ProjectHeader';
import {isUnassignedProject} from '../../Projects/projects';
import {projectDetailRoutes} from '../../myAccountRoutes';

export default function ProjectLayout() {
	const {accountERC} = useParams();
	const {projectId, projects, resolvingProjects, selectedContractERC} =
		useProject();

	const navigate = useNavigate();

	function handleSelectProject(id: string) {
		if (id !== projectId) {
			navigate(`/${accountERC}/project/${id}`);
		}
	}

	const navItems = useMemo(() => {
		const projectPath = `/${accountERC}/project/${projectId}`;

		return buildNavItems(projectDetailRoutes, projectPath).map((item) =>
			selectedContractERC && item.path === `${projectPath}/products`
				? {
						...item,
						path: `${projectPath}/contract/${selectedContractERC}/products`,
					}
				: item
		);
	}, [accountERC, projectId, selectedContractERC]);

	const contractProductsMatch = useMatch(
		'/:accountERC/project/:projectId/contract/:contractERC/products/*'
	);

	const productsMatch = useMatch(
		'/:accountERC/project/:projectId/products/*'
	);

	const standaloneMatch = useMatch(
		'/:accountERC/project/:projectId/activation/generate'
	);

	const contentHeader =
		!isUnassignedProject(projectId) &&
		(contractProductsMatch || productsMatch) ? (
			<ProjectHeader />
		) : undefined;

	if (standaloneMatch) {
		return (
			<div
				style={{
					paddingBottom: 'var(--spacer-5)',
					paddingTop: 'var(--spacer-5)',
				}}
			>
				<Suspense fallback={<ClayLoadingIndicator />}>
					<Outlet />
				</Suspense>
			</div>
		);
	}

	return (
		<AppLayout
			breadcrumb={<Breadcrumb />}
			contentHeader={contentHeader}
			header={
				<ProjectSelector
					emptyLabel="no-projects-yet"
					loading={resolvingProjects}
					onSelect={handleSelectProject}
					projects={projects}
					selectedProjectERC={projectId}
					showProjectCount
				/>
			}
			headerBackground={resolvingProjects || projects.length > 1}
			navItems={navItems}
		/>
	);
}
