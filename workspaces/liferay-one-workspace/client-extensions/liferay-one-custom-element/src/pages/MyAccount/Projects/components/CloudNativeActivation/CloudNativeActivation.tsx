/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayIcon from '@clayui/icon';
import {useModal} from '@clayui/modal';
import ClayTable from '@clayui/table';
import {useState} from 'react';
import Button from '~/components/Button/Button';
import {DetailedCard} from '~/components/DetailedCard/DetailedCard';
import Modal from '~/components/Modal/Modal';
import {Tooltip} from '~/components/Tooltip/Tooltip';
import {useProject} from '~/context/ProjectContext';
import {useProjectEnvironments} from '~/hooks/useProjectEnvironments';
import {Word, sub, translate} from '~/i18n';
import {filterEnvironmentsByProject} from '~/pages/MyAccount/Projects/utils/filterEnvironmentsByProject';
import FetcherError from '~/services/fetcher/FetcherError';
import {Liferay} from '~/services/liferay/liferay';
import Cloud from '~/services/spring-boot/Cloud';

import OfflineActivationBundleModal from '../OfflineActivationBundleModal/OfflineActivationBundleModal';
import OfflineActivationModal from '../OfflineActivationModal/OfflineActivationModal';

import type {ProjectEnvironment} from '~/hooks/useProjectEnvironments';

const ACTIVATION_ERROR_MESSAGE_KEYS: Record<number, Word> = {
	400: 'the-activation-token-is-not-valid',
	404: 'the-activation-code-was-not-found',
	409: 'this-environment-has-already-been-activated',
};

const ACTIVATION_MODE_OFFLINE = 'offline';

const ACTIVATION_STATUS_ACTIVE = 'active';

const BUNDLE_ERROR_MESSAGE_KEYS: Record<number, Word> = {
	422: 'one-or-more-add-ons-are-not-available-for-the-selected-dxp-version',
};

function toErrorMessageKey(
	error: unknown,
	errorMessageKeys: Record<number, Word>
): Word {
	if (error instanceof FetcherError && error.status) {
		return errorMessageKeys[error.status] ?? 'an-unexpected-error-occurred';
	}

	return 'an-unexpected-error-occurred';
}

