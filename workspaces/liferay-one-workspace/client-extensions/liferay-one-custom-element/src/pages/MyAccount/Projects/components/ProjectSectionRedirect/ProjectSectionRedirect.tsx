/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Navigate} from 'react-router';
import Loading from '~/components/Loading/Loading';
import {useProjectItems} from '~/hooks/useProjectItems';

export default function ProjectSectionRedirect() {
	const {applications, error, loading, products} = useProjectItems();

	if (loading) {
		return <Loading.Page fill />;
	}

	if (!error && !products.length && applications.length) {
		return <Navigate replace to="applications" />;
	}

	return <Navigate replace to="products" />;
}
