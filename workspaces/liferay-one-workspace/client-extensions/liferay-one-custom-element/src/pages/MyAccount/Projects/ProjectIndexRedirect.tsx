/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayLoadingIndicator from '@clayui/loading-indicator';

import {useProject} from '../../../context/ProjectContext';
import i18n from '../../../i18n';

// Rendered at /:accountERC/project while ProjectProvider redirects to the last
// viewed (or first accessible) project. Shows an empty state when the user has
// no projects to redirect to.

export default function ProjectIndexRedirect() {
	const {loading, projects} = useProject();

	if (!loading && !projects.length) {
		return (
			<p className="text-neutral-7">
				{i18n.translate('no-projects-yet')}
			</p>
		);
	}

	return (
		<div className="mx-auto p-4">
			<ClayLoadingIndicator size="sm" />
		</div>
	);
}
