/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useModal} from '@clayui/modal';
import ClayTable from '@clayui/table';
import {useState} from 'react';
import Button from '~/components/Button/Button';
import {DetailedCard} from '~/components/DetailedCard/DetailedCard';
import Modal from '~/components/Modal/Modal';
import {useProjectEnvironments} from '~/hooks/useProjectEnvironments';
import {Word, translate} from '~/i18n';
import {getStatusColor} from '~/pages/MyAccount/Projects/utils/getStatusColor';
import FetcherError from '~/services/fetcher/FetcherError';
import {Liferay} from '~/services/liferay/liferay';
import Cloud from '~/services/spring-boot/Cloud';

import OfflineActivationBundleModal from '../OfflineActivationBundleModal/OfflineActivationBundleModal';
import OfflineActivationModal from '../OfflineActivationModal/OfflineActivationModal';
import PopoverIcon from '../PopoverIcon/PopoverIcon';

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

const CLOUD_TYPES = ['CNE', 'PaaS', 'SaaS'];

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

	const cloudEnvironments = environments.filter((environment) =>
		CLOUD_TYPES.includes(environment.type)
	);

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
		<DetailedCard
			cardIconAltText={translate('cloud-native-environments')}
			cardTitle={translate('cloud-native-environments')}
			className="mt-3"
			clayIcon="cloud"
		>
			{loading ? (
				<div className="p-4 text-neutral-7">{translate('loading')}</div>
			) : cloudEnvironments.length ? (
				<ClayTable borderless className="mt-3">
					<ClayTable.Head>
						<ClayTable.Row>
							<ClayTable.Cell headingCell>
								{translate('environment')}
							</ClayTable.Cell>

							<ClayTable.Cell headingCell>
								{translate('region')}
							</ClayTable.Cell>

							<ClayTable.Cell headingCell>
								{translate('identity')}

								<PopoverIcon
									title={translate(
										'please-copy-and-paste-this-subscription-id-to-your-cloud-native-instance'
									)}
								/>
							</ClayTable.Cell>

							<ClayTable.Cell headingCell>
								{translate('status')}
							</ClayTable.Cell>

							<ClayTable.Cell className="text-center" headingCell>
								{translate('actions')}
							</ClayTable.Cell>
						</ClayTable.Row>
					</ClayTable.Head>

					<ClayTable.Body>
						{cloudEnvironments.map((environment) => {
							const active =
								environment.status === ACTIVATION_STATUS_ACTIVE;

							return (
								<ClayTable.Row
									key={environment.externalReferenceCode}
								>
									<ClayTable.Cell>
										<span className="d-flex flex-column">
											<span className="fw-bold">
												{environment.environmentName ||
													translate(
														environment.environmentType as Word
													)}
											</span>

											<span className="list-card-subtext">
												{environment.type}
											</span>
										</span>
									</ClayTable.Cell>

									<ClayTable.Cell>
										{environment.region || '-'}
									</ClayTable.Cell>

									<ClayTable.Cell>
										{environment.activationCode ||
											environment.currentEntitlementHash ||
											'-'}
									</ClayTable.Cell>

									<ClayTable.Cell>
										<span className="list-card-status">
											<span
												className="list-card-status-dot"
												style={{
													backgroundColor:
														getStatusColor(
															environment.status
														),
												}}
											/>

											{translate(
												environment.status as Word
											)}
										</span>
									</ClayTable.Cell>

									<ClayTable.Cell className="text-center">
										{active ? (
											<Button
												aria-label={translate(
													'download'
												)}
												borderless
												className="text-neutral-7"
												disabled={
													environment.activationMode !==
													ACTIVATION_MODE_OFFLINE
												}
												displayType="unstyled"
												onClick={() =>
													setDownloadingEnvironment(
														environment
													)
												}
												prependIcon="download"
											/>
										) : (
											<Button
												displayType="secondary"
												onClick={() =>
													setActivatingEnvironment(
														environment
													)
												}
												small
											>
												{translate('activate')}
											</Button>
										)}
									</ClayTable.Cell>
								</ClayTable.Row>
							);
						})}
					</ClayTable.Body>
				</ClayTable>
			) : (
				<div className="p-4 text-neutral-7">
					{translate('no-cloud-native-environments-yet')}
				</div>
			)}

			<Modal
				observer={activationObserver}
				title={translate('offline-activation')}
				visible={!!activatingEnvironment}
			>
				<OfflineActivationModal
					environmentType={
						activatingEnvironment?.environmentType ?? ''
					}
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
		</DetailedCard>
	);
}
