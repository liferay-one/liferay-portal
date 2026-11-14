/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {useForm} from 'react-hook-form';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import useEnvironmentSubscriptions from '../hooks/useEnvironmentSubscriptions';
import {GenerateActivationKeyForm} from '../types';
import OfflinePackageStep from './OfflinePackageStep';

vi.mock('../hooks/useEnvironmentSubscriptions', () => ({
	default: vi.fn(),
}));

function OfflinePackageStepWrapper({version}: {version: string}) {
	const form = useForm<GenerateActivationKeyForm>({
		defaultValues: {
			offlineEnvironment: {
				activationCode: '1a3c5e7b9d0f42648a2c4e6b8d0f1350',
				bundledEntitlementIds: [],
				environmentId: 'ENV-1',
				environmentName: 'UAT',
				requestedVersion: '',
				type: 'uat',
			},
			offlineModifying: false,
			offlineSubscriptionIds: [],
			version,
		},
	});

	return (
		<OfflinePackageStep
			form={form}
			onClickBack={vi.fn()}
			onClickCancel={vi.fn()}
			onClickDownload={vi.fn()}
			submitting={false}
			versions={['DXP 2026.Q3.8']}
		/>
	);
}

describe('OfflinePackageStep', () => {
	beforeEach(() => {
		vi.mocked(useEnvironmentSubscriptions).mockReturnValue({
			error: undefined,
			loading: false,
			subscriptions: [],
		});
	});

	it('downloads a package without add-ons', () => {
		render(<OfflinePackageStepWrapper version="DXP 2026.Q3.8" />);

		expect(
			screen.getByText(
				'There are no subscriptions entitled to this environment.'
			)
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', {name: 'Save and Download Package'})
		).toBeEnabled();
	});

	it('disables the download without a version', () => {
		render(<OfflinePackageStepWrapper version="" />);

		expect(
			screen.getByRole('button', {name: 'Save and Download Package'})
		).toBeDisabled();
	});
});
