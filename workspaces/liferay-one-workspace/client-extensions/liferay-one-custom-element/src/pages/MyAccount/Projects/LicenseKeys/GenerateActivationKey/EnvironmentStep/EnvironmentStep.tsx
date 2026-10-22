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
import ClusterNodesField from '../components/ClusterNodesField/ClusterNodesField';
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
	isFreeKeyType,
} from '../utils';

const SERVER_FIELD_LABELS: Record<GenerateActivationKeyServerField, Word> = {
	hostName: 'host-name',
	ipAddresses: 'ip-addresses',
	macAddresses: 'mac-addresses',
};

type EnvironmentStepProps = {
	availableClusterNodes: number;
	form: UseFormReturn<GenerateActivationKeyForm>;
	generated: boolean;
	onClickBack: () => void;
	onClickCancel: () => void;
	onClickDone: () => void;
	onClickGenerate: () => void;
	renewing: boolean;
	submitting: boolean;
	virtualCluster: boolean;
	virtualClusterAvailable: boolean;
};

export default function EnvironmentStep({
	availableClusterNodes,
	form,
	generated,
	onClickBack,
	onClickCancel,
	onClickDone,
	onClickGenerate,
	renewing,
	submitting,
	virtualCluster,
	virtualClusterAvailable,
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

	const domain = watch('domain');
	const environmentName = watch('environmentName');
	const keyType = watch('keyType');
	const maxClusterNodes = watch('maxClusterNodes');
	const notify = watch('notify');
	const servers = watch('servers');
	const serverField = watch('serverField');
	const version = watch('version');

	const complimentary = isComplimentaryKeyType(keyType);
	const free = isFreeKeyType(keyType);

	let hasTarget =
		hasServerInfo(servers, serverField) &&
		!(complimentary && servers.length > 1);

	if (free) {
		hasTarget = Boolean(domain.trim());
	}
	else if (virtualCluster) {
		hasTarget = maxClusterNodes > 0;
	}

	const canGenerate = Boolean(environmentName.trim() && version && hasTarget);

	async function onClickValidateAndGenerate() {
		if (!free && !virtualCluster && !(await trigger('servers'))) {
			return;
		}

		onClickGenerate();
	}

	function onChangeServerField(value: GenerateActivationKeyServerField) {
		setValue('serverField', value);
		setValue('virtualCluster', false);

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

			{free ? (
				<Input
					{...register('domain')}
					disabled={renewing}
					helpMessage={translate(
						'input-one-domain-name-per-instance'
					)}
					label={translate('domain')}
					placeholder={translate('enter-domain-here')}
					required
				/>
			) : (
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
			)}

			{!free && (
				<div className="mb-4 mt-4 row">
					{SERVER_FIELDS.map((current) => (
						<div
							className={
								virtualClusterAvailable
									? 'col-md-3'
									: 'col-md-4'
							}
							key={current}
						>
							<RadioCard
								className="generate-activation-key-server-field"
								disabled={renewing}
								onChange={() => onChangeServerField(current)}
								selected={
									!virtualCluster && serverField === current
								}
								title={translate(SERVER_FIELD_LABELS[current])}
							/>
						</div>
					))}

					{virtualClusterAvailable && (
						<div className="col-md-3">
							<RadioCard
								className="generate-activation-key-server-field"
								disabled={renewing}
								onChange={() =>
									setValue('virtualCluster', true)
								}
								selected={virtualCluster}
								title={translate('virtual-cluster')}
							/>
						</div>
					)}
				</div>
			)}

			{!free && virtualCluster && (
				<ClusterNodesField
					availableCount={availableClusterNodes}
					disabled={renewing}
					form={form}
				/>
			)}

			{!free && !virtualCluster && (
				<>
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
				</>
			)}

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
