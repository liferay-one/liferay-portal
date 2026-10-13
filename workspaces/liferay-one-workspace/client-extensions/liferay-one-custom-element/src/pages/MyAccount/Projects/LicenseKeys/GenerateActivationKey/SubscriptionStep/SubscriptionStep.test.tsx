/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, render, screen} from '@testing-library/react';
import {UseFormReturn, useForm} from 'react-hook-form';
import {describe, expect, it, vi} from 'vitest';
import {
	GenerateForm,
	GenerateFormSubscription,
} from '~/services/spring-boot/ActivationKeys';

import {GenerateActivationKeyForm} from '../types';
import SubscriptionStep from './SubscriptionStep';

const COMPLIMENTARY_ENTITLEMENT_ID = 2;

const PRODUCTION_ENTITLEMENT_ID = 1;

function toSubscription(entitlementId: number): GenerateFormSubscription {
	return {
		availableCount: 1,
		endDate: '2027-01-01T00:00:00Z',
		entitlementId,
		instanceSize: 1,
		licenseKeyDurationDays: 365,
		startDate: '2026-01-01T00:00:00Z',
		totalCount: 1,
	};
}

const GENERATE_FORM: GenerateForm = {
	bundleProducts: [],
	products: [
		{
			developerVersions: [],
			entitlementId: PRODUCTION_ENTITLEMENT_ID,
			externalReferenceCode: 'DXP',
			keyTypes: [
				{
					entitlementId: PRODUCTION_ENTITLEMENT_ID,
					key: 'production',
					licenseEntryType: '',
					productKey: '',
					subscriptions: [toSubscription(PRODUCTION_ENTITLEMENT_ID)],
				},
				{
					entitlementId: COMPLIMENTARY_ENTITLEMENT_ID,
					key: 'complimentary',
					licenseEntryType: '',
					productKey: '',
					subscriptions: [
						toSubscription(COMPLIMENTARY_ENTITLEMENT_ID),
					],
				},
			],
			licenseKeyFamily: 'dxp',
			name: 'Liferay DXP',
			versions: [],
		},
	],
};

function SubscriptionStepWrapper({
	defaultValues = {keyType: '', productExternalReferenceCode: ''},
	generateForm = {bundleProducts: [], products: []},
	onForm,
}: {
	defaultValues?: Partial<GenerateActivationKeyForm>;
	generateForm?: GenerateForm;
	onForm?: (form: UseFormReturn<GenerateActivationKeyForm>) => void;
}) {
	const form = useForm<GenerateActivationKeyForm>({defaultValues});

	onForm?.(form);

	return (
		<SubscriptionStep
			form={form}
			generateForm={generateForm}
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

	it('selects the complimentary entitlement after a production subscription was selected', () => {
		let form: UseFormReturn<GenerateActivationKeyForm> | undefined;

		render(
			<SubscriptionStepWrapper
				defaultValues={{
					keyType: 'production',
					productExternalReferenceCode: 'DXP',
					subscriptionEntitlementId: PRODUCTION_ENTITLEMENT_ID,
				}}
				generateForm={GENERATE_FORM}
				onForm={(current) => {
					form = current;
				}}
			/>
		);

		act(() => {
			form?.setValue('keyType', 'complimentary');
		});

		expect(form?.getValues('subscriptionEntitlementId')).toBe(
			COMPLIMENTARY_ENTITLEMENT_ID
		);
	});
});
