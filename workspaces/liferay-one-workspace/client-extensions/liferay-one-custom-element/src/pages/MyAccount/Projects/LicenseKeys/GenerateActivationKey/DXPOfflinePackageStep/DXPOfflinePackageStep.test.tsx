/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {useForm} from 'react-hook-form';
import {describe, expect, it, vi} from 'vitest';

import {GenerateActivationKeyForm} from '../types';
import DXPOfflinePackageStep from './DXPOfflinePackageStep';

function Wrapper({
	onClickDownload = vi.fn(),
	version = '2027.Q1',
}: {
	onClickDownload?: () => void;
	version?: string;
}) {
	const form = useForm<GenerateActivationKeyForm>({
		defaultValues: {
			activationToken: '',
			dxpActivationCode: '1a3c5e7b9d0f42648a2c4e6b8d0f1350',
			version,
		},
	});

	return (
		<DXPOfflinePackageStep
			form={form}
			onClickBack={vi.fn()}
			onClickCancel={vi.fn()}
			onClickDownload={onClickDownload}
			submitting={false}
			versions={['2027.Q2', '2027.Q1']}
		/>
	);
}

describe('DXPOfflinePackageStep', () => {
	it('shows the activation code and asks for the activation token', () => {
		render(<Wrapper />);

		expect(screen.getByLabelText('Activation Code')).toHaveValue(
			'1a3c5e7b9d0f42648a2c4e6b8d0f1350'
		);
		expect(screen.getByLabelText('Activation Token')).toHaveValue('');
		expect(screen.getByRole('button', {name: 'Download'})).toBeDisabled();
	});

	it('downloads the package once the activation token is entered', () => {
		const onClickDownload = vi.fn();

		render(<Wrapper onClickDownload={onClickDownload} />);

		fireEvent.change(screen.getByLabelText('Activation Token'), {
			target: {value: 'eyJhbGciOiJSUzI1NiJ9.eyJpbnN0YWxsYXRpb25JZCI6IkMifQ.c2lnbmF0dXJl'},
		});

		const downloadButton = screen.getByRole('button', {name: 'Download'});

		expect(downloadButton).toBeEnabled();

		fireEvent.click(downloadButton);

		expect(onClickDownload).toHaveBeenCalled();
	});

	it('disables the download for a blank activation token or no version', () => {
		const {unmount} = render(<Wrapper />);

		fireEvent.change(screen.getByLabelText('Activation Token'), {
			target: {value: '   '},
		});

		expect(screen.getByRole('button', {name: 'Download'})).toBeDisabled();

		unmount();

		render(<Wrapper version="" />);

		fireEvent.change(screen.getByLabelText('Activation Token'), {
			target: {value: 'eyJhbGciOiJSUzI1NiJ9.eyJpbnN0YWxsYXRpb25JZCI6IkMifQ.c2lnbmF0dXJl'},
		});

		expect(screen.getByRole('button', {name: 'Download'})).toBeDisabled();
	});
});
