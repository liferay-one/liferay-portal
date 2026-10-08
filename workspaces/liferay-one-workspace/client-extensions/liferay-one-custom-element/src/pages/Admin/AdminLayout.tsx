/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import AppLayout from '~/components/AppLayout/AppLayout';
import {NavItem} from '~/components/SideNav/SideNav';

import './Admin.css';

type AdminLayoutProps = {
	navItems: NavItem[];
};

export default function AdminLayout({navItems}: AdminLayoutProps) {
	return (
		<div className="admin-layout">
			<AppLayout navItems={navItems} />
		</div>
	);
}
