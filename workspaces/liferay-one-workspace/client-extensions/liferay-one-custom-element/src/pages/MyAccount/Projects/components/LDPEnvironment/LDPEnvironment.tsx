/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import CopyTokenField from '~/components/CopyTokenField/CopyTokenField';
import {DetailedCard} from '~/components/DetailedCard/DetailedCard';
import i18n from '~/i18n';
import {buildEnvironmentSections} from '~/pages/MyAccount/Projects/utils/buildEnvironmentSections';

import DetailsCard from '../DetailsCard/DetailsCard';

import type {ProjectEnvironment} from '~/hooks/useProjectEnvironments';

type LDPEnvironmentProps = {
	environment: ProjectEnvironment;
};

export default function LDPEnvironment({environment}: LDPEnvironmentProps) {
	const [section] = buildEnvironmentSections([environment], 'workspace');

	return (
		<>
			<DetailedCard
				cardIconAltText={i18n.translate(
					'connect-your-liferay-data-platform'
				)}
				cardTitle={i18n.translate('connect-your-liferay-data-platform')}
				className="mt-3"
				clayIcon="diagram"
				fitContent
			>
				<div className="mt-3">
					<p className="font-weight-semi-bold">
						{i18n.translate(
							'copy-this-token-to-your-liferay-dxp-instance'
						)}
					</p>

					{environment.dataSourceAccessToken ? (
						<CopyTokenField
							token={environment.dataSourceAccessToken}
						/>
					) : (
						<p className="m-0">
							{i18n.translate(
								'the-data-source-token-is-not-available-yet-please-try-again-in-a-few-minutes'
							)}
						</p>
					)}
				</div>
			</DetailedCard>

			<DetailsCard
				compact
				icon="document"
				rows={section?.rows ?? []}
				title="workspace-info"
			/>
		</>
	);
}
