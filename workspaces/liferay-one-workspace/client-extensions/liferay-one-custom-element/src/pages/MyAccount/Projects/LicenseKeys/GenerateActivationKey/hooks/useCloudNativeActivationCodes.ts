/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import useSWR from 'swr';
import Cloud, {
	CloudEnvironmentActivationCodeType,
} from '~/services/spring-boot/Cloud';

import {getEnvironmentTypeRank} from '../utils';

const NONE: CloudEnvironmentActivationCodeType[] = [];

export function useCloudNativeActivationCodes(
	projectExternalReferenceCode: string
) {
	const {data, error, isLoading, mutate} = useSWR(
		projectExternalReferenceCode
			? `/cloud/projects/${projectExternalReferenceCode}/environments` +
					'/activation-codes'
			: null,
		() =>
			Cloud.getProjectsEnvironmentsActivationCodes(
				projectExternalReferenceCode
			)
	);

	const environmentTypes = useMemo(
		() =>
			[...(data?.environmentTypes ?? NONE)].sort(
				(environmentType1, environmentType2) =>
					getEnvironmentTypeRank(environmentType1.type) -
					getEnvironmentTypeRank(environmentType2.type)
			),
		[data]
	);

	return {environmentTypes, error, loading: isLoading, mutate};
}

export default useCloudNativeActivationCodes;
