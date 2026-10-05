/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {getConnectionOrigin, hasExtensionEnvironment} from './utils';

import type {ConsoleUserProject} from '~/services/spring-boot/Console';

function toProject(isExtensionEnvironments: boolean[]) {
	return {
		environments: isExtensionEnvironments.map(
			(isExtensionEnvironment, index) => ({
				isExtensionEnvironment,
				projectId: `project-${index}`,
			})
		),
	} as unknown as ConsoleUserProject;
}

describe('[MOD-OAUTH2AUTHORIZE] OAuth2Authorize utils', () => {
	it('returns the value when it is exactly a URL origin', () => {
		expect(getConnectionOrigin('https://console.liferay.cloud')).toBe(
			'https://console.liferay.cloud'
		);
		expect(getConnectionOrigin('http://localhost:8080')).toBe(
			'http://localhost:8080'
		);
	});

	it('returns an empty string for a path, a trailing slash, or a bad URL', () => {
		expect(getConnectionOrigin('https://console.liferay.cloud/')).toBe('');
		expect(getConnectionOrigin('https://console.liferay.cloud/path')).toBe(
			''
		);
		expect(getConnectionOrigin('not a url')).toBe('');
	});

	it('returns an empty string for a non string or empty value', () => {
		expect(getConnectionOrigin('')).toBe('');
		expect(getConnectionOrigin(undefined)).toBe('');
		expect(getConnectionOrigin(42)).toBe('');
		expect(getConnectionOrigin({origin: 'https://a.com'})).toBe('');
	});

	it('reports an extension environment when any environment is one', () => {
		expect(hasExtensionEnvironment(toProject([false, true]))).toBe(true);
		expect(hasExtensionEnvironment(toProject([false, false]))).toBe(false);
		expect(hasExtensionEnvironment(toProject([]))).toBe(false);
	});
});
