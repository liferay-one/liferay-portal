/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {getResourceSummary} from './utils';

import type {ConsoleUserProject} from '~/services/spring-boot/Console';

describe('[MOD-MYACCOUNT-PROJECTS-CLOUDAPPINSTALL] CloudAppInstall utils', () => {
	it('builds the environments, free CPU, and free RAM sentence converting MB to GB', () => {
		const project = {
			environments: [
				{isExtensionEnvironment: false, projectId: 'acme-dev'},
				{isExtensionEnvironment: false, projectId: 'acme-prd'},
			],
			rootProjectId: 'acme',
			rootProjectPlanUsage: {
				cpu: {free: 4},
				instance: {free: 1},
				memory: {free: 8000},
			},
		} as unknown as ConsoleUserProject;

		expect(getResourceSummary(project)).toBe(
			'2 Environments, 4 CPUs, 8 GB RAM'
		);
	});
});
