/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {useParams} from 'react-router-dom';

import AppLayout from '../../components/AppLayout';
import Breadcrumb from '../../components/Breadcrumb';
import {useProject} from '../../context/ProjectContext';
import {buildNavItems} from '../../utils/routes';
import ProjectHeader from './Projects/ProjectHeader';
import ProjectSelector from './Projects/ProjectSelector';
import {isUnassignedProject} from './Projects/projects';
import {projectDetailRoutes} from './myAccountRoutes';

export default function MyAccountLayout() {
	const {accountERC} = useParams();
	const {projectId} = useProject();

	const navItems = useMemo(
		() =>
			buildNavItems(
				projectDetailRoutes,
				`/${accountERC}/project/${projectId}`
			),
		[accountERC, projectId]
	);

	// The synthetic "One-Time Purchases" bucket has no single contract, so the
	// project term and agreements header does not apply to it.

	const contentHeader = isUnassignedProject(projectId) ? undefined : (
		<ProjectHeader />
	);

	return (
		<AppLayout
			breadcrumb={<Breadcrumb />}
			contentHeader={contentHeader}
			header={<ProjectSelector />}
			navItems={navItems}
		/>
	);
}
