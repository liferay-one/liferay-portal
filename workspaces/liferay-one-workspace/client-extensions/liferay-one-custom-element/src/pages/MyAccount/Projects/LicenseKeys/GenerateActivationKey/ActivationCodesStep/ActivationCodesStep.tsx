/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayAlert from '@clayui/alert';
import {ClayButtonWithIcon} from '@clayui/button';
import ClayLabel from '@clayui/label';
import ClayTable from '@clayui/table';
import {useEffect, useRef, useState} from 'react';
import Loading from '~/components/Loading/Loading';
import {useProject} from '~/context/ProjectContext';
import {Word, sub, translate} from '~/i18n';
import {ACTIVATION_CODE_ERROR_MESSAGE_KEYS} from '~/pages/MyAccount/Projects/utils/cloudActivationErrorConstants';
import toErrorMessageKey from '~/pages/MyAccount/Projects/utils/toErrorMessageKey';
import {Liferay, getIconSpriteMap} from '~/services/liferay/liferay';
import Cloud from '~/services/spring-boot/Cloud';

import WizardFooter from '../../../CloudAppInstall/WizardFooter/WizardFooter';
import useCloudNativeActivationCodes from '../hooks/useCloudNativeActivationCodes';
import {GenerateActivationKeyOfflineEnvironment} from '../types';
import {ACTIVATION_STATUS_ACTIVE} from '../utils';

type ActivationCodesStepProps = {
	keyType: string;
	onClickBack: () => void;
	onClickCancel: () => void;
	onClickFinish: () => void;
	onClickOffline: (
		offlineEnvironment: GenerateActivationKeyOfflineEnvironment
	) => void;
};

