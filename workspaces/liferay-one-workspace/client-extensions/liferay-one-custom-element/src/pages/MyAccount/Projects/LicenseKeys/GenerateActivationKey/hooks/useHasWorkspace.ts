/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useProjectEnvironments} from '~/hooks/useProjectEnvironments';
import {filterEnvironmentsByProject} from '~/pages/MyAccount/Projects/utils/filterEnvironmentsByProject';

const WORKSPACE_OFFERINGS = ['AI Hub', 'Analytics Cloud'];

export function useHasWorkspace(projectExternalReferenceCode: string) {
	const {environments, loading} = useProjectEnvironments();

	const hasWorkspace = filterEnvironmentsByProject(
		projectExternalReferenceCode,
		environments
	).some(
		(environment) =>
			WORKSPACE_OFFERINGS.includes(environment.offering) &&
			Boolean(environment.workspaceName)
	);

	return {hasWorkspace, loading};
}

export default useHasWorkspace;
