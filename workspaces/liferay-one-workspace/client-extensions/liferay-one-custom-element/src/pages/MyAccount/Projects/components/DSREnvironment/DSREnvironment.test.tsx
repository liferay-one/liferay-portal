/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import DigitalSalesRoom from '~/services/spring-boot/DigitalSalesRoom';

import DSREnvironment from './DSREnvironment';

import type {ProjectEnvironment} from '~/hooks/useProjectEnvironments';

vi.mock('~/services/spring-boot/DigitalSalesRoom', () => ({
	default: {getEnvironmentsDataSourceToken: vi.fn()},
}));

function toEnvironment(
	environment: Partial<ProjectEnvironment>
): ProjectEnvironment {
	return {
		externalReferenceCode: 'DSR-PRJCT-1',
		ownerEmailAddress: '',
		region: '',
		workspaceName: '',
		...environment,
	} as ProjectEnvironment;
}

describe('[ROUTE-MY-ACCOUNT-PRODUCTERC] DSREnvironment', () => {
	beforeEach(() => {
		vi.mocked(DigitalSalesRoom.getEnvironmentsDataSourceToken).mockReset();
	});

	it('renders the token read for the environment', async () => {
		vi.mocked(
			DigitalSalesRoom.getEnvironmentsDataSourceToken
		).mockResolvedValue({dataSourceAccessToken: 'token-1'});

		render(
			<DSREnvironment
				environment={toEnvironment({
					ownerEmailAddress: 'owner@acme.com',
					workspaceName: 'Acme Sales Room',
				})}
			/>
		);

		expect(await screen.findByDisplayValue('token-1')).toBeInTheDocument();
		expect(screen.getByText('Acme Sales Room')).toBeInTheDocument();
		expect(screen.queryByText('owner@acme.com')).not.toBeInTheDocument();
		expect(
			DigitalSalesRoom.getEnvironmentsDataSourceToken
		).toHaveBeenCalledWith('DSR-PRJCT-1');
	});

	it('reads the token again every time the tab opens', async () => {
		vi.mocked(DigitalSalesRoom.getEnvironmentsDataSourceToken)
			.mockResolvedValueOnce({dataSourceAccessToken: 'token-1'})
			.mockResolvedValueOnce({dataSourceAccessToken: 'token-2'});

		const {unmount} = render(
			<DSREnvironment environment={toEnvironment({})} />
		);

		expect(await screen.findByDisplayValue('token-1')).toBeInTheDocument();

		unmount();

		render(<DSREnvironment environment={toEnvironment({})} />);

		expect(await screen.findByDisplayValue('token-2')).toBeInTheDocument();
	});

	it('shows an error when the token cannot be read', async () => {
		vi.mocked(
			DigitalSalesRoom.getEnvironmentsDataSourceToken
		).mockRejectedValue(new Error('Not Found'));

		render(<DSREnvironment environment={toEnvironment({})} />);

		expect(
			await screen.findByText('Unable to load the token.')
		).toBeInTheDocument();
		expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
	});
});
