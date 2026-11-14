/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useProject} from '~/context/ProjectContext';
import Cloud from '~/services/spring-boot/Cloud';

import useCloudNativeActivationCodes from '../hooks/useCloudNativeActivationCodes';
import ActivationCodesStep from './ActivationCodesStep';

vi.mock('~/context/ProjectContext', () => ({useProject: vi.fn()}));

vi.mock('~/services/spring-boot/Cloud', () => ({
	default: {
		postProjectsEnvironmentsActivationCodes: vi.fn(() => Promise.resolve()),
	},
}));

vi.mock('../hooks/useCloudNativeActivationCodes', () => ({
	default: vi.fn(),
}));

function mockActivationCodes({
	activationStatuses,
	availableCount,
}: {
	activationStatuses: string[];
	availableCount: number;
}) {
	vi.mocked(useCloudNativeActivationCodes).mockReturnValue({
		environmentTypes: [
			{
				activationCodes: activationStatuses.map(
					(activationStatus, index) => ({
						activationCode: `1a3c5e7b9d0f42648a2c4e6b8d0f135${index}`,
						activationStatus,
						environmentId: `ENV-${index}`,
						environmentName: 'Production',
					})
				),
				availableCount,
				maxClusterNodes: 5,
				totalCount: activationStatuses.length + availableCount,
				type: 'production',
				unlimited: false,
				usedCount: activationStatuses.length,
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
		mockActivationCodes({
			activationStatuses: ['active'],
			availableCount: 0,
		});

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
			screen.queryByRole('button', {name: 'Finish Online Activation'})
		).not.toBeInTheDocument();
		expect(
			Cloud.postProjectsEnvironmentsActivationCodes
		).not.toHaveBeenCalled();
	});

	it('offers a pending activation code for copy and offline activation', () => {
		mockActivationCodes({
			activationStatuses: ['pending'],
			availableCount: 0,
		});

		renderActivationCodesStep();

		expect(screen.queryByText('In Use')).not.toBeInTheDocument();
		expect(screen.getByRole('button', {name: 'Copy'})).toBeInTheDocument();
		expect(
			screen.getByRole('button', {name: 'Finish Online Activation'})
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', {name: 'click here'})
		).toBeInTheDocument();
		expect(
			screen.queryByRole('button', {
				name: 'Generate Another Activation Code',
			})
		).not.toBeInTheDocument();
	});

	it('generates another activation code while the quota has room', () => {
		mockActivationCodes({
			activationStatuses: ['pending'],
			availableCount: 1,
		});

		renderActivationCodesStep();

		expect(
			Cloud.postProjectsEnvironmentsActivationCodes
		).not.toHaveBeenCalled();

		fireEvent.click(
			screen.getByRole('button', {
				name: 'Generate Another Activation Code',
			})
		);

		expect(
			Cloud.postProjectsEnvironmentsActivationCodes
		).toHaveBeenCalledWith('PRJCT-1', 'production');
	});

	it('lists every activation code of the type', () => {
		mockActivationCodes({
			activationStatuses: ['active', 'pending'],
			availableCount: 0,
		});

		renderActivationCodesStep();

		expect(
			screen.getByText('1a3c5e7b9d0f42648a2c4e6b8d0f1350')
		).toBeInTheDocument();
		expect(
			screen.getByText('1a3c5e7b9d0f42648a2c4e6b8d0f1351')
		).toBeInTheDocument();
		expect(screen.getByText('In Use')).toBeInTheDocument();
		expect(screen.getByRole('button', {name: 'Copy'})).toBeInTheDocument();
		expect(
			screen.queryByText(
				'Every Production activation code is in use. Each activation code activates one environment.'
			)
		).not.toBeInTheDocument();
	});
});
