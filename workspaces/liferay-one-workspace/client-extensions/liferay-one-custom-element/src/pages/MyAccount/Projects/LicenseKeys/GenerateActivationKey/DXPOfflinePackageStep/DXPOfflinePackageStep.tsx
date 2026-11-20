/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayAlert from '@clayui/alert';
import {UseFormReturn} from 'react-hook-form';
import {translate} from '~/i18n';
import {getIconSpriteMap} from '~/services/liferay/liferay';

import WizardFooter from '../../../CloudAppInstall/WizardFooter/WizardFooter';
import VersionField from '../components/VersionField/VersionField';
import {GenerateActivationKeyForm} from '../types';

type DXPOfflinePackageStepProps = {
	form: UseFormReturn<GenerateActivationKeyForm>;
	onClickBack: () => void;
	onClickCancel: () => void;
	onClickDownload: () => void;
	submitting: boolean;
	versions: string[];
};

export default function DXPOfflinePackageStep({
	form,
	onClickBack,
	onClickCancel,
	onClickDownload,
	submitting,
	versions,
}: DXPOfflinePackageStepProps) {
	const {register, watch} = form;

	const activationToken = watch('activationToken');
	const dxpActivationCode = watch('dxpActivationCode');
	const version = watch('version');

	return (
		<>
			<div className="form-group">
				<label className="ml-0" htmlFor="generateKeyDXPActivationCode">
					{translate('activation-code')}
				</label>

				<input
					className="form-control"
					id="generateKeyDXPActivationCode"
					readOnly
					value={dxpActivationCode}
				/>
			</div>

			<div className="form-group">
				<label className="ml-0" htmlFor="generateKeyDXPActivationToken">
					{translate('activation-token')}
				</label>

				<textarea
					className="form-control"
					id="generateKeyDXPActivationToken"
					placeholder={translate(
						'paste-the-activation-token-shown-on-the-dxp-activation-page'
					)}
					rows={3}
					{...register('activationToken')}
				/>
			</div>

			<VersionField form={form} versions={versions} />

			<ClayAlert
				className="generate-activation-key-server-alert mb-4"
				displayType="info"
				role={null}
				spritemap={getIconSpriteMap()}
				symbol="info-circle"
			>
				{translate(
					'the-offline-activation-package-holds-the-license-and-every-add-on-of-this-project-for-the-selected-dxp-version-upload-it-on-the-dxp-activation-page'
				)}
			</ClayAlert>

			<WizardFooter
				backButtonProps={{disabled: submitting, onClick: onClickBack}}
				cancelButtonProps={{
					disabled: submitting,
					onClick: onClickCancel,
				}}
				continueButtonProps={{
					children: translate('download'),
					disabled:
						!activationToken.trim() ||
						!dxpActivationCode ||
						!version ||
						submitting,
					onClick: onClickDownload,
				}}
			/>
		</>
	);
}
