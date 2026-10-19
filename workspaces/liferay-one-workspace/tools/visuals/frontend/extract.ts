/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * The weight and the dead code of the custom element. The source files that
 * no import reaches, the files that only a test reaches, and the keys with
 * no translation are actions.
 */

import {readFrontend} from './frontend.ts';

export function extract() {
	const frontend = readFrontend();

	const actions = [];

	if (frontend.files.unreachable.length) {
		actions.push({
			detail: frontend.files.unreachable.join(', '),
			severity: 'low' as const,
			source: 'client-extensions/liferay-one-custom-element/src',
			title: `${frontend.files.unreachable.length} source files that no import reaches`,
		});
	}

	if (frontend.files.testOnly.length) {
		actions.push({
			detail: `${frontend.files.testOnly.join(', ')}. Only a test imports these files, so the app does not use them.`,
			severity: 'low' as const,
			source: frontend.files.testOnly[0],
			title: `${frontend.files.testOnly.length} source files that only a test reaches`,
		});
	}

	for (const locale of frontend.languageKeys?.locales ?? []) {
		if (locale.missing) {
			actions.push({
				detail: `en_US.ts has ${locale.missing} keys that ${locale.locale}.ts does not translate, so the page shows English to those users.`,
				severity: 'low' as const,
				source: `client-extensions/liferay-one-custom-element/src/i18n/${locale.locale}.ts`,
				title: `${locale.missing} language keys have no ${locale.locale} translation`,
			});
		}
	}

	return {
		actions,
		data: {...frontend, generated: new Date().toISOString().slice(0, 10)},
		problems: [],
	};
}
