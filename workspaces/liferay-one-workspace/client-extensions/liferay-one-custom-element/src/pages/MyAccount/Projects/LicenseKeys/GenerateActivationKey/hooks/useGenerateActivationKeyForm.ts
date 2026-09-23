/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useEffect, useState} from 'react';
import LicenseKeys, {GenerateForm} from '~/services/spring-boot/LicenseKeys';

export function useGenerateActivationKeyForm(
	projectExternalReferenceCode: string
) {
	const [error, setError] = useState(false);
	const [generateForm, setGenerateForm] = useState<GenerateForm>();
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!projectExternalReferenceCode) {
			setError(true);
			setLoading(false);

			return;
		}

		let cancelled = false;

		setError(false);
		setLoading(true);

		LicenseKeys.getGenerateForm(projectExternalReferenceCode)
			.then((value) => {
				if (!cancelled) {
					setGenerateForm(value);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setError(true);
				}
			})
			.finally(() => {
				if (!cancelled) {
					setLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [projectExternalReferenceCode]);

	return {error, generateForm, loading};
}

export default useGenerateActivationKeyForm;
