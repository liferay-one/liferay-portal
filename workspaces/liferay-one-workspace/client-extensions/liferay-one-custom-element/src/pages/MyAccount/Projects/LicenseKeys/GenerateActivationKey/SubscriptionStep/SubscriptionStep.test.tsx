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

function toUnlimitedDeveloperGenerateForm(
	productionAvailableCount: number
): GenerateForm {
	return {
		bundleProducts: [],
		products: [
			{
				developerVersions: ['2026.Q3'],
				entitlementId: 31,
				externalReferenceCode: 'DXP',
				keyTypes: [
					{
						entitlementId: 31,
						key: 'developer',
						licenseEntryType: '',
						productKey: '',
						subscriptions: [
							{...toSubscription(31), availableCount: 0},
						],
						unlimited: true,
						virtualCluster: false,
					},
					{
						entitlementId: 32,
						key: 'production',
						licenseEntryType: '',
						productKey: '',
						subscriptions: [
							{
								...toSubscription(32),
								availableCount: productionAvailableCount,
							},
						],
						unlimited: false,
						virtualCluster: false,
					},
				],
				licenseKeyFamily: 'DXP',
				name: 'Liferay DXP',
				versions: ['2026.Q3'],
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

	it('leaves the validity of a complimentary key to its start date', () => {
		render(
			<SubscriptionStepWrapper
				defaultValues={{
					keyType: 'complimentary',
					productExternalReferenceCode: 'DXP',
					subscriptionEntitlementId: COMPLIMENTARY_ENTITLEMENT_ID,
				}}
				generateForm={toGenerateForm()}
			/>
		);

		expect(
			screen.queryByText(/Activation key will be valid/)
		).not.toBeInTheDocument();
		expect(
			screen.getByText(/days after its start date/)
		).toBeInTheDocument();
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

	it('downloads an app license developer key from the subscription', () => {
		render(
			<SubscriptionStepWrapper
				defaultValues={{
					keyType: 'developer',
					productExternalReferenceCode: 'PRDCT-DSR',
				}}
				generateForm={{
					bundleProducts: [],
					products: [
						{
							appLicense: true,
							developerVersions: ['2026.Q3'],
							entitlementId: 21,
							externalReferenceCode: 'PRDCT-DSR',
							keyTypes: [
								{
									entitlementId: 21,
									key: 'developer',
									licenseEntryType: 'developer',
									productKey: '',
									subscriptions: [toSubscription(21)],
									virtualCluster: false,
								},
							],
							licenseKeyFamily: 'DSR',
							name: 'Digital Sales Room',
							versions: ['2026.Q3'],
						},
					],
				}}
			/>
		);

		expect(screen.getByRole('button', {name: 'Download'})).toBeEnabled();
	});

	it('selects a key type with activations left before an unlimited developer key type', () => {
		let form: UseFormReturn<GenerateActivationKeyForm> | undefined;

		render(
			<SubscriptionStepWrapper
				defaultValues={{
					keyType: '',
					productExternalReferenceCode: 'DXP',
				}}
				generateForm={toUnlimitedDeveloperGenerateForm(1)}
				onForm={(current) => {
					form = current;
				}}
			/>
		);

		expect(form?.getValues('keyType')).toBe('production');
	});

	it('selects an unlimited developer key type when no other key type has activations left', () => {
		let form: UseFormReturn<GenerateActivationKeyForm> | undefined;

		render(
			<SubscriptionStepWrapper
				defaultValues={{
					keyType: '',
					productExternalReferenceCode: 'DXP',
				}}
				generateForm={toUnlimitedDeveloperGenerateForm(0)}
				onForm={(current) => {
					form = current;
				}}
			/>
		);

		expect(form?.getValues('keyType')).toBe('developer');
		expect(screen.getByRole('option', {name: 'Developer'})).toBeEnabled();
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
