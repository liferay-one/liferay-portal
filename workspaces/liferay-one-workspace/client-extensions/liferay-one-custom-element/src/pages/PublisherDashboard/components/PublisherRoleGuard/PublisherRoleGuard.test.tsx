/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {afterEach, describe, expect, it, vi} from 'vitest';

import usePublisherPermissions from '../../hooks/usePublisherPermissions';
import PublisherRoleGuard from './PublisherRoleGuard';

vi.mock('../../hooks/usePublisherPermissions', () => ({
	default: vi.fn(),
}));

function renderGuard(flow: 'app' | 'solution') {
	return render(
		<MemoryRouter>
			<PublisherRoleGuard flow={flow}>
				<span>Publish form</span>
			</PublisherRoleGuard>
		</MemoryRouter>
	);
}

describe('[COMPONENT-PUBLISHERDASHBOARD-PUBLISHERROLEGUARD] PublisherRoleGuard', () => {
	afterEach(() => {
		vi.resetAllMocks();
	});

	it('renders the app form for an app publisher', () => {
		vi.mocked(usePublisherPermissions).mockReturnValue({
			canPublishApps: true,
			canPublishSolutions: false,
		});

		renderGuard('app');

		expect(screen.getByText('Publish form')).toBeInTheDocument();
	});

	it('blocks the app form without the app publisher role', () => {
		vi.mocked(usePublisherPermissions).mockReturnValue({
			canPublishApps: false,
			canPublishSolutions: true,
		});

		renderGuard('app');

		expect(screen.queryByText('Publish form')).not.toBeInTheDocument();
		expect(screen.getByText('Access required.')).toBeInTheDocument();
		expect(
			screen.getByText('You do not have access to this page.')
		).toBeInTheDocument();
	});

	it('blocks the solution form without the solution publisher role', () => {
		vi.mocked(usePublisherPermissions).mockReturnValue({
			canPublishApps: true,
			canPublishSolutions: false,
		});

		renderGuard('solution');

		expect(screen.queryByText('Publish form')).not.toBeInTheDocument();
		expect(screen.getByText('Access required.')).toBeInTheDocument();
	});
});
