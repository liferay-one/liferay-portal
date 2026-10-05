/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import '@testing-library/jest-dom/vitest';
import {cleanup} from '@testing-library/react';
import {afterEach} from 'vitest';

const themeDisplayStub = new Proxy(
	{},
	{
		get: (_target, property) => {
			if (property === 'getBCP47LanguageId') {
				return () => 'en-US';
			}

			if (typeof property === 'string' && property.includes('Language')) {
				return () => 'en_US';
			}

			return () => '';
		},
	}
);

(window as unknown as {Liferay: unknown}).Liferay = {
	CommerceContext: {},
	ThemeDisplay: themeDisplayStub,
	Util: {
		fetch: () =>
			Promise.resolve({
				json: () => Promise.resolve({}),
			}),
		navigate: () => {},
		openModal: () => {},
		openToast: () => {},
	},
	authToken: '',
	detach: () => {},
	fire: () => null,
	on: () => {},
};

afterEach(() => {
	cleanup();
});
