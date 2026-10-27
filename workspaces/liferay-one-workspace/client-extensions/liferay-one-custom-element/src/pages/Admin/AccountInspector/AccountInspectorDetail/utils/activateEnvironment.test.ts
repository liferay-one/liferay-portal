/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import FetcherError from '~/services/fetcher/FetcherError';
import {Liferay} from '~/services/liferay/liferay';

import activateEnvironment, {
	canActivateEnvironment,
} from './activateEnvironment';

const mocks = vi.hoisted(() => ({
	postEnvironmentsManualActivation: vi.fn(),
}));

vi.mock('~/services/spring-boot/Cloud', () => ({
	default: {
		postEnvironmentsManualActivation:
			mocks.postEnvironmentsManualActivation,
	},
}));

const PENDING_SAAS_ENVIRONMENT = {
	activationStatus: 'pending',
	externalReferenceCode: 'ENV-1',
	id: 10,
	offering: 'SaaS',
};

describe('[MOD-ADMIN-ACCOUNTINSPECTOR-ACCOUNTINSPECTORDETAIL-ACTIVATEENVIRONMENT] activateEnvironment', () => {
	const openToast = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		Liferay.Util.openToast = openToast;
	});

	it('offers activation only for a pending Analytics Cloud, PaaS, or SaaS environment', () => {
		expect(
			canActivateEnvironment('environments', PENDING_SAAS_ENVIRONMENT)
		).toBe(true);
		expect(
			canActivateEnvironment('environments', {
				...PENDING_SAAS_ENVIRONMENT,
				offering: 'Analytics Cloud',
			})
		).toBe(true);
		expect(
			canActivateEnvironment('environments', {
				...PENDING_SAAS_ENVIRONMENT,
				activationStatus: 'active',
			})
		).toBe(false);
		expect(
			canActivateEnvironment('environments', {
				...PENDING_SAAS_ENVIRONMENT,
				offering: 'Cloud Native',
			})
		).toBe(false);
		expect(
			canActivateEnvironment('environments', {
				...PENDING_SAAS_ENVIRONMENT,
				externalReferenceCode: undefined,
			})
		).toBe(false);
		expect(
			canActivateEnvironment('projects', PENDING_SAAS_ENVIRONMENT)
		).toBe(false);
	});

	it('activates the environment by ERC and reports success', async () => {
		await expect(
			activateEnvironment(PENDING_SAAS_ENVIRONMENT, 'acme.liferay.net')
		).resolves.toBe(true);

		expect(mocks.postEnvironmentsManualActivation).toHaveBeenCalledWith(
			'ENV-1',
			'acme.liferay.net'
		);
		expect(openToast).toHaveBeenCalledWith(
			expect.objectContaining({type: 'success'})
		);
	});

	it('reports an environment that is already active', async () => {
		const error = new FetcherError('conflict');

		error.status = 409;

		mocks.postEnvironmentsManualActivation.mockRejectedValue(error);

		await expect(
			activateEnvironment(PENDING_SAAS_ENVIRONMENT, '')
		).resolves.toBe(false);

		expect(openToast).toHaveBeenCalledWith({
			message: 'This environment has already been activated.',
			type: 'danger',
		});
	});
});
