/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import useSWR from 'swr';
import Cloud, {CloudOfflineEnvironment} from '~/services/spring-boot/Cloud';

const NONE: CloudOfflineEnvironment[] = [];

export function useCloudNativeOfflineEnvironments(
	projectExternalReferenceCode: string
) {
	const {data, error, isLoading} = useSWR(
		projectExternalReferenceCode
			? `/cloud/projects/${projectExternalReferenceCode}/environments` +
					'/offline'
			: null,
		() => Cloud.getProjectsEnvironmentsOffline(projectExternalReferenceCode)
	);

	return {
		environments: data?.environments ?? NONE,
		error,
		loading: isLoading,
	};
}

export default useCloudNativeOfflineEnvironments;
