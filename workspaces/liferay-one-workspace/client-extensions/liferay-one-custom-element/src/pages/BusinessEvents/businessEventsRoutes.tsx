/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {lazy} from 'react';
import {Navigate} from 'react-router';
import ProjectLinkRedirect from '~/components/ProjectLinkRedirect/ProjectLinkRedirect';
import ProjectRouteLayout from '~/components/ProjectRouteLayout/ProjectRouteLayout';
import ProjectRouteRedirect from '~/components/ProjectRouteRedirect/ProjectRouteRedirect';
import {AccountProvider} from '~/context/AccountContext';
import {translate} from '~/i18n';
import {getBusinessEventsPath} from '~/pages/BusinessEvents/utils/getBusinessEventsPath';
import {AppRoute} from '~/utils/routeUtils';

const BusinessEvents = lazy(() => import('./BusinessEvents'));
const BusinessEventsAdd = lazy(
	() => import('./BusinessEventsAdd/BusinessEventsAdd')
);
const BusinessEventsActivityHistory = lazy(
	() =>
		import('./BusinessEventsActivityHistory/BusinessEventsActivityHistory')
);
const BusinessEventsDetails = lazy(
	() => import('./BusinessEventsDetails/BusinessEventsDetails')
);
const BusinessEventsEdit = lazy(
	() => import('./BusinessEventsEdit/BusinessEventsEdit')
);

const TITLE = translate('business-events');

const redirect = (
	<ProjectRouteRedirect getPath={getBusinessEventsPath} title={TITLE} />
);

export const businessEventsRoutes: AppRoute[] = [
	{element: redirect, index: true},
	{
		element: (
			<ProjectLinkRedirect
				getPath={getBusinessEventsPath}
				title={TITLE}
			/>
		),
		path: ':projectERC/business-events/*',
	},
	{
		children: [
			{element: <Navigate replace to="project" />, index: true},
			{
				children: [
					{element: redirect, index: true},
					{
						children: [
							{element: <BusinessEvents />, index: true},
							{element: <BusinessEventsAdd />, path: 'add'},
							{
								children: [
									{
										element: <BusinessEventsDetails />,
										index: true,
									},
									{
										element: <BusinessEventsEdit />,
										path: 'edit',
									},
									{
										element: (
											<BusinessEventsActivityHistory />
										),
										path: 'activity-history',
									},
									{
										element: <Navigate replace to=".." />,
										path: '*',
									},
								],
								path: ':id',
							},
							{element: <Navigate replace to=".." />, path: '*'},
						],
						element: <ProjectRouteLayout title={TITLE} />,
						path: ':projectERC/business-events',
					},
					{
						element: <Navigate replace to="business-events" />,
						path: ':projectERC',
					},
				],
				path: 'project',
			},
		],
		element: <AccountProvider />,
		path: ':accountERC',
	},
	{element: <Navigate replace to="/" />, path: '*'},
];
