/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayButtonWithIcon} from '@clayui/button';
import ClayTable from '@clayui/table';
import Loading from '~/components/Loading/Loading';
import {useProject} from '~/context/ProjectContext';
import {translate} from '~/i18n';
import {getIconSpriteMap} from '~/services/liferay/liferay';

import WizardFooter from '../../../CloudAppInstall/WizardFooter/WizardFooter';
import useCloudNativeEnvironments from '../hooks/useCloudNativeEnvironments';

type ActivationCodesStepProps = {
	onClickBack: () => void;
	onClickCancel: () => void;
	onClickFinish: () => void;
	onClickOffline: () => void;
};

export default function ActivationCodesStep({
	onClickBack,
	onClickCancel,
	onClickFinish,
	onClickOffline,
}: ActivationCodesStepProps) {
	const {projectId} = useProject();

	const {environments, loading} = useCloudNativeEnvironments(projectId);

	const [offlineNoteStart, offlineNoteEnd] = translate(
		'if-your-environment-doesn-t-have-internet-access-click-here-for-offline-activation'
	).split('{0}');

	if (loading) {
		return <Loading />;
	}

	return (
		<>
			{environments.length ? (
				<ClayTable className="generate-activation-key-table">
					<ClayTable.Head>
						<ClayTable.Row>
							<ClayTable.Cell headingCell>
								{translate('type')}
							</ClayTable.Cell>

							<ClayTable.Cell headingCell>
								{translate('activation-code')}
							</ClayTable.Cell>
						</ClayTable.Row>
					</ClayTable.Head>

					<ClayTable.Body>
						{environments.map((environment) => (
							<ClayTable.Row key={environment.id}>
								<ClayTable.Cell>
									{environment.type}
								</ClayTable.Cell>

								<ClayTable.Cell>
									<span className="align-items-center d-flex">
										{environment.activationCode}

										{!!environment.activationCode && (
											<ClayButtonWithIcon
												aria-label={translate('copy')}
												className="ml-2"
												displayType="unstyled"
												onClick={() =>
													navigator.clipboard.writeText(
														environment.activationCode
													)
												}
												size="sm"
												spritemap={getIconSpriteMap()}
												symbol="copy"
												title={translate('copy')}
											/>
										)}
									</span>
								</ClayTable.Cell>
							</ClayTable.Row>
						))}
					</ClayTable.Body>
				</ClayTable>
			) : (
				<p className="text-neutral-7">
					{translate(
						'no-cloud-native-environments-are-available-for-this-project'
					)}
				</p>
			)}

			<WizardFooter
				backButtonProps={{onClick: onClickBack}}
				cancelButtonProps={{onClick: onClickCancel}}
				continueButtonProps={{
					children: translate('finish-online-activation'),
					onClick: onClickFinish,
				}}
			/>

			<p className="generate-activation-key-offline-note mt-3">
				{offlineNoteStart}

				<button
					className="btn btn-unstyled text-primary"
					onClick={onClickOffline}
					type="button"
				>
					{translate('click-here')}
				</button>

				{offlineNoteEnd}
			</p>
		</>
	);
}
