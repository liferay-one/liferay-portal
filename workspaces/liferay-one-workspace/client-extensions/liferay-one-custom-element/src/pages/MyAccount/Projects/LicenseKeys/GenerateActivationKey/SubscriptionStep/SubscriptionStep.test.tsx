/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {useForm} from 'react-hook-form';
import {describe, expect, it, vi} from 'vitest';

import {GenerateActivationKeyForm} from '../types';
import SubscriptionStep from './SubscriptionStep';

function SubscriptionStepWrapper() {
	const form = useForm<GenerateActivationKeyForm>({
		defaultValues: {keyType: '', productExternalReferenceCode: ''},
	});

	return (
		<SubscriptionStep
			form={form}
			generateForm={{bundleProducts: [], products: []}}
			onClickCancel={vi.fn()}
			onClickContinue={vi.fn()}
		/>
	);
}

describe('SubscriptionStep', () => {
	it('explains that a project without subscriptions cannot generate keys', () => {
		render(<SubscriptionStepWrapper />);

		expect(
			screen.getByText(
				'This project has no subscriptions that can generate activation keys. Contact your Liferay sales representative.'
			)
		).toBeInTheDocument();
		expect(screen.queryByLabelText('Product')).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', {name: 'Next'})
		).not.toBeInTheDocument();
	});
});
