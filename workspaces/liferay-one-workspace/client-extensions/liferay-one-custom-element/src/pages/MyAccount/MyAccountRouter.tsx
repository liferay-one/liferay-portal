/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {HashRouter, Navigate, useRoutes} from 'react-router-dom';

import ContentLayout from '../../components/ContentLayout';
import {ProjectProvider} from '../../context/ProjectContext';
import {toRouteObjects} from '../../utils/routes';
import AccountGuard from './AccountGuard';
import CurrentAccountRedirect from './CurrentAccountRedirect';
import MyAccountIndex from './MyAccountIndex';
import MyAccountLayout from './MyAccountLayout';
import ProjectIndexRedirect from './Projects/ProjectIndexRedirect';
import {accountRoutes, projectDetailRoutes} from './myAccountRoutes';

function MyAccountRoutes() {
	return useRoutes([
		{
			children: [
				{element: <MyAccountIndex />, index: true},
				{element: <CurrentAccountRedirect />, path: 'account-details'},
				{element: <CurrentAccountRedirect />, path: 'account-members'},
				{element: <CurrentAccountRedirect />, path: 'orders/*'},
				{
					children: [
						{
							element: <Navigate replace to="project" />,
							index: true,
						},
						{
							children: [
								{
									element: <ProjectIndexRedirect />,
									index: true,
								},
								{
									children:
										toRouteObjects(projectDetailRoutes),
									path: ':projectERC',
								},
							],
							element: (
								<ProjectProvider>
									<MyAccountLayout />
								</ProjectProvider>
							),
							path: 'project',
						},
						{
							children: toRouteObjects(accountRoutes),
							element: <ContentLayout />,
						},
					],
					element: <AccountGuard />,
					path: ':accountERC',
				},
				{element: <Navigate replace to="/" />, path: '*'},
			],
			path: '/',
		},
	]);
}

export default function MyAccountRouter() {
	return (
		<HashRouter>
			<MyAccountRoutes />
		</HashRouter>
	);
}
