/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {useForm} from 'react-hook-form';
import {describe, expect, it, vi} from 'vitest';
import {Word, sub, translate} from '~/i18n';

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
		continueButtonProps: {disabled: boolean; onClick: () => void};
	}) => (
		<button
			data-testid="next"
			disabled={continueButtonProps.disabled}
			onClick={continueButtonProps.onClick}
		/>
	),
}));

function Harness({
	appLicense = false,
	generated = false,
	keyType = 'production',
	onClickGenerate = vi.fn(),
	renewing = false,
	version = '2026.Q3',
	virtualClusterAvailable = false,
}: {
	appLicense?: boolean;
	generated?: boolean;
	keyType?: string;
	onClickGenerate?: () => void;
	renewing?: boolean;
	version?: string;
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
			version,
			virtualCluster: false,
		},
	});

	return (
		<EnvironmentStep
			appLicense={appLicense}
			availableClusterNodes={3}
			form={form}
			generated={generated}
			onClickBack={vi.fn()}
			onClickCancel={vi.fn()}
			onClickDone={vi.fn()}
			onClickGenerate={onClickGenerate}
			renewing={renewing}
			submitting={false}
			virtualCluster={
				virtualClusterAvailable && form.watch('virtualCluster')
			}
			virtualClusterAvailable={virtualClusterAvailable}
		/>
	);
}

function clickServerField(word: Word) {
	fireEvent.click(screen.getByRole('button', {name: translate(word)}));
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

	it('asks a production key for one server only', () => {
		render(<Harness />);

		expect(screen.getAllByLabelText(translate('host-name'))).toHaveLength(
			1
		);
		expect(screen.queryByRole('button', {name: /server/i})).toBeNull();
	});

	it('asks a free key for its domain instead of its servers', () => {
		render(<Harness keyType="free" />);

		expect(screen.getByLabelText(translate('domain'))).toBeTruthy();
		expect(screen.queryByLabelText(translate('description'))).toBeNull();
		expect(screen.queryByLabelText(translate('host-name'))).toBeNull();
	});

	it('generates an app license key without a version', () => {
		render(<Harness appLicense version="" />);

		fireEvent.change(screen.getByLabelText(translate('host-name')), {
			target: {value: 'app-host'},
		});

		expect(getNextButton().disabled).toBe(false);
	});

	it('asks a DXP key for a version', () => {
		render(<Harness version="" />);

		fireEvent.change(screen.getByLabelText(translate('host-name')), {
			target: {value: 'dxp-host'},
		});

		expect(getNextButton().disabled).toBe(true);
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

	it('keeps the host name after the server field changes', () => {
		render(<Harness />);

		fireEvent.change(screen.getByLabelText(translate('host-name')), {
			target: {value: 'dxp-host'},
		});

		clickServerField('ip-addresses');

		expect(screen.queryByLabelText(translate('host-name'))).toBeNull();

		clickServerField('host-name');

		expect(
			(screen.getByLabelText(translate('host-name')) as HTMLInputElement)
				.value
		).toBe('dxp-host');
		expect(getNextButton().disabled).toBe(false);
	});

	it('generates a host name key when a hidden MAC address is not valid', async () => {
		const onClickGenerate = vi.fn();

		render(<Harness onClickGenerate={onClickGenerate} />);

		clickServerField('mac-addresses');

		fireEvent.change(screen.getByLabelText(translate('mac-addresses')), {
			target: {value: 'not-a-mac-address'},
		});

		clickServerField('host-name');

		fireEvent.change(screen.getByLabelText(translate('host-name')), {
			target: {value: 'dxp-host'},
		});

		fireEvent.click(getNextButton());

		await waitFor(() => expect(onClickGenerate).toHaveBeenCalled());
	});

	it.each([['host-name'], ['ip-addresses'], ['mac-addresses']] as const)(
		'shows the required server field message on the %s tab',
		(serverField) => {
			render(<Harness virtualClusterAvailable />);

			clickServerField(serverField);

			expect(
				screen.getByText(
					translate(
						'one-host-name-ip-address-or-mac-address-is-required'
					)
				)
			).toBeTruthy();
		}
	);

	it('does not show the required server field message on the virtual cluster tab', () => {
		render(<Harness virtualClusterAvailable />);

		clickServerField('virtual-cluster');

		expect(
			screen.queryByText(
				translate('one-host-name-ip-address-or-mac-address-is-required')
			)
		).toBeNull();
	});

	it('shows the required server field message for an app license key', () => {
		render(<Harness appLicense />);

		expect(
			screen.getByText(
				translate('one-host-name-ip-address-or-mac-address-is-required')
			)
		).toBeTruthy();
	});

	it('does not show the required server field message for a free key', () => {
		render(<Harness keyType="free" />);

		expect(
			screen.queryByText(
				translate('one-host-name-ip-address-or-mac-address-is-required')
			)
		).toBeNull();
	});

	it.each([
		['renewing', {renewing: true}],
		['generated', {generated: true}],
	])(
		'does not show the required server field message when the key is %s',
		(_, props) => {
			render(<Harness {...props} />);

			expect(
				screen.queryByText(
					translate(
						'one-host-name-ip-address-or-mac-address-is-required'
					)
				)
			).toBeNull();
		}
	);
});
