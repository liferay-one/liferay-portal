/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayAlert from '@clayui/alert';
import {UseFormReturn} from 'react-hook-form';
import {Word, sub, translate} from '~/i18n';
import {getIconSpriteMap} from '~/services/liferay/liferay';

import WizardFooter from '../../../CloudAppInstall/WizardFooter/WizardFooter';
import {GenerateActivationKeyForm} from '../types';

const ACTIVATION_CLI_COMMAND = '[activation CLI command]';

type OfflineTokenStepProps = {
	form: UseFormReturn<GenerateActivationKeyForm>;
	onClickBack: () => void;
	onClickCancel: () => void;
	onClickContinue: () => void;
};

export default function OfflineTokenStep({
	form,
	onClickBack,
	onClickCancel,
	onClickContinue,
}: OfflineTokenStepProps) {
	const {register, watch} = form;

	const activationToken = watch('activationToken');
	const keyType = watch('keyType');

	return (
		<>
			<div className="form-group">
				<label className="ml-0" htmlFor="generateKeyActivationToken">
					{translate('cne-environment-token')}
				</label>

				<textarea
					className="form-control"
					id="generateKeyActivationToken"
					placeholder={translate('paste-your-cne-environment-token')}
					rows={3}
					{...register('activationToken')}
				/>
			</div>

			<ClayAlert
				className="generate-activation-key-server-alert mb-4"
				displayType="info"
				role={null}
				spritemap={getIconSpriteMap()}
				symbol="info-circle"
			>
				{sub(
					'this-environment-s-cloud-native-cluster-doesn-t-have-a-live-connection-to-liferay-s-provisioning-service-run-x-in-your-cloud-native-environment-to-generate-a-signed-activation-token-then-paste-it-below-to-activate-this-x-environment',
					[ACTIVATION_CLI_COMMAND, translate(keyType as Word)]
				)}
			</ClayAlert>

			<WizardFooter
				backButtonProps={{onClick: onClickBack}}
				cancelButtonProps={{onClick: onClickCancel}}
				continueButtonProps={{
					children: translate('next'),
					disabled: !activationToken.trim(),
					onClick: onClickContinue,
				}}
			/>
		</>
	);
}
