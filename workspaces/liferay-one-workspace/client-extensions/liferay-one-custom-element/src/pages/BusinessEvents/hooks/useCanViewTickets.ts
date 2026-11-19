/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useCallback, useEffect, useState} from 'react';
import {fetchSpringBoot} from '~/services/spring-boot/OAuth2Client';

const useCanViewTickets = (externalReferenceCode?: string, skip?: boolean) => {
	const [canViewTickets, setCanViewTickets] = useState<boolean | undefined>(
		undefined
	);
	const [loading, setLoading] = useState<boolean>(false);

	const fetchAccountObjectKey = useCallback(async () => {
		if (skip || !externalReferenceCode) {
			return;
		}

		setLoading(true);

		try {
			const data = await fetchSpringBoot(
				`/projects/${externalReferenceCode}/jira/object-key`
			).then((response: Response) => response.text());

			setCanViewTickets(Boolean(data));
		}
		catch (error) {
			setCanViewTickets(undefined);
		}
		finally {
			setLoading(false);
		}
	}, [externalReferenceCode, skip]);

	useEffect(() => {
		fetchAccountObjectKey();
	}, [fetchAccountObjectKey]);

	return {canViewTickets, loading};
};

export default useCanViewTickets;
