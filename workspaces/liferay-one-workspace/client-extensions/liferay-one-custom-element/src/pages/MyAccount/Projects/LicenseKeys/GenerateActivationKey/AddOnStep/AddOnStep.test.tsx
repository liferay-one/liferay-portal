/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {useForm} from 'react-hook-form';
import {describe, expect, it, vi} from 'vitest';
import {translate} from '~/i18n';
import {
	GenerateForm,
	GenerateFormBundleProduct,
} from '~/services/spring-boot/ActivationKeys';

import {GenerateActivationKeyForm} from '../types';
import AddOnStep from './AddOnStep';

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

function toBundleProduct(
	entitlementId: number,
	externalReferenceCode: string,
	name: string
): GenerateFormBundleProduct {
	return {
		app: false,
		availableCount: 0,
		entitlementId,
		externalReferenceCode,
		licensable: true,
		licenseKeyFamily: externalReferenceCode,
		licensedVersions: ['2026.Q2'],
		name,
	};
}

const generateForm = {
	bundleProducts: [
		toBundleProduct(1, 'PRDCT-DXP', 'Liferay DXP'),
		{...toBundleProduct(2, 'PRDCT-ADD-ON', 'Add On'), availableCount: 5},
	],
	products: [
		{
			appLicense: false,
			externalReferenceCode: 'PRDCT-DXP',
		},
	],
} as GenerateForm;

function Wrapper({bundleEntitlementIds}: {bundleEntitlementIds: number[]}) {
	const form = useForm<GenerateActivationKeyForm>({
		defaultValues: {
			bundleEntitlementIds,
			productExternalReferenceCode: 'PRDCT-DXP',
			version: '2026.Q2',
		},
	});

	return (
		<AddOnStep
			developer={false}
			form={form}
			generateForm={generateForm}
			onClickBack={() => {}}
			onClickCancel={() => {}}
			onClickContinue={() => {}}
			serverless={false}
			submitting={false}
			versions={['2026.Q2']}
		/>
	);
}

function getCheckbox(name: string) {
	return screen.getByLabelText(name) as HTMLInputElement;
}

describe('[MOD-MYACCOUNT-PROJECTS-LICENSEKEYS-GENERATEACTIVATIONKEY] AddOnStep', () => {
	it('selects the required product when the selection omits it', () => {
		render(<Wrapper bundleEntitlementIds={[]} />);

		expect(getCheckbox('Liferay DXP').checked).toBe(true);
		expect(getCheckbox('Liferay DXP').disabled).toBe(true);
		expect(screen.getByTestId('next')).not.toBeDisabled();
	});

	it('selects the required product when a renewal selection holds only the subscription entitlement', () => {
		render(<Wrapper bundleEntitlementIds={[99]} />);

		expect(getCheckbox('Liferay DXP').checked).toBe(true);
		expect(getCheckbox('Add On').checked).toBe(false);
		expect(screen.getByTestId('next')).not.toBeDisabled();
	});

	it('keeps the required product when the user deselects all', () => {
		render(<Wrapper bundleEntitlementIds={[1, 2]} />);

		fireEvent.click(screen.getByText(translate('deselect-all')));

		expect(getCheckbox('Liferay DXP').checked).toBe(true);
		expect(getCheckbox('Add On').checked).toBe(false);
	});

	it('lets the user toggle an add on after select all', () => {
		render(<Wrapper bundleEntitlementIds={[]} />);

		fireEvent.click(screen.getByText(translate('select-all')));

		expect(getCheckbox('Add On').checked).toBe(true);

		fireEvent.click(getCheckbox('Add On'));

		expect(getCheckbox('Add On').checked).toBe(false);

		fireEvent.click(getCheckbox('Add On'));

		expect(getCheckbox('Add On').checked).toBe(true);
	});
});
