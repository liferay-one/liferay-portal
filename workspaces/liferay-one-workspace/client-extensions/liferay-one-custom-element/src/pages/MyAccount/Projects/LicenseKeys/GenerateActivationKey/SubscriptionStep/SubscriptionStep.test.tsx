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

function toSubscription(
	entitlementId: number,
	licenseKeyExpirationDate?: string
): GenerateFormSubscription {
	return {
		availableCount: 1,
		endDate: '2027-01-01T00:00:00Z',
		entitlementId,
		instanceSize: 1,
		licenseKeyDurationDays: 365,
		licenseKeyExpirationDate,
		startDate: '2026-01-01T00:00:00Z',
		totalCount: 1,
	};
}

function toGenerateForm(licenseKeyExpirationDate?: string): GenerateForm {
	return {
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
						subscriptions: [
							toSubscription(
								PRODUCTION_ENTITLEMENT_ID,
								licenseKeyExpirationDate
							),
						],
						virtualCluster: false,
					},
					{
						entitlementId: COMPLIMENTARY_ENTITLEMENT_ID,
						key: 'complimentary',
						licenseEntryType: '',
						productKey: '',
						subscriptions: [
							toSubscription(COMPLIMENTARY_ENTITLEMENT_ID),
						],
						virtualCluster: false,
					},
				],
				licenseKeyFamily: 'dxp',
				name: 'Liferay DXP',
				versions: [],
			},
		],
	};
}

function toAppGenerateForm(availableCounts: number[]): GenerateForm {
	return {
		bundleProducts: [],
		products: [
			{
				app: true,
				developerVersions: [],
				entitlementId: 11,
				externalReferenceCode: 'PRDCT-APP',
				keyTypes: [
					{
						entitlementId: 11,
						key: 'production',
						licenseEntryType: 'production',
						productKey: 'PRDCT-APP',
						subscriptions: availableCounts.map(
							(availableCount, index) => ({
								...toSubscription(11 + index),
								availableCount,
							})
						),
						virtualCluster: false,
					},
				],
				licenseKeyFamily: '',
				name: 'Test Application',
				versions: ['1'],
			},
		],
	};
}

const PRODUCTION_DEFAULT_VALUES: Partial<GenerateActivationKeyForm> = {
	keyType: 'production',
	productExternalReferenceCode: 'DXP',
	subscriptionEntitlementId: PRODUCTION_ENTITLEMENT_ID,
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
				defaultValues={PRODUCTION_DEFAULT_VALUES}
				generateForm={toGenerateForm()}
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

	it('selects the first app purchase with activations left without a contract term', () => {
		let form: UseFormReturn<GenerateActivationKeyForm> | undefined;

		render(
			<SubscriptionStepWrapper
				defaultValues={{
					keyType: 'production',
					productExternalReferenceCode: 'PRDCT-APP',
				}}
				generateForm={toAppGenerateForm([0, 2])}
				onForm={(current) => {
					form = current;
				}}
			/>
		);

		expect(screen.queryByText('Contract Term')).not.toBeInTheDocument();
		expect(form?.getValues('subscriptionEntitlementId')).toBe(12);
		expect(screen.getByRole('button', {name: 'Next'})).toBeEnabled();
	});

	it('warns that an app has no activations left', () => {
		render(
			<SubscriptionStepWrapper
				defaultValues={{
					keyType: 'production',
					productExternalReferenceCode: 'PRDCT-APP',
				}}
				generateForm={toAppGenerateForm([0])}
			/>
		);

		expect(screen.queryByText('Contract Term')).not.toBeInTheDocument();
		expect(
			screen.getByText(
				'There are no key activations available. Deactivate a key or contact the Provisioning team.'
			)
		).toBeInTheDocument();
		expect(screen.getByRole('button', {name: 'Next'})).toBeDisabled();
	});

	it('shows that a permanent activation key does not expire', () => {
		render(
			<SubscriptionStepWrapper
				defaultValues={PRODUCTION_DEFAULT_VALUES}
				generateForm={toGenerateForm('2125-12-08T00:00:00Z')}
			/>
		);

		expect(screen.getByText(/Does Not Expire/)).toBeInTheDocument();
	});

	it('shows when the activation key expires after the subscription ends', () => {
		render(
			<SubscriptionStepWrapper
				defaultValues={PRODUCTION_DEFAULT_VALUES}
				generateForm={toGenerateForm('2027-06-30T00:00:00Z')}
			/>
		);

		expect(screen.getByText(/2027/)).toHaveTextContent(/Jun/);
		expect(screen.queryByText(/Does Not Expire/)).not.toBeInTheDocument();
	});
});
