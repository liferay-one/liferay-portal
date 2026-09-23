/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayAlert from '@clayui/alert';
import {ClayCheckbox} from '@clayui/form';
import {UseFormReturn, useFieldArray} from 'react-hook-form';
import {Input} from '~/components/Input/Input';
import {sub, translate} from '~/i18n';
import {getIconSpriteMap} from '~/services/liferay/liferay';

import WizardFooter from '../../../CloudAppInstall/WizardFooter/WizardFooter';
import ServerFieldGroup from '../components/ServerFieldGroup/ServerFieldGroup';
import {GenerateActivationKeyForm} from '../types';
import {
	buildEmptyServer,
	getGenerateButtonLabel,
	hasServerInfo,
} from '../utils';

type EnvironmentStepProps = {
	form: UseFormReturn<GenerateActivationKeyForm>;
	onClickBack: () => void;
	onClickCancel: () => void;
	onClickGenerate: () => void;
	renewing: boolean;
	submitting: boolean;
};

export default function EnvironmentStep({
	form,
	onClickBack,
	onClickCancel,
	onClickGenerate,
	renewing,
	submitting,
}: EnvironmentStepProps) {
	const {
		control,
		formState: {errors},
		register,
		setValue,
		watch,
	} = form;

	const {append, fields, remove} = useFieldArray({control, name: 'servers'});

	const environmentName = watch('environmentName');
	const notify = watch('notify');
	const servers = watch('servers');

	const canGenerate = Boolean(
		environmentName.trim() && hasServerInfo(servers)
	);

	return (
		<>
			<h2 className="h4">{translate('environment-details')}</h2>

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

			<h2 className="h4 mt-4">
				{translate('activation-key-server-details')}
			</h2>

			<ClayAlert
				className="generate-activation-key-server-alert mb-4"
				displayType="info"
				role={null}
				spritemap={getIconSpriteMap()}
				symbol="info-circle"
			>
				{translate(
					'one-host-name-ip-address-or-mac-address-is-required'
				)}
			</ClayAlert>

			{fields.map((field, index) => (
				<ServerFieldGroup
					disabled={renewing}
					index={index}
					key={field.id}
					onClickAdd={
						!renewing && index === fields.length - 1
							? () => append(buildEmptyServer())
							: undefined
					}
					onClickRemove={
						!renewing && fields.length > 1
							? () => remove(index)
							: undefined
					}
					register={register}
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
					disabled: submitting,
					onClick: onClickBack,
				}}
				cancelButtonProps={{
					disabled: submitting,
					onClick: onClickCancel,
				}}
				continueButtonProps={{
					children: sub(
						getGenerateButtonLabel(renewing, fields.length),
						[String(fields.length)]
					),
					disabled: !canGenerate || submitting,
					onClick: onClickGenerate,
				}}
			/>
		</>
	);
}
