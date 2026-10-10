/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {addDays} from 'date-fns';
import {useForm} from 'react-hook-form';
import {describe, expect, it, vi} from 'vitest';
import {sub, translate} from '~/i18n';
import {GenerateForm} from '~/services/spring-boot/ActivationKeys';
import {toUTCDateString} from '~/utils/dateUtils';

import {GenerateActivationKeyForm} from '../types';
import ComplimentaryStep from './ComplimentaryStep';

vi.mock('~/components/DatePicker/DatePicker', () => ({
	default: ({
		error,
		onChange,
		value,
	}: {
		error?: string;
		onChange: (value: string) => void;
		value: string;
	}) => (
		<div>
			<input
				data-testid="start-date"
				onChange={(event) => onChange(event.target.value)}
				value={value}
			/>

			{error && <span data-testid="start-date-error">{error}</span>}
		</div>
	),
}));

vi.mock('~/hooks/useListTypeDefinition', () => ({
	default: () => ({
		data: {listTypeEntries: [{key: 'testing', name: 'Testing'}]},
	}),
}));

vi.mock('../components/SelectField/SelectField', () => ({
	default: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
}));

vi.mock('../components/VersionField/VersionField', () => ({
	default: () => null,
}));

vi.mock('../../../CloudAppInstall/WizardFooter/WizardFooter', () => ({
	default: ({
		continueButtonProps,
	}: {
		continueButtonProps: {disabled: boolean};
	}) => <button data-testid="next" disabled={continueButtonProps.disabled} />,
}));

const now = new Date();

const endDate = addDays(now, 10);

function toGenerateForm(licenseKeyDurationDays: number): GenerateForm {
	return {
		bundleProducts: [],
		products: [
			{
				developerVersions: [],
				entitlementId: 1,
				externalReferenceCode: 'PRDCT-DXP',
				keyTypes: [
					{
						entitlementId: 1,
						key: 'production',
						licenseEntryType: 'production',
						productKey: 'dxp',
						subscriptions: [
							{
								availableCount: 1,
								endDate: endDate.toISOString(),
								entitlementId: 5,
								instanceSize: 1,
								licenseKeyDurationDays,
								totalCount: 1,
							},
						],
					},
				],
				label: 'DXP',
				name: 'DXP',
				versions: [],
			},
		],
	};
}

function Harness({licenseKeyDurationDays}: {licenseKeyDurationDays: number}) {
	const form = useForm<GenerateActivationKeyForm>({
		defaultValues: {
			keyType: 'production',
			productExternalReferenceCode: 'PRDCT-DXP',
			startDate: toUTCDateString(now),
			subscriptionEntitlementId: 5,
		},
	});

	return (
		<ComplimentaryStep
			form={form}
			generateForm={toGenerateForm(licenseKeyDurationDays)}
			onClickBack={vi.fn()}
			onClickCancel={vi.fn()}
			onClickContinue={vi.fn()}
			versions={[]}
		/>
	);
}

function changeStartDate(value: string) {
	fireEvent.change(screen.getByTestId('start-date'), {target: {value}});
}

describe('[MOD-MYACCOUNT-PROJECTS-LICENSEKEYS-GENERATEACTIVATIONKEY] ComplimentaryStep', () => {
	it('falls back to 30 days in the subtitle when the definition has no duration', () => {
		render(<Harness licenseKeyDurationDays={0} />);

		expect(
			screen.getByText(
				sub(
					'you-can-use-this-option-to-generate-complimentary-activation-keys-that-expire-x-days-after-their-start-date-or-when-the-subscription-ends-if-that-is-earlier',
					['30']
				)
			)
		).toBeTruthy();
	});

	it('renders the English subtitle counted from the start date', () => {
		render(<Harness licenseKeyDurationDays={30} />);

		expect(
			screen.getByText(
				'You can use this option to generate Complimentary Activation Keys that expire 30 days after their start date, or when the subscription ends if that is earlier.'
			)
		).toBeTruthy();
	});

	it('states the duration of the definition in the subtitle', () => {
		render(<Harness licenseKeyDurationDays={45} />);

		expect(
			screen.getByText(
				sub(
					'you-can-use-this-option-to-generate-complimentary-activation-keys-that-expire-x-days-after-their-start-date-or-when-the-subscription-ends-if-that-is-earlier',
					['45']
				)
			)
		).toBeTruthy();
	});

	it('refuses a start date on the subscription end date', () => {
		render(<Harness licenseKeyDurationDays={0} />);

		fireEvent.click(screen.getByRole('checkbox'));

		changeStartDate(toUTCDateString(endDate));

		expect(screen.getByTestId('start-date-error').textContent).toBe(
			translate('the-start-date-must-be-before-the-subscription-end-date')
		);
		expect((screen.getByTestId('next') as HTMLButtonElement).disabled).toBe(
			true
		);
	});

	it('accepts a start date the day before the subscription end date', () => {
		render(<Harness licenseKeyDurationDays={0} />);

		fireEvent.click(screen.getByRole('checkbox'));

		changeStartDate(toUTCDateString(addDays(endDate, -1)));

		expect(screen.queryByTestId('start-date-error')).toBeNull();
		expect((screen.getByTestId('next') as HTMLButtonElement).disabled).toBe(
			false
		);
	});
});
