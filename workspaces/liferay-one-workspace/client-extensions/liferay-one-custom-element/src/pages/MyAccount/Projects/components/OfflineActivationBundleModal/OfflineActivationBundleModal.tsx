/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayAlert from '@clayui/alert';
import ClayLoadingIndicator from '@clayui/loading-indicator';
import {useState} from 'react';
import Button from '~/components/Button/Button';
import {useDXPProductVersions} from '~/hooks/useDXPProductVersions';
import {Word, translate} from '~/i18n';

type OfflineActivationBundleModalProps = {
	errorMessageKey?: Word;
	isDownloading: boolean;
	onClose: () => void;
	onDownload: (dxpVersion: string) => void;
};

const OfflineActivationBundleModal: React.FC<
	OfflineActivationBundleModalProps
> = ({errorMessageKey, isDownloading, onClose, onDownload}) => {
	const [dxpVersion, setDXPVersion] = useState('');

	const {productVersions} = useDXPProductVersions();

	return (
		<div>
			<label htmlFor="oneOfflineBundleDXPVersion">
				{translate('dxp-version')}
			</label>

			<select
				className="form-control"
				disabled={isDownloading}
				id="oneOfflineBundleDXPVersion"
				onChange={(event) => setDXPVersion(event.target.value)}
				value={dxpVersion}
			>
				<option disabled value="">
					{translate('select-a-dxp-version')}
				</option>

				{productVersions.map((productVersion) => (
					<option key={productVersion} value={productVersion}>
						{productVersion}
					</option>
				))}
			</select>

			{!isDownloading && !!errorMessageKey && (
				<ClayAlert className="mt-3" displayType="danger" role={null}>
					{translate(errorMessageKey)}
				</ClayAlert>
			)}

			<div className="d-flex justify-content-end mt-4">
				<Button
					disabled={isDownloading}
					displayType="secondary"
					onClick={onClose}
				>
					{translate('cancel')}
				</Button>

				<Button
					className="ml-3"
					disabled={isDownloading || !dxpVersion}
					onClick={() => onDownload(dxpVersion)}
				>
					<div className="align-items-center d-flex">
						{isDownloading && (
							<ClayLoadingIndicator className="mr-3 my-0" />
						)}

						{isDownloading
							? translate('download-in-progress')
							: translate('download')}
					</div>
				</Button>
			</div>
		</div>
	);
};

export default OfflineActivationBundleModal;
