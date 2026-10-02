/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useEffect, useState} from 'react';
import {getSecurityVulnerabilityAccessCheck} from '~/services/liferay/rest/jira/Jira';

const useCheckSecurityVulnerabilitiesAccess = () => {
	const [hasAccess, setHasAccess] = useState(false);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let ignore = false;

		const fetchAccess = async () => {
			try {
				const response = await getSecurityVulnerabilityAccessCheck();

				if (!ignore) {
					setHasAccess(response.ok);
				}
			}
			catch (error) {
				console.error('Error checking access:', error);

				if (!ignore) {
					setHasAccess(false);
				}
			}
			finally {
				if (!ignore) {
					setLoading(false);
				}
			}
		};

		fetchAccess();

		return () => {
			ignore = true;
		};
	}, []);

	return {hasAccess, loading};
};

export default useCheckSecurityVulnerabilitiesAccess;
