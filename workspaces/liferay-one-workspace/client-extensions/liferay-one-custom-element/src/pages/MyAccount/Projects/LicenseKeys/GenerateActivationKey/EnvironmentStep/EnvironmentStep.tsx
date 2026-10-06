/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayCheckbox} from '@clayui/form';
import {UseFormReturn, useFieldArray} from 'react-hook-form';
import {Input} from '~/components/Input/Input';
import RadioCard from '~/components/RadioCard/RadioCard';
import {Word, translate} from '~/i18n';

import WizardFooter from '../../../CloudAppInstall/WizardFooter/WizardFooter';
import ServerFieldGroup from '../components/ServerFieldGroup/ServerFieldGroup';
import {
	GenerateActivationKeyForm,
	GenerateActivationKeyServerField,
} from '../types';
import {
	SERVER_FIELDS,
	buildEmptyServer,
	getGenerateButtonLabel,
	hasServerInfo,
	isComplimentaryKeyType,
} from '../utils';

const SERVER_FIELD_LABELS: Record<GenerateActivationKeyServerField, Word> = {
	hostName: 'host-name',
	ipAddresses: 'ip-addresses',
	macAddresses: 'mac-addresses',
};

type EnvironmentStepProps = {
	form: UseFormReturn<GenerateActivationKeyForm>;
	generated: boolean;
	onClickBack: () => void;
	onClickCancel: () => void;
	onClickDone: () => void;
	onClickGenerate: () => void;
	renewing: boolean;
	submitting: boolean;
};

export default function EnvironmentStep({
	form,
	generated,
	onClickBack,
	onClickCancel,
	onClickDone,
	onClickGenerate,
	renewing,
	submitting,
}: EnvironmentStepProps) {
	const {
		control,
		formState: {errors},
		register,
		setValue,
		trigger,
		watch,
	} = form;

	const {append, fields, remove} = useFieldArray({control, name: 'servers'});

	const environmentName = watch('environmentName');
	const keyType = watch('keyType');
	const notify = watch('notify');
	const servers = watch('servers');
	const serverField = watch('serverField');
	const version = watch('version');

	const complimentary = isComplimentaryKeyType(keyType);

	const canGenerate = Boolean(
		environmentName.trim() &&
			version &&
			hasServerInfo(servers, serverField) &&
			!(complimentary && servers.length > 1)
	);

	async function onClickValidateAndGenerate() {
		if (!(await trigger('servers'))) {
			return;
		}

		onClickGenerate();
	}

	function onChangeServerField(value: GenerateActivationKeyServerField) {
		setValue('serverField', value);

		servers.forEach((server, index) => {
			SERVER_FIELDS.forEach((current) => {
				if (current !== value) {
					setValue(`servers.${index}.${current}`, '');
				}
			});
		});
	}

	return (
		<>
			<Input
				{...register('environmentName')}
				disabled={renewing}
				errorMessage={errors.environmentName?.message}
				helpMessage={translate(
					'name-this-environment-this-cannot-be-edited-later'
				)}
				label={translate('environment-name')}
				placeholder={translate('e-g-liferay-ecommerce-site')}
				required
			/>

			<Input
				{...register('description')}
				disabled={renewing}
				helpMessage={translate(
					'include-a-description-to-uniquely-identify-this-environment-this-cannot-be-edited-later'
				)}
				label={translate('description')}
				placeholder={translate(
					'e-g-liferay-dev-environment-ecom-dxp-7-2'
				)}
			/>

			<div className="mb-4 mt-4 row">
				{SERVER_FIELDS.map((current) => (
					<div className="col-md-4" key={current}>
						<RadioCard
							className="generate-activation-key-server-field"
							disabled={renewing}
							onChange={() => onChangeServerField(current)}
							selected={serverField === current}
							title={translate(SERVER_FIELD_LABELS[current])}
						/>
					</div>
				))}
			</div>

			{fields.map((field, index) => (
				<ServerFieldGroup
					disabled={renewing}
					errorMessage={
						errors.servers?.[index]?.[serverField]?.message
					}
					index={index}
					key={field.id}
					onClickAdd={
						!renewing &&
						!complimentary &&
						index === fields.length - 1
							? () => append(buildEmptyServer())
							: undefined
					}
					onClickRemove={
						!renewing && fields.length > 1
							? () => remove(index)
							: undefined
					}
					register={register}
					serverField={serverField}
				/>
			))}

			<ClayCheckbox
				checked={notify}
				label={translate(
					'receive-expiration-notifications-when-this-activation-key-is-about-to-expire'
				)}
				onChange={() => setValue('notify', !notify)}
			/>

			<WizardFooter
				backButtonProps={{
					disabled: generated || submitting,
					onClick: onClickBack,
				}}
				cancelButtonProps={{
					disabled: generated || submitting,
					onClick: onClickCancel,
				}}
				continueButtonProps={{
					children: generated
						? translate('done')
						: translate(getGenerateButtonLabel(renewing)),
					disabled: !canGenerate || submitting,
					onClick: generated
						? onClickDone
						: onClickValidateAndGenerate,
				}}
			/>
		</>
	);
}
