/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayAlert from '@clayui/alert';
import ClayLoadingIndicator from '@clayui/loading-indicator';
import {useState} from 'react';
import Button from '~/components/Button/Button';
import {Word, sub, translate} from '~/i18n';

const ACTIVATION_CLI_COMMAND = '[activation CLI command]';

type OfflineActivationModalProps = {
	environmentType: string;
	errorMessageKey?: Word;
	isActivating: boolean;
	onActivate: (token: string) => void;
	onClose: () => void;
};

const OfflineActivationModal: React.FC<OfflineActivationModalProps> = ({
	environmentType,
	errorMessageKey,
	isActivating,
	onActivate,
	onClose,
}) => {
	const [token, setToken] = useState('');

	return (
		<div>
			<p className="text-neutral-10">
				{sub(
					'this-environment-s-cloud-native-cluster-doesn-t-have-a-live-connection-to-liferay-s-provisioning-service-run-x-in-your-cloud-native-environment-to-generate-a-signed-activation-token-then-paste-it-below-to-activate-this-x-environment',
					[ACTIVATION_CLI_COMMAND, environmentType]
				)}
			</p>

			<label htmlFor="oneOfflineActivationToken">
				{translate('activation-token')}
			</label>

			<textarea
				className="form-control"
				disabled={isActivating}
				id="oneOfflineActivationToken"
				onChange={(event) => setToken(event.target.value)}
				placeholder={translate('paste-your-activation-token-here')}
				rows={6}
				value={token}
			/>

			{!isActivating && !!errorMessageKey && (
				<ClayAlert className="mt-3" displayType="danger" role={null}>
					{translate(errorMessageKey)}
				</ClayAlert>
			)}

			<div className="d-flex justify-content-end mt-4">
				<Button
					disabled={isActivating}
					displayType="secondary"
					onClick={onClose}
				>
					{translate('cancel')}
				</Button>

				<Button
					className="ml-3"
					disabled={isActivating || !token.trim()}
					onClick={() => onActivate(token.trim())}
				>
					<div className="align-items-center d-flex">
						{isActivating && (
							<ClayLoadingIndicator className="mr-3 my-0" />
						)}

						{isActivating
							? translate('activating')
							: translate('ok')}
					</div>
				</Button>
			</div>
		</div>
	);
};

export default OfflineActivationModal;
