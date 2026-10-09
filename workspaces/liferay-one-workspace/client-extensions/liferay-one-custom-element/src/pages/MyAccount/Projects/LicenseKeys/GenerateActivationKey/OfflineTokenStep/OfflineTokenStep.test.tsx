/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {useForm} from 'react-hook-form';
import {describe, expect, it, vi} from 'vitest';

import {
	GenerateActivationKeyForm,
	GenerateActivationKeyOfflineTokenError,
} from '../types';
import OfflineTokenStep from './OfflineTokenStep';

function OfflineTokenStepWrapper({
	tokenError,
	validating = false,
}: {
	tokenError: GenerateActivationKeyOfflineTokenError | null;
	validating?: boolean;
}) {
	const form = useForm<GenerateActivationKeyForm>({
		defaultValues: {activationToken: 'TOKEN', keyType: 'production'},
	});

	return (
		<OfflineTokenStep
			form={form}
			onClickBack={vi.fn()}
			onClickCancel={vi.fn()}
			onClickContinue={vi.fn()}
			tokenError={tokenError}
			validating={validating}
		/>
	);
}

describe('OfflineTokenStep', () => {
	it('explains that an expired token must be generated again', () => {
		render(<OfflineTokenStepWrapper tokenError="expired" />);

		expect(
			screen.getByText('This activation token has expired')
		).toBeInTheDocument();
		expect(
			screen.getByText(
				'Activation tokens are valid for 90 days. Generate a new token from your Cloud Native environment, then paste it here to continue.'
			)
		).toBeInTheDocument();
		expect(screen.getByRole('textbox')).toHaveValue('TOKEN');
	});

	it('explains that an invalid token could not be verified', () => {
		render(<OfflineTokenStepWrapper tokenError="invalid" />);

		expect(
			screen.getByText("We couldn't verify this activation token")
		).toBeInTheDocument();
		expect(
			screen.getByText(
				'Make sure you copied the full token from your Cloud Native environment and try again.'
			)
		).toBeInTheDocument();
	});

	it('shows no token error without one', () => {
		render(<OfflineTokenStepWrapper tokenError={null} />);

		expect(
			screen.queryByText('This activation token has expired')
		).not.toBeInTheDocument();
		expect(
			screen.queryByText("We couldn't verify this activation token")
		).not.toBeInTheDocument();
	});

	it('disables next while the token is validated', () => {
		render(<OfflineTokenStepWrapper tokenError={null} validating />);

		expect(screen.getByRole('button', {name: 'Next'})).toBeDisabled();
	});
});
