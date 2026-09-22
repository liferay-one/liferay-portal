/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClaySelect} from '@clayui/form';
import {UseFormReturn} from 'react-hook-form';
import {Input} from '~/components/Input/Input';
import useListTypeDefinition from '~/hooks/useListTypeDefinition';
import {translate} from '~/i18n';

import WizardFooter from '../../../CloudAppInstall/WizardFooter/WizardFooter';
import {GenerateActivationKeyForm} from '../types';

type DSRStepProps = {
	form: UseFormReturn<GenerateActivationKeyForm>;
	onClickBack: () => void;
	onClickCancel: () => void;
	onClickContinue: () => void;
};

export default function DSRStep({
	form,
	onClickBack,
	onClickCancel,
	onClickContinue,
}: DSRStepProps) {
	const {
		formState: {errors},
		register,
		watch,
	} = form;

	const {data} = useListTypeDefinition('AC-REGIONS');

	const listTypeEntries = data?.listTypeEntries ?? [];

	const canContinue = Boolean(
		watch('dataCenterLocation') &&
			watch('workspaceName').trim() &&
			watch('workspaceOwnerEmail').trim()
	);

	return (
		<>
			<h2 className="h4">{translate('disaster-recovery-details')}</h2>

			<Input
				{...register('workspaceName')}
				errorMessage={errors.workspaceName?.message}
				label={translate('workspace-name')}
				required
			/>

			<Input
				{...register('workspaceOwnerEmail')}
				errorMessage={errors.workspaceOwnerEmail?.message}
				label={translate('workspace-owner-email')}
				required
			/>

			<div className="form-group">
				<label className="ml-0" htmlFor="generateKeyDataCenter">
					{translate('data-center-location')}
				</label>

				<ClaySelect
					id="generateKeyDataCenter"
					{...register('dataCenterLocation')}
				>
					<ClaySelect.Option label="" value="" />

					{listTypeEntries.map((listTypeEntry) => (
						<ClaySelect.Option
							key={listTypeEntry.key}
							label={listTypeEntry.name}
							value={listTypeEntry.key}
						/>
					))}
				</ClaySelect>
			</div>

			<WizardFooter
				backButtonProps={{onClick: onClickBack}}
				cancelButtonProps={{onClick: onClickCancel}}
				continueButtonProps={{
					children: translate('next'),
					disabled: !canContinue,
					onClick: onClickContinue,
				}}
			/>
		</>
	);
}
