/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayAlert from '@clayui/alert';
import ClayButton, {ClayButtonWithIcon} from '@clayui/button';
import ClayLabel from '@clayui/label';
import ClayTable from '@clayui/table';
import {useCallback, useEffect, useRef, useState} from 'react';
import Loading from '~/components/Loading/Loading';
import {useProject} from '~/context/ProjectContext';
import {Word, sub, translate} from '~/i18n';
import {ACTIVATION_CODE_ERROR_MESSAGE_KEYS} from '~/pages/MyAccount/Projects/utils/cloudActivationErrorConstants';
import toErrorMessageKey from '~/pages/MyAccount/Projects/utils/toErrorMessageKey';
import {Liferay, getIconSpriteMap} from '~/services/liferay/liferay';
import Cloud, {
	CloudEnvironmentActivationCode,
} from '~/services/spring-boot/Cloud';

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

	const entitledToAnother = Boolean(
		environmentType &&
			(environmentType.unlimited || environmentType.availableCount > 0)
	);

	const everyActivationCodeInUse =
		!!activationCodes.length && !unusedActivationCode && !entitledToAnother;

	const generateActivationCode = useCallback(() => {
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
	}, [keyType, mutate, projectId]);

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

		generateActivationCode();
	}, [
		entitledToAnother,
		environmentType,
		error,
		generateActivationCode,
		keyType,
		loading,
		unusedActivationCode,
	]);

	const [offlineNoteStart, offlineNoteEnd] = translate(
		'if-your-environment-doesn-t-have-internet-access-click-here-for-offline-activation'
	).split('{0}');

	async function onClickCopy(activationCode: CloudEnvironmentActivationCode) {
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
		if (!unusedActivationCode) {
			return;
		}

		onClickOffline({
			activationCode: unusedActivationCode.activationCode,
			bundledEntitlementIds: [],
			environmentId: unusedActivationCode.environmentId,
			environmentName: unusedActivationCode.environmentName,
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

			{everyActivationCodeInUse && (
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

			{activationCodes.length ? (
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
						{activationCodes.map((activationCode) => {
							const inUse =
								activationCode.activationStatus ===
								ACTIVATION_STATUS_ACTIVE;

							return (
								<ClayTable.Row
									key={activationCode.activationCode}
								>
									<ClayTable.Cell>
										{translate(keyType as Word)}
									</ClayTable.Cell>

									<ClayTable.Cell>
										<span
											className={
												inUse
													? 'align-items-center d-flex text-secondary'
													: 'align-items-center d-flex'
											}
										>
											{activationCode.activationCode ||
												'-'}

											{inUse && (
												<ClayLabel
													className="ml-2"
													displayType="secondary"
												>
													{translate('in-use')}
												</ClayLabel>
											)}

											{!!activationCode.activationCode &&
												!inUse && (
													<ClayButtonWithIcon
														aria-label={translate(
															'copy'
														)}
														className="ml-2"
														displayType="unstyled"
														onClick={() =>
															onClickCopy(
																activationCode
															)
														}
														size="sm"
														spritemap={getIconSpriteMap()}
														symbol="copy"
														title={translate(
															'copy'
														)}
													/>
												)}
										</span>
									</ClayTable.Cell>

									<ClayTable.Cell>
										{environmentType?.maxClusterNodes ??
											'-'}
									</ClayTable.Cell>
								</ClayTable.Row>
							);
						})}
					</ClayTable.Body>
				</ClayTable>
			) : (
				<p className="text-neutral-7">
					{translate(
						'no-cloud-native-environments-are-available-for-this-project'
					)}
				</p>
			)}

			{!!activationCodes.length && entitledToAnother && (
				<ClayButton
					className="mt-3"
					displayType="secondary"
					onClick={generateActivationCode}
				>
					{translate('generate-another-activation-code')}
				</ClayButton>
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
					everyActivationCodeInUse
						? undefined
						: {
								children: translate('finish-online-activation'),
								onClick: onClickFinish,
							}
				}
			/>

			{!!unusedActivationCode && (
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
