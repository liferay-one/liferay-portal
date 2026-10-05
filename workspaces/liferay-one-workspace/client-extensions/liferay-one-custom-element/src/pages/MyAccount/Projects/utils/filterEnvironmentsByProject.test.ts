/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import filterEnvironmentsByProject from './filterEnvironmentsByProject';

import type {ProjectEnvironment} from '~/hooks/useProjectEnvironments';

const environments = [
	{name: 'prd', projectExternalReferenceCode: 'PRJCT-1'},
	{name: 'uat', projectExternalReferenceCode: 'PRJCT-2'},
	{name: 'dev', projectExternalReferenceCode: 'PRJCT-1'},
] as unknown as ProjectEnvironment[];

describe('[MOD-MYACCOUNT-PROJECTS-FILTERENVIRONMENTSBYPROJECT] filterEnvironmentsByProject', () => {
	it('returns an empty list without a project external reference code', () => {
		expect(filterEnvironmentsByProject(undefined, environments)).toEqual(
			[]
		);
		expect(filterEnvironmentsByProject('', environments)).toEqual([]);
	});

	it('returns only the environments of the project', () => {
		expect(filterEnvironmentsByProject('PRJCT-1', environments)).toEqual([
			environments[0],
			environments[2],
		]);
	});
});
