/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useProject} from '~/context/ProjectContext';
import Cloud from '~/services/spring-boot/Cloud';

import useCloudNativeActivationCodes from '../hooks/useCloudNativeActivationCodes';
import ActivationCodesStep from './ActivationCodesStep';

vi.mock('~/context/ProjectContext', () => ({useProject: vi.fn()}));

vi.mock('~/services/spring-boot/Cloud', () => ({
	default: {postProjectsEnvironmentsActivationCodes: vi.fn()},
}));

vi.mock('../hooks/useCloudNativeActivationCodes', () => ({
	default: vi.fn(),
}));

function mockActivationCodes({
	activationStatus,
	availableCount,
}: {
	activationStatus: string;
	availableCount: number;
}) {
	vi.mocked(useCloudNativeActivationCodes).mockReturnValue({
		environmentTypes: [
			{
				activationCodes: [
					{
						activationCode: '1a3c5e7b9d0f42648a2c4e6b8d0f1357',
						activationStatus,
						environmentId: 'ENV-1',
						environmentName: 'Production',
					},
				],
				availableCount,
				maxClusterNodes: 5,
				totalCount: 1,
				type: 'production',
				unlimited: false,
				usedCount: 1 - availableCount,
			},
		],
		error: undefined,
		loading: false,
		mutate: vi.fn(),
	} as unknown as ReturnType<typeof useCloudNativeActivationCodes>);
}

function renderActivationCodesStep() {
	return render(
		<ActivationCodesStep
			keyType="production"
			onClickBack={vi.fn()}
			onClickCancel={vi.fn()}
			onClickFinish={vi.fn()}
			onClickOffline={vi.fn()}
		/>
	);
}

describe('ActivationCodesStep', () => {
	beforeEach(() => {
		vi.mocked(useProject).mockReturnValue({
			projectId: 'PRJCT-1',
		} as ReturnType<typeof useProject>);
	});

	it('marks the activation code as in use when every code of the type is active', () => {
		mockActivationCodes({activationStatus: 'active', availableCount: 0});

		renderActivationCodesStep();

		expect(screen.getByText('In Use')).toBeInTheDocument();
		expect(
			screen.getByText(
				'Every Production activation code is in use. Each activation code activates one environment.'
			)
		).toBeInTheDocument();
		expect(
			screen.queryByRole('button', {name: 'Copy'})
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', {name: 'click here'})
		).not.toBeInTheDocument();
		expect(
			Cloud.postProjectsEnvironmentsActivationCodes
		).not.toHaveBeenCalled();
	});

	it('offers a pending activation code for copy and offline activation', () => {
		mockActivationCodes({activationStatus: 'pending', availableCount: 0});

		renderActivationCodesStep();

		expect(screen.queryByText('In Use')).not.toBeInTheDocument();
		expect(screen.getByRole('button', {name: 'Copy'})).toBeInTheDocument();
		expect(
			screen.getByRole('button', {name: 'click here'})
		).toBeInTheDocument();
	});
});
