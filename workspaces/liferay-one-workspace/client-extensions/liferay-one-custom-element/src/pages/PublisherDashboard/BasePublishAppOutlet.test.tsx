/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import BasePublishAppOutlet from './BasePublishAppOutlet';
import usePublishHeader from './hooks/usePublishHeader';
import usePublishNavigation from './hooks/usePublishNavigation';
import {PublishMode} from './pages/NewAppFlow/constants';

import type {PublishFlowContext} from './BasePublishAppOutlet';
import type {AppFlowItem} from './pages/NewAppFlow/constants';

vi.mock('~/hooks/data/useAccounts', () => ({
	useAccount: () => ({account: {name: 'Test Publisher'}}),
}));

vi.mock('~/context/PublishModeContextProvider', () => ({
	usePublishMode: () => ({mode: 'create'}),
}));

vi.mock('./hooks/usePublishHeader', () => ({
	default: vi.fn(),
}));

vi.mock('./hooks/usePublishNavigation', () => ({
	default: vi.fn(),
}));

describe('BasePublishAppOutlet', () => {
	const onSaveMock = vi.fn().mockResolvedValue(undefined);
	const onSaveAsDraftMock = vi.fn().mockResolvedValue(undefined);

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(usePublishHeader).mockReturnValue(undefined);
	});

	it('renders the agreement statement with capitalized Attention and trailing period on the last step', () => {
		const activeRoute: AppFlowItem<unknown> = {
			description: () => 'Review details',
			label: 'Submit',
			modes: [PublishMode.CREATE],
			path: 'submit',
			saveAsDraftRequired: false,
			title: () => 'Review and Submit App',
			visible: () => true,
		};

		vi.mocked(usePublishNavigation).mockReturnValue({
			activeIndex: 2,
			activeRoute,
			id: '123',
			isLastStep: true,
			onClickContinue: vi.fn(),
			onClickPrevious: vi.fn(),
			onExit: vi.fn(),
			steps: [],
		});

		const context: PublishFlowContext = {
			loading: false,
			profile: {
				name: 'Test App',
			},
		};

		render(
			<MemoryRouter>
				<BasePublishAppOutlet<PublishFlowContext>
					canSaveAsDraft={false}
					context={context}
					flowItems={[activeRoute as AppFlowItem<PublishFlowContext>]}
					isEditingApp={false}
					onClickExit={vi.fn()}
					onSave={onSaveMock}
					onSaveAsDraft={onSaveAsDraftMock}
				>
					<div>Child Outlet</div>
				</BasePublishAppOutlet>
			</MemoryRouter>
		);

		const highlight = screen.getByText('Attention: This cannot be undone.');
		expect(highlight).toBeInTheDocument();

		const agreementContainer = highlight.closest(
			'.app-review-page-agreement'
		);
		expect(agreementContainer).toBeInTheDocument();
		expect(agreementContainer?.textContent).toContain(
			'Attention: This cannot be undone.'
		);
		expect(agreementContainer?.textContent).toContain(
			'privacy(Opens a new window).'
		);

		const submitButton = screen.getByRole('button', {name: /submit/i});
		expect(submitButton).toBeDisabled();

		const checkbox = screen.getByRole('checkbox');
		fireEvent.click(checkbox);

		expect(submitButton).toBeEnabled();
	});
});
