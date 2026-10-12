/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useEffect, useState} from 'react';
import ActivationKeys, {
	ActivationKeyScope,
	GenerateForm,
} from '~/services/spring-boot/ActivationKeys';

export function useGenerateActivationKeyForm(
	scope?: ActivationKeyScope,
	renewedActivationKeyExternalReferenceCode?: string | null
) {
	const [error, setError] = useState(false);
	const [generateForm, setGenerateForm] = useState<GenerateForm>();
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!scope) {
			setError(true);
			setLoading(false);

			return;
		}

		let cancelled = false;

		setError(false);
		setLoading(true);

		ActivationKeys.getGenerateForm(
			scope,
			renewedActivationKeyExternalReferenceCode ?? undefined
		)
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
	}, [renewedActivationKeyExternalReferenceCode, scope]);

	return {error, generateForm, loading};
}

export default useGenerateActivationKeyForm;
