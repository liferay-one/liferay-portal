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
import Projects, {DXPActivationCode} from '~/services/spring-boot/Projects';

import WizardFooter from '../../../CloudAppInstall/WizardFooter/WizardFooter';
import useDXPActivationCodes from '../hooks/useDXPActivationCodes';
import {ACTIVATION_STATUS_ACTIVE} from '../utils';

type DXPActivationCodesStepProps = {
	keyType: string;
	onClickBack: () => void;
	onClickCancel: () => void;
	onClickFinish: () => void;
	onClickOffline: (activationCode: string) => void;
};

export default function DXPActivationCodesStep({
	keyType,
	onClickBack,
	onClickCancel,
	onClickFinish,
	onClickOffline,
}: DXPActivationCodesStepProps) {
	const {projectId} = useProject();

	const {environmentTypes, error, loading, mutate} =
		useDXPActivationCodes(projectId);

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

		Projects.postDXPActivationCodes(projectId, keyType)
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
		'if-your-installation-doesn-t-have-internet-access-click-here-for-offline-activation'
	).split('{0}');

	async function onClickCopy(activationCode: DXPActivationCode) {
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
						'every-x-activation-code-is-in-use-each-activation-code-activates-one-installation',
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
								{translate('installation-id')}
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
										{activationCode.installationId || '-'}
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
						'no-dxp-installations-are-available-for-this-project'
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
					'after-you-enter-an-activation-code-in-dxp-no-further-action-is-needed-dxp-syncs-with-liferay-and-any-add-on-purchased-later-is-picked-up-on-the-next-sync-without-regenerating-the-code'
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
						onClick={() =>
							onClickOffline(unusedActivationCode.activationCode)
						}
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
