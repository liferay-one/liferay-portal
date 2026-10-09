/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useProject} from '~/context/ProjectContext';
import {useProjectEnvironments} from '~/hooks/useProjectEnvironments';

import SEOStudioDetails from './SEOStudioDetails';

import type {PlacedOrder} from '~/types/orders';

vi.mock('~/context/ProjectContext', () => ({useProject: vi.fn()}));

vi.mock('~/hooks/useProjectEnvironments', () => ({
	useProjectEnvironments: vi.fn(),
}));

function toPlacedOrder(
	code: number
): Pick<PlacedOrder, 'customFields' | 'orderStatusInfo'> {
	return {
		customFields: {
			'order-metadata': JSON.stringify({
				salesforceProjectId: 'PRJCT-1',
				seoStudioForm: {
					administratorEmailAddress: 'ana.ribeiro@acme.com',
				},
			}),
		},
		orderStatusInfo: {code, label: '', label_i18n: ''},
	};
}

describe('[ROUTE-MY-ACCOUNT-PRODUCTERC] SEOStudioDetails', () => {
	beforeEach(() => {
		vi.mocked(useProject).mockReturnValue({
			projectId: 'PRJCT-1',
		} as ReturnType<typeof useProject>);

		vi.mocked(useProjectEnvironments).mockReturnValue({
			environments: [
				{
					aiHubURL: 'acme.ai.hub.liferay.com',
					offering: 'AI Hub',
					projectExternalReferenceCode: 'PRJCT-1',
				},
				{
					aiHubURL: 'other.ai.hub.liferay.com',
					offering: 'AI Hub',
					projectExternalReferenceCode: 'PRJCT-2',
				},
			],
		} as ReturnType<typeof useProjectEnvironments>);
	});

	it('renders the administrator email address from the placed order', () => {
		render(<SEOStudioDetails placedOrder={toPlacedOrder(0)} />);

		expect(screen.getByText('ana.ribeiro@acme.com')).toBeInTheDocument();
	});

	it('links to the AI Hub of the project once the order is completed', () => {
		render(<SEOStudioDetails placedOrder={toPlacedOrder(0)} />);

		expect(
			screen.getByRole('link', {name: 'acme.ai.hub.liferay.com'})
		).toHaveAttribute('href', 'https://acme.ai.hub.liferay.com');
	});

	it('shows the AI Hub URL as pending until the order is completed', () => {
		render(<SEOStudioDetails placedOrder={toPlacedOrder(1)} />);

		expect(screen.queryByRole('link')).not.toBeInTheDocument();
		expect(screen.getByText('Pending')).toBeInTheDocument();
	});

	it('renders without a placed order', () => {
		render(<SEOStudioDetails />);

		expect(screen.getByText('Pending')).toBeInTheDocument();
	});
});
