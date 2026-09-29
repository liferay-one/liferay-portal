/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {useProjectEnvironments} from '~/hooks/useProjectEnvironments';
import {filterEnvironmentsByProject} from '~/pages/MyAccount/Projects/utils/filterEnvironmentsByProject';

import type {ProjectEnvironment} from '~/hooks/useProjectEnvironments';

const OFFERING_CLOUD_NATIVE = 'Cloud Native';

export default function useCloudNativeEnvironments(projectId: string) {
	const {environments, loading} = useProjectEnvironments();

	const cloudNativeEnvironments = useMemo(
		() =>
			filterEnvironmentsByProject(projectId, environments).filter(
				(environment: ProjectEnvironment) =>
					environment.offering === OFFERING_CLOUD_NATIVE
			),
		[environments, projectId]
	);

	return {environments: cloudNativeEnvironments, loading};
}
