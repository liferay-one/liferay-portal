/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useLayoutEffect, useMemo} from 'react';
import {HashRouter, Navigate, useRoutes} from 'react-router-dom';
import EmptyState from '~/components/EmptyState/EmptyState';
import Loading from '~/components/Loading/Loading';
import {useOneContext} from '~/context/OneContextProvider';
import i18n from '~/i18n';
import {
	buildNavItems,
	filterAccessibleRoutes,
	toRouteObjects,
} from '~/utils/routeUtils';

import AdminLayout from './AdminLayout';
import {adminRoutes} from './adminRoutes';

function AdminRoutes() {
	const {myUserAccount, userAccountModel} = useOneContext();

	useLayoutEffect(() => {
		if (!window.location.pathname.endsWith('/')) {
			window.history.replaceState(
				null,
				'',
				`${window.location.pathname}/${window.location.hash}`
			);
		}
	}, []);

	const accessibleRoutes = useMemo(
		() => filterAccessibleRoutes(adminRoutes, userAccountModel),
		[userAccountModel]
	);

	const navItems = useMemo(
		() => buildNavItems(accessibleRoutes),
		[accessibleRoutes]
	);

	const element = useRoutes([
		{
			children: [
				{
					element: navItems.length ? (
						<Navigate replace to={navItems[0].path} />
					) : (
						<EmptyState
							className="mt-5"
							description={i18n.translate(
								'you-do-not-have-access-to-this-page'
							)}
							title={i18n.translate('access-required')}
							type="NO_ACCESS"
						/>
					),
					index: true,
				},
				...toRouteObjects(accessibleRoutes),
			],
			element: <AdminLayout navItems={navItems} />,
			path: '/',
		},
	]);

	if (!myUserAccount) {
		return <Loading.Page />;
	}

	return element;
}

export default function AdminRouter() {
	return (
		<HashRouter>
			<AdminRoutes />
		</HashRouter>
	);
}
