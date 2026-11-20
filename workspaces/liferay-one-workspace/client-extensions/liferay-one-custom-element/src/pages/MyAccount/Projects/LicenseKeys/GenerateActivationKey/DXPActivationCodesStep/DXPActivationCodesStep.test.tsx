/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useProject} from '~/context/ProjectContext';
import Projects from '~/services/spring-boot/Projects';

import useDXPActivationCodes from '../hooks/useDXPActivationCodes';
import DXPActivationCodesStep from './DXPActivationCodesStep';

vi.mock('~/context/ProjectContext', () => ({useProject: vi.fn()}));

vi.mock('~/services/spring-boot/Projects', () => ({
	default: {
		postDXPActivationCodes: vi.fn(() => Promise.resolve()),
	},
}));

vi.mock('../hooks/useDXPActivationCodes', () => ({
	default: vi.fn(),
}));

function mockActivationCodes({
	activationStatuses,
	availableCount,
}: {
	activationStatuses: string[];
	availableCount: number;
}) {
	vi.mocked(useDXPActivationCodes).mockReturnValue({
		environmentTypes: [
			{
				activationCodes: activationStatuses.map(
					(activationStatus, index) => ({
						activationCode: `1a3c5e7b9d0f42648a2c4e6b8d0f135${index}`,
						activationMode:
							activationStatus === 'active' ? 'online' : '',
						activationStatus,
						environmentId: `ENV-${index}`,
						installationId:
							activationStatus === 'active'
								? `C4CA4238-A0B9-3382-8DCC-509A6F75849${index}`
								: '',
					})
				),
				availableCount,
				maxClusterNodes: 3,
				totalCount: activationStatuses.length + availableCount,
				type: 'production',
				unlimited: false,
				usedCount: activationStatuses.length,
			},
		],
		error: undefined,
		loading: false,
		mutate: vi.fn(),
	} as unknown as ReturnType<typeof useDXPActivationCodes>);
}

function renderDXPActivationCodesStep(onClickOffline = vi.fn()) {
	return render(
		<DXPActivationCodesStep
			keyType="production"
			onClickBack={vi.fn()}
			onClickCancel={vi.fn()}
			onClickFinish={vi.fn()}
			onClickOffline={onClickOffline}
		/>
	);
}

describe('DXPActivationCodesStep', () => {
	beforeEach(() => {
		vi.mocked(Projects.postDXPActivationCodes).mockClear();
		vi.mocked(useProject).mockReturnValue({
			projectId: 'PRJCT-1',
		} as ReturnType<typeof useProject>);
	});

	it('shows the installation of an activation code in use', () => {
		mockActivationCodes({
			activationStatuses: ['active'],
			availableCount: 0,
		});

		renderDXPActivationCodesStep();

		expect(screen.getByText('In Use')).toBeInTheDocument();
		expect(
			screen.getByText('C4CA4238-A0B9-3382-8DCC-509A6F758490')
		).toBeInTheDocument();
		expect(
			screen.getByText(
				'Every Production activation code is in use. Each activation code activates one installation.'
			)
		).toBeInTheDocument();
		expect(
			screen.queryByRole('button', {name: 'Finish Online Activation'})
		).not.toBeInTheDocument();
		expect(Projects.postDXPActivationCodes).not.toHaveBeenCalled();
	});

	it('generates an activation code when the type has none left unused', () => {
		mockActivationCodes({
			activationStatuses: [],
			availableCount: 1,
		});

		renderDXPActivationCodesStep();

		expect(Projects.postDXPActivationCodes).toHaveBeenCalledWith(
			'PRJCT-1',
			'production'
		);
	});

	it('offers a pending activation code for offline activation', () => {
		mockActivationCodes({
			activationStatuses: ['pending'],
			availableCount: 0,
		});

		const onClickOffline = vi.fn();

		renderDXPActivationCodesStep(onClickOffline);

		expect(screen.getByRole('button', {name: 'Copy'})).toBeInTheDocument();
		expect(screen.getByText('3')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', {name: 'click here'}));

		expect(onClickOffline).toHaveBeenCalledWith(
			'1a3c5e7b9d0f42648a2c4e6b8d0f1350'
		);
	});

	it('hides a deactivated activation code', () => {
		mockActivationCodes({
			activationStatuses: ['inactive', 'pending'],
			availableCount: 0,
		});

		renderDXPActivationCodesStep();

		expect(
			screen.queryByText('1a3c5e7b9d0f42648a2c4e6b8d0f1350')
		).not.toBeInTheDocument();
		expect(
			screen.getByText('1a3c5e7b9d0f42648a2c4e6b8d0f1351')
		).toBeInTheDocument();
	});

	it('generates another activation code while the quota has room', () => {
		mockActivationCodes({
			activationStatuses: ['pending'],
			availableCount: 1,
		});

		renderDXPActivationCodesStep();

		expect(Projects.postDXPActivationCodes).not.toHaveBeenCalled();

		fireEvent.click(
			screen.getByRole('button', {
				name: 'Generate Another Activation Code',
			})
		);

		expect(Projects.postDXPActivationCodes).toHaveBeenCalledWith(
			'PRJCT-1',
			'production'
		);
	});
});
