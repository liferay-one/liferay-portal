/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {useParams} from 'react-router';
import {useProject} from '~/context/ProjectContext';
import {toActivationKeyScope} from '~/pages/MyAccount/Projects/utils/toActivationKeyScope';

export function useActivationKeyScope() {
	const {accountERC} = useParams();
	const {projectId} = useProject();

	return useMemo(
		() => toActivationKeyScope(accountERC, projectId),
		[accountERC, projectId]
	);
}

export default useActivationKeyScope;
