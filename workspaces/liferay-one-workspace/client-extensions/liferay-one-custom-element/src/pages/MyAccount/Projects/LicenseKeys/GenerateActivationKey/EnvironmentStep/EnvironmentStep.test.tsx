/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {useForm} from 'react-hook-form';
import {describe, expect, it, vi} from 'vitest';
import {sub, translate} from '~/i18n';

import {GenerateActivationKeyForm} from '../types';
import {buildEmptyServer} from '../utils';
import EnvironmentStep from './EnvironmentStep';

vi.mock('../components/SelectField/SelectField', () => ({
	default: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
}));

vi.mock('../../../CloudAppInstall/WizardFooter/WizardFooter', () => ({
	default: ({
		continueButtonProps,
	}: {
		continueButtonProps: {disabled: boolean};
	}) => <button data-testid="next" disabled={continueButtonProps.disabled} />,
}));

function Harness({
	keyType = 'production',
	virtualClusterAvailable = false,
}: {
	keyType?: string;
	virtualClusterAvailable?: boolean;
}) {
	const form = useForm<GenerateActivationKeyForm>({
		defaultValues: {
			description: '',
			domain: '',
			environmentName: 'Cluster',
			keyType,
			maxClusterNodes: 0,
			notify: true,
			serverField: 'hostName',
			servers: [buildEmptyServer()],
			version: '2026.Q3',
			virtualCluster: false,
		},
	});

	return (
		<EnvironmentStep
			availableClusterNodes={3}
			form={form}
			generated={false}
			onClickBack={vi.fn()}
			onClickCancel={vi.fn()}
			onClickDone={vi.fn()}
			onClickGenerate={vi.fn()}
			renewing={false}
			submitting={false}
			virtualCluster={
				virtualClusterAvailable && form.watch('virtualCluster')
			}
			virtualClusterAvailable={virtualClusterAvailable}
		/>
	);
}

function getNextButton() {
	return screen.getByTestId('next') as HTMLButtonElement;
}

describe('[MOD-MYACCOUNT-PROJECTS-LICENSEKEYS-GENERATEACTIVATIONKEY] EnvironmentStep', () => {
	it('asks a production key for its servers', () => {
		render(<Harness />);

		expect(screen.getByLabelText(translate('host-name'))).toBeTruthy();
		expect(screen.queryByLabelText(translate('cluster-nodes'))).toBeNull();
	});

	it('asks a free key for its domain instead of its servers', () => {
		render(<Harness keyType="free" />);

		expect(screen.getByLabelText(translate('domain'))).toBeTruthy();
		expect(screen.queryByLabelText(translate('description'))).toBeNull();
		expect(screen.queryByLabelText(translate('host-name'))).toBeNull();
	});

	it('generates a free key once a domain is entered', () => {
		render(<Harness keyType="free" />);

		expect(getNextButton().disabled).toBe(true);

		fireEvent.change(screen.getByLabelText(translate('domain')), {
			target: {value: 'example.com'},
		});

		expect(getNextButton().disabled).toBe(false);
	});

	it.each(['enterprise', 'oem'])(
		'asks an %s key for no server and generates it with only a name',
		(keyType) => {
			render(<Harness keyType={keyType} virtualClusterAvailable />);

			expect(
				screen.getByLabelText(translate('description'))
			).toBeTruthy();
			expect(screen.queryByLabelText(translate('host-name'))).toBeNull();
			expect(screen.queryByText(translate('virtual-cluster'))).toBeNull();
			expect(getNextButton().disabled).toBe(false);
		}
	);

	it('offers a virtual cluster only when the key type allows it', () => {
		render(<Harness />);

		expect(screen.queryByText(translate('virtual-cluster'))).toBeNull();
	});

	it('asks a virtual cluster key for its cluster nodes', () => {
		render(<Harness virtualClusterAvailable />);

		fireEvent.click(screen.getByText(translate('virtual-cluster')));

		const select = screen.getByLabelText(
			translate('cluster-nodes')
		) as HTMLSelectElement;

		expect(
			Array.from(select.options).map((option) => option.value)
		).toEqual(['0', '1', '2', '3']);
		expect(
			screen.getByText(
				sub('cluster-nodes-may-not-exceed-the-maximum-number-of-x', [
					'3',
				])
			)
		).toBeTruthy();
		expect(screen.queryByLabelText(translate('host-name'))).toBeNull();
	});

	it('generates a virtual cluster key once cluster nodes are selected', () => {
		render(<Harness virtualClusterAvailable />);

		fireEvent.click(screen.getByText(translate('virtual-cluster')));

		expect(getNextButton().disabled).toBe(true);

		fireEvent.change(screen.getByLabelText(translate('cluster-nodes')), {
			target: {value: '2'},
		});

		expect(getNextButton().disabled).toBe(false);
	});

	it('asks for servers again after a server field is selected', () => {
		render(<Harness virtualClusterAvailable />);

		fireEvent.click(screen.getByText(translate('virtual-cluster')));
		fireEvent.click(screen.getAllByText(translate('host-name'))[0]);

		expect(screen.getByLabelText(translate('host-name'))).toBeTruthy();
		expect(screen.queryByLabelText(translate('cluster-nodes'))).toBeNull();
	});
});
