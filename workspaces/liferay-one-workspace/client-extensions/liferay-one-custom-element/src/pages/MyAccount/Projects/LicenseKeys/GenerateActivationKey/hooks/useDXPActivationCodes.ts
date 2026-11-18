/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import useSWR from 'swr';
import Projects, {DXPActivationCodeType} from '~/services/spring-boot/Projects';

import {getDXPActivationCodeTypeRank} from '../utils';

const NONE: DXPActivationCodeType[] = [];

export function useDXPActivationCodes(projectExternalReferenceCode: string) {
	const {data, error, isLoading, mutate} = useSWR(
		projectExternalReferenceCode
			? `/projects/${projectExternalReferenceCode}/dxp/activation-codes`
			: null,
		() => Projects.getDXPActivationCodes(projectExternalReferenceCode)
	);

	const environmentTypes = useMemo(
		() =>
			[...(data?.environmentTypes ?? NONE)].sort(
				(environmentType1, environmentType2) =>
					getDXPActivationCodeTypeRank(environmentType1.type) -
					getDXPActivationCodeTypeRank(environmentType2.type)
			),
		[data]
	);

	return {environmentTypes, error, loading: isLoading, mutate};
}

export default useDXPActivationCodes;
