/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import AIHubRequirementsModalContent from './AIHubRequirementsModalContent';

function renderContent() {
	const onClose = vi.fn();
	const onContinue = vi.fn();

	render(
		<AIHubRequirementsModalContent
			onClose={onClose}
			onContinue={onContinue}
		/>
	);

	return {onClose, onContinue};
}

describe('AIHubRequirementsModalContent', () => {
	it('shows the product, the title, and the requirement', () => {
		renderContent();

		expect(screen.getByText('Liferay AI Hub')).toBeInTheDocument();
		expect(
			screen.getByRole('heading', {name: 'AI Hub Requirements'})
		).toBeInTheDocument();
		expect(
			screen.getByText(
				'The Liferay AI Hub requires the 2026.Q1 release of DXP or above to run.'
			)
		).toBeInTheDocument();
	});

	it('closes and continues on continue', () => {
		const {onClose, onContinue} = renderContent();

		fireEvent.click(screen.getByRole('button', {name: 'Continue'}));

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onContinue).toHaveBeenCalledTimes(1);
	});

	it.each(['Cancel', 'Close'])('closes without continuing on %s', (name) => {
		const {onClose, onContinue} = renderContent();

		fireEvent.click(screen.getByRole('button', {name}));

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onContinue).not.toHaveBeenCalled();
	});
});
