/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Navigate, useLocation, useParams} from 'react-router';
import Loading from '~/components/Loading/Loading';
import NoAccessPage from '~/components/NoAccessPage/NoAccessPage';
import {useFetch} from '~/hooks/useFetch';

type ProjectAPIItem = {
	r_accountEntryToProject_accountEntryERC?: string;
};

export default function ProjectLinkRedirect({
	getPath,
	title,
}: {
	getPath: (
		accountERC: string,
		projectERC: string,
		...segments: string[]
	) => string;
	title: string;
}) {
	const {'*': segments = '', projectERC = ''} = useParams();

	const {search} = useLocation();

	const {data: project, error} = useFetch<ProjectAPIItem>(
		`/o/c/projects/by-external-reference-code/${encodeURIComponent(
			projectERC
		)}?fields=r_accountEntryToProject_accountEntryERC`
	);

	const accountERC = project?.r_accountEntryToProject_accountEntryERC;

	if (accountERC) {
		return (
			<Navigate
				replace
				to={`${getPath(
					accountERC,
					projectERC,
					...segments.split('/').filter(Boolean)
				)}${search}`}
			/>
		);
	}

	if (error || project) {
		return <NoAccessPage title={title} />;
	}

	return <Loading.Page />;
}
