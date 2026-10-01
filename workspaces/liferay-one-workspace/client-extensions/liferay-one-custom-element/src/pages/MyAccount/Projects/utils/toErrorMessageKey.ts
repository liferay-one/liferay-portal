/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Word} from '~/i18n';
import FetcherError from '~/services/fetcher/FetcherError';

export function toErrorMessageKey(
	error: unknown,
	errorMessageKeys: Record<number, Word>
): Word {
	if (error instanceof FetcherError && error.status) {
		return errorMessageKeys[error.status] ?? 'an-unexpected-error-occurred';
	}

	return 'an-unexpected-error-occurred';
}

export default toErrorMessageKey;
