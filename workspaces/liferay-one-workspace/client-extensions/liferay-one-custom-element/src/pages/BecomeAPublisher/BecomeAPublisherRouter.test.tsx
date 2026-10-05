/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';

import BecomeAPublisherRouter from './BecomeAPublisherRouter';

vi.mock('./BecomeAPublisher', () => ({
	BecomeAPublisher: () => 'BecomeAPublisher page',
}));
vi.mock('./RequestAccount/RequestAccount', () => ({
	default: () => 'RequestAccount page',
}));

function renderAt(hash: string) {
	window.location.hash = hash;

	return render(<BecomeAPublisherRouter />);
}

describe('BecomeAPublisherRouter', () => {
	afterEach(() => {
		window.location.hash = '';
	});

	it('renders BecomeAPublisher at the index', () => {
		renderAt('#/');

		expect(screen.getByText('BecomeAPublisher page')).toBeInTheDocument();
		expect(
			screen.queryByText('RequestAccount page')
		).not.toBeInTheDocument();
	});

	it('[ROUTE-BECOME-A-PUBLISHER-REQUEST-ACCOUNT] renders RequestAccount for request-account', () => {
		const path = 'request-account';

		renderAt(`#/${path}`);

		expect(screen.getByText('RequestAccount page')).toBeInTheDocument();
		expect(
			screen.queryByText('BecomeAPublisher page')
		).not.toBeInTheDocument();
	});

	it('wraps the routes in the page container', () => {
		const {container} = renderAt('#/');

		expect(
			container.querySelector('.become-a-publisher-page-container')
		).toBeInTheDocument();
	});
});