export default function ActivationCodesStep({
	keyType,
	onClickBack,
	onClickCancel,
	onClickFinish,
	onClickOffline,
}: ActivationCodesStepProps) {
	const {projectId} = useProject();

	const {environmentTypes, error, loading, mutate} =
		useCloudNativeActivationCodes(projectId);

	const [generateError, setGenerateError] = useState('');
	const [generating, setGenerating] = useState(false);

	const generatedTypeRef = useRef('');

	const environmentType = environmentTypes.find(
		(current) => current.type === keyType
	);

	const activationCodes = environmentType?.activationCodes ?? [];

	const unusedActivationCode = activationCodes.find(
		(current) => current.activationStatus !== ACTIVATION_STATUS_ACTIVE
	);

	const activationCode = unusedActivationCode ?? activationCodes[0];

	const activationCodeInUse =
		activationCode?.activationStatus === ACTIVATION_STATUS_ACTIVE;

	const entitledToAnother = Boolean(
		environmentType &&
			(environmentType.unlimited || environmentType.availableCount > 0)
	);

	useEffect(() => {
		if (
			loading ||
			error ||
			!environmentType ||
			unusedActivationCode ||
			!entitledToAnother ||
			generatedTypeRef.current === keyType
		) {
			return;
		}

		generatedTypeRef.current = keyType;

		setGenerateError('');
		setGenerating(true);

		Cloud.postProjectsEnvironmentsActivationCodes(projectId, keyType)
			.then(() => mutate())
			.catch((generationError) =>
				setGenerateError(
					translate(
						toErrorMessageKey(
							generationError,
							ACTIVATION_CODE_ERROR_MESSAGE_KEYS
						)
					)
				)
			)
			.finally(() => setGenerating(false));
	}, [
		entitledToAnother,
		environmentType,
		error,
		keyType,
		loading,
		mutate,
		projectId,
		unusedActivationCode,
	]);

	const [offlineNoteStart, offlineNoteEnd] = translate(
		'if-your-environment-doesn-t-have-internet-access-click-here-for-offline-activation'
	).split('{0}');

	async function onClickCopy() {
		try {
			await navigator.clipboard.writeText(activationCode.activationCode);
		}
		catch (clipboardError) {
			Liferay.Util.openToast({
				message: translate('an-unexpected-error-occurred'),
				type: 'danger',
			});

			return;
		}

		Liferay.Util.openToast({
			message: sub('copied-x-to-the-clipboard', 'activation code'),
		});
	}

	function onClickOfflineActivation() {
		onClickOffline({
			activationCode: activationCode.activationCode,
			bundledEntitlementIds: [],
			environmentId: activationCode.environmentId,
			environmentName: activationCode.environmentName,
			requestedVersion: '',
			type: keyType,
		});
	}

	if (loading || generating) {
		return <Loading />;
	}

	if (error) {
		return (
			<>
				<ClayAlert
					className="mb-3"
					displayType="danger"
					spritemap={getIconSpriteMap()}
					title={translate('error')}
				>
					{translate('an-unexpected-error-occurred')}
				</ClayAlert>

				<WizardFooter
					backButtonProps={{onClick: onClickBack}}
					cancelButtonProps={{onClick: onClickCancel}}
					continueButtonProps={{
						children: translate('finish-online-activation'),
						onClick: onClickFinish,
					}}
				/>
			</>
		);
	}

	return (
		<>
			{!!generateError && (
				<ClayAlert
					className="mb-3"
					displayType="danger"
					spritemap={getIconSpriteMap()}
					title={translate('error')}
				>
					{generateError}
				</ClayAlert>
			)}

			{activationCodeInUse && (
				<ClayAlert
					className="mb-3"
					displayType="info"
					role={null}
					spritemap={getIconSpriteMap()}
				>
					{sub(
						'every-x-activation-code-is-in-use-each-activation-code-activates-one-environment',
						translate(keyType as Word)
					)}
				</ClayAlert>
			)}

			{activationCode ? (
				<ClayTable className="generate-activation-key-table">
					<ClayTable.Head>
						<ClayTable.Row>
							<ClayTable.Cell headingCell>
								{translate('type')}
							</ClayTable.Cell>

							<ClayTable.Cell headingCell>
								{translate('activation-code')}
							</ClayTable.Cell>

							<ClayTable.Cell headingCell>
								{translate('maximum-cluster-nodes')}
							</ClayTable.Cell>
						</ClayTable.Row>
					</ClayTable.Head>

					<ClayTable.Body>
						<ClayTable.Row>
							<ClayTable.Cell>
								{translate(keyType as Word)}
							</ClayTable.Cell>

							<ClayTable.Cell>
								<span
									className={
										activationCodeInUse
											? 'align-items-center d-flex text-secondary'
											: 'align-items-center d-flex'
									}
								>
									{activationCode.activationCode || '-'}

									{activationCodeInUse && (
										<ClayLabel
											className="ml-2"
											displayType="secondary"
										>
											{translate('in-use')}
										</ClayLabel>
									)}

									{!!activationCode.activationCode &&
										!activationCodeInUse && (
											<ClayButtonWithIcon
												aria-label={translate('copy')}
												className="ml-2"
												displayType="unstyled"
												onClick={onClickCopy}
												size="sm"
												spritemap={getIconSpriteMap()}
												symbol="copy"
												title={translate('copy')}
											/>
										)}
								</span>
							</ClayTable.Cell>

							<ClayTable.Cell>
								{environmentType?.maxClusterNodes ?? '-'}
							</ClayTable.Cell>
						</ClayTable.Row>
					</ClayTable.Body>
				</ClayTable>
			) : (
				<p className="text-neutral-7">
					{translate(
						'no-cloud-native-environments-are-available-for-this-project'
					)}
				</p>
			)}

			<p className="generate-activation-key-offline-note mt-3">
				{translate(
					'after-you-paste-an-activation-code-no-further-action-is-needed-cloud-native-environments-sync-with-liferay-daily-and-any-add-on-purchased-later-is-picked-up-on-the-next-sync-without-regenerating-the-code'
				)}
			</p>

			<WizardFooter
				backButtonProps={{onClick: onClickBack}}
				cancelButtonProps={{onClick: onClickCancel}}
				continueButtonProps={
					activationCodeInUse
						? undefined
						: {
								children: translate('finish-online-activation'),
								onClick: onClickFinish,
							}
				}
			/>

			{!!activationCode && !activationCodeInUse && (
				<p className="generate-activation-key-offline-note mt-3">
					{offlineNoteStart}

					<button
						className="btn btn-unstyled text-primary"
						onClick={onClickOfflineActivation}
						type="button"
					>
						{translate('click-here')}
					</button>

					{offlineNoteEnd}
				</p>
			)}
		</>
	);
}