export default function CloudNativeActivation() {
	const {projectId} = useProject();
	const {environments, loading, mutate} = useProjectEnvironments();

	const [activatingEnvironment, setActivatingEnvironment] =
		useState<ProjectEnvironment | null>(null);
	const [downloadingEnvironment, setDownloadingEnvironment] =
		useState<ProjectEnvironment | null>(null);
	const [errorMessageKey, setErrorMessageKey] = useState<Word | undefined>();
	const [isActivating, setIsActivating] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);

	const {observer: activationObserver, onClose: onActivationClose} = useModal(
		{
			onClose: () => {
				setActivatingEnvironment(null);
				setErrorMessageKey(undefined);
			},
		}
	);

	const {observer: bundleObserver, onClose: onBundleClose} = useModal({
		onClose: () => {
			setDownloadingEnvironment(null);
			setErrorMessageKey(undefined);
		},
	});

	const cloudEnvironments = filterEnvironmentsByProject(
		projectId,
		environments.filter(
			(environment) => environment.offering === 'Cloud Native'
		)
	);

	const activatedEnvironments = cloudEnvironments.filter(
		(environment) => environment.status === ACTIVATION_STATUS_ACTIVE
	);

	const unactivatedEnvironments = cloudEnvironments.filter(
		(environment) => environment.status !== ACTIVATION_STATUS_ACTIVE
	);

	const onCopyActivationCode = (activationCode: string) => {
		navigator.clipboard.writeText(activationCode);

		Liferay.Util.openToast({
			message: sub('copied-x-to-the-clipboard', 'activation code'),
		});
	};

	const onActivate = async (token: string) => {
		if (!activatingEnvironment) {
			return;
		}

		setErrorMessageKey(undefined);
		setIsActivating(true);

		try {
			await Cloud.offlineActivation(
				activatingEnvironment.activationCode,
				token
			);

			await mutate();

			Liferay.Util.openToast({
				message: translate('the-environment-was-activated'),
				type: 'success',
			});

			onActivationClose();
		}
		catch (error) {
			setErrorMessageKey(
				toErrorMessageKey(error, ACTIVATION_ERROR_MESSAGE_KEYS)
			);
		}
		finally {
			setIsActivating(false);
		}
	};

	const onDownload = async (dxpVersion: string) => {
		if (!downloadingEnvironment) {
			return;
		}

		setErrorMessageKey(undefined);
		setIsDownloading(true);

		try {
			await Cloud.downloadOfflineActivationBundle(
				dxpVersion,
				downloadingEnvironment.externalReferenceCode
			);

			onBundleClose();
		}
		catch (error) {
			setErrorMessageKey(
				toErrorMessageKey(error, BUNDLE_ERROR_MESSAGE_KEYS)
			);
		}
		finally {
			setIsDownloading(false);
		}
	};

	return (
		<>
			<DetailedCard
				cardIconAltText={translate('cloud-native-environments')}
				cardTitle={translate('cloud-native-environments')}
				className="mt-3"
				clayIcon="cloud"
			>
				{loading ? (
					<div className="p-4 text-neutral-7">
						{translate('loading')}
					</div>
				) : activatedEnvironments.length ? (
					<ClayTable borderless className="mt-3">
						<ClayTable.Head>
							<ClayTable.Row>
								<ClayTable.Cell headingCell>
									{translate('type')}
								</ClayTable.Cell>

								<ClayTable.Cell headingCell>
									{translate('environment-id')}
								</ClayTable.Cell>

								<ClayTable.Cell headingCell>
									{translate('environment-name')}
								</ClayTable.Cell>

								<ClayTable.Cell
									className="text-center"
									headingCell
								>
									{translate('actions')}
								</ClayTable.Cell>
							</ClayTable.Row>
						</ClayTable.Head>

						<ClayTable.Body>
							{activatedEnvironments.map((environment) => (
								<ClayTable.Row
									key={environment.externalReferenceCode}
								>
									<ClayTable.Cell>
										{environment.type
											? translate(
													environment.type as Word
												)
											: '-'}
									</ClayTable.Cell>

									<ClayTable.Cell>
										{environment.externalReferenceCode}
									</ClayTable.Cell>

									<ClayTable.Cell>
										{environment.name || '-'}
									</ClayTable.Cell>

									<ClayTable.Cell className="text-center">
										{environment.activationMode ===
											ACTIVATION_MODE_OFFLINE && (
											<Button
												displayType="link"
												onClick={() =>
													setDownloadingEnvironment(
														environment
													)
												}
												small
											>
												{translate(
													'download-offline-activation-bundle'
												)}
											</Button>
										)}
									</ClayTable.Cell>
								</ClayTable.Row>
							))}
						</ClayTable.Body>
					</ClayTable>
				) : (
					<div className="p-4 text-neutral-7">
						{translate('no-cloud-native-environments-yet')}
					</div>
				)}
			</DetailedCard>

			{!loading && !!unactivatedEnvironments.length && (
				<DetailedCard
					cardIconAltText={translate('activation-codes')}
					cardTitle={translate('activation-codes')}
					className="mt-3"
					clayIcon="key"
				>
					<ClayTable borderless className="mt-3">
						<ClayTable.Head>
							<ClayTable.Row>
								<ClayTable.Cell headingCell>
									{translate('type')}
								</ClayTable.Cell>

								<ClayTable.Cell headingCell>
									<span className="align-items-center d-flex">
										{translate('activation-code')}

										<span className="ml-2">
											<Tooltip
												tooltip={translate(
													'please-copy-and-paste-this-activation-code-to-your-cloud-native-instance'
												)}
											/>
										</span>
									</span>
								</ClayTable.Cell>

								<ClayTable.Cell
									className="text-center"
									headingCell
								>
									{translate('actions')}
								</ClayTable.Cell>
							</ClayTable.Row>
						</ClayTable.Head>

						<ClayTable.Body>
							{unactivatedEnvironments.map((environment) => (
								<ClayTable.Row
									key={environment.externalReferenceCode}
								>
									<ClayTable.Cell>
										{environment.type
											? translate(
													environment.type as Word
												)
											: '-'}
									</ClayTable.Cell>

									<ClayTable.Cell>
										{environment.activationCode}

										{!!environment.activationCode && (
											<button
												aria-label={translate('copy')}
												className="btn btn-unstyled ml-2 text-neutral-7"
												onClick={() =>
													onCopyActivationCode(
														environment.activationCode
													)
												}
												type="button"
											>
												<ClayIcon symbol="copy" />
											</button>
										)}
									</ClayTable.Cell>

									<ClayTable.Cell className="text-center">
										<Button
											displayType="secondary"
											onClick={() =>
												setActivatingEnvironment(
													environment
												)
											}
											small
										>
											{translate('offline-activation')}
										</Button>
									</ClayTable.Cell>
								</ClayTable.Row>
							))}
						</ClayTable.Body>
					</ClayTable>
				</DetailedCard>
			)}

			<Modal
				observer={activationObserver}
				title={translate('offline-activation')}
				visible={!!activatingEnvironment}
			>
				<OfflineActivationModal
					environmentType={activatingEnvironment?.type ?? ''}
					errorMessageKey={errorMessageKey}
					isActivating={isActivating}
					onActivate={onActivate}
					onClose={onActivationClose}
				/>
			</Modal>

			<Modal
				observer={bundleObserver}
				title={translate('download-offline-activation-bundle')}
				visible={!!downloadingEnvironment}
			>
				<OfflineActivationBundleModal
					errorMessageKey={errorMessageKey}
					isDownloading={isDownloading}
					onClose={onBundleClose}
					onDownload={onDownload}
				/>
			</Modal>
		</>
	);
}
