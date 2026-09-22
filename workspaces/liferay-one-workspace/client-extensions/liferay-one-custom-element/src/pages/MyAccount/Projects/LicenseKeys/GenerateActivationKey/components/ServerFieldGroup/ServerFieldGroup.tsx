/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {UseFormRegister} from 'react-hook-form';
import Button from '~/components/Button/Button';
import {Input} from '~/components/Input/Input';
import {translate} from '~/i18n';

import {GenerateActivationKeyForm} from '../../types';

type ServerFieldGroupProps = {
	disabled?: boolean;
	index: number;
	onClickAdd?: () => void;
	onClickRemove?: () => void;
	register: UseFormRegister<GenerateActivationKeyForm>;
};

export default function ServerFieldGroup({
	disabled,
	index,
	onClickAdd,
	onClickRemove,
	register,
}: ServerFieldGroupProps) {
	return (
		<div className="border-bottom mb-4 pb-3">
			<Input
				{...register(`servers.${index}.hostName`)}
				disabled={disabled}
				label={translate('host-name')}
			/>

			<Input
				{...register(`servers.${index}.ipAddresses`)}
				component="textarea"
				disabled={disabled}
				helpMessage={translate(
					'add-one-ip-address-per-line-ipv-six-addresses-are-not-supported'
				)}
				label={translate('ip-addresses')}
				placeholder={'1.1.1.1\n2.2.2.2'}
			/>

			<Input
				{...register(`servers.${index}.macAddresses`)}
				component="textarea"
				disabled={disabled}
				helpMessage={translate('add-one-mac-address-per-line')}
				label={translate('mac-addresses')}
				placeholder={'XX-XX-XX-XX-XX-XX\nXX-XX-XX-XX-XX-XX'}
			/>

			<div className="d-flex gap-3">
				{onClickRemove && (
					<Button
						displayType="secondary"
						onClick={onClickRemove}
						prependIcon="hr"
					>
						{translate('remove-server')}
					</Button>
				)}

				{onClickAdd && (
					<Button
						displayType="secondary"
						onClick={onClickAdd}
						prependIcon="plus"
					>
						{translate('add-server')}
					</Button>
				)}
			</div>
		</div>
	);
}
