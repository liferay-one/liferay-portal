/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import parseProjectId from './parseProjectId';

describe('[MOD-PARSEPROJECTID] parseProjectId', () => {
	it('splits at the last dash into project name and environment', () => {
		expect(parseProjectId('acme-portal-prd')).toEqual({
			environment: 'prd',
			projectName: 'acme-portal',
		});
	});

	it('returns the whole ID as the name without a usable dash', () => {
		expect(parseProjectId('acme')).toEqual({
			environment: '',
			projectName: 'acme',
		});
		expect(parseProjectId('-prd')).toEqual({
			environment: '',
			projectName: '-prd',
		});
	});

	it('returns empty values without an ID', () => {
		expect(parseProjectId()).toEqual({environment: '', projectName: ''});
	});
});
