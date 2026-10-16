/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayInput} from '@clayui/form';
import {UseFormReturn} from 'react-hook-form';
import {Input} from '~/components/Input/Input';
import RadioCard from '~/components/RadioCard/RadioCard';
import i18n, {Word} from '~/i18n';

import type {ActivationKeyFormValues} from '~/pages/ProductPurchase/ActivationKeyForm/ActivationKeyForm';
import type {ActivationKeyServerField} from '~/services/spring-boot/ActivationKeys';

type ServerFieldConfiguration = {
	helpMessage?: Word;
	label: Word;
	placeholder?: string;
};

const SERVER_FIELD_CONFIGURATIONS: Record<
	ActivationKeyServerField,
	ServerFieldConfiguration
> = {
	hostName: {label: 'host-name'},
	ipAddresses: {
		helpMessage:
			'add-one-ip-address-per-line-ipv-six-addresses-are-not-supported',
		label: 'ip-addresses',
		placeholder: '1.1.1.1\n2.2.2.2',
	},
	macAddresses: {
		helpMessage: 'add-one-mac-address-per-line',
		label: 'mac-addresses',
		placeholder: 'XX-XX-XX-XX-XX-XX\nXX-XX-XX-XX-XX-XX',
	},
};

const SERVER_FIELDS = Object.keys(
	SERVER_FIELD_CONFIGURATIONS
) as ActivationKeyServerField[];

type TrialServerDetailsProps = {
	form: UseFormReturn<ActivationKeyFormValues>;
};

const TrialServerDetails = ({form}: TrialServerDetailsProps) => {
	const {
		formState: {errors},
		register,
		setValue,
		watch,
	} = form;

	const serverField = watch('serverField');

	const {helpMessage, label, placeholder} =
		SERVER_FIELD_CONFIGURATIONS[serverField];

	const multiline = serverField !== 'hostName';

	const onChangeServerField = (value: ActivationKeyServerField) => {
		setValue('serverField', value, {shouldDirty: true});
		setValue('serverValue', '', {shouldDirty: true, shouldValidate: true});
	};

	return (
		<>
			<Input
				{...register('environmentName')}
				className="w-100"
				errorMessage={errors.environmentName?.message}
				helpMessage={i18n.translate(
					'name-this-environment-this-cannot-be-edited-later'
				)}
				id="environmentName"
				label={i18n.translate('environment-name')}
				placeholder={i18n.translate('e-g-liferay-ecommerce-site')}
				required
			/>

			<ClayInput.Group className="mb-3">
				{SERVER_FIELDS.map((current) => (
					<ClayInput.GroupItem key={current}>
						<RadioCard
							onChange={() => onChangeServerField(current)}
							selected={serverField === current}
							title={i18n.translate(
								SERVER_FIELD_CONFIGURATIONS[current].label
							)}
						/>
					</ClayInput.GroupItem>
				))}
			</ClayInput.Group>

			<Input
				{...register('serverValue')}
				className="w-100"
				component={multiline ? 'textarea' : 'input'}
				errorMessage={errors.serverValue?.message}
				helpMessage={helpMessage && i18n.translate(helpMessage)}
				id="serverValue"
				key={serverField}
				label={i18n.translate(label)}
				placeholder={placeholder}
				required
			/>
		</>
	);
};

export default TrialServerDetails;
