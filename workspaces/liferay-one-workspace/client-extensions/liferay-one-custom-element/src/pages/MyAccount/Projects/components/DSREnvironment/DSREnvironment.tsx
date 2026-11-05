/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useEffect, useState} from 'react';
import CopyTokenField from '~/components/CopyTokenField/CopyTokenField';
import {DetailedCard} from '~/components/DetailedCard/DetailedCard';
import Loading from '~/components/Loading/Loading';
import i18n from '~/i18n';
import DigitalSalesRoom from '~/services/spring-boot/DigitalSalesRoom';

import DetailsCard, {DetailsRow} from '../DetailsCard/DetailsCard';
import EnvironmentCards from '../EnvironmentCards/EnvironmentCards';

import type {ProjectEnvironment} from '~/hooks/useProjectEnvironments';

type DSREnvironmentProps = {
	environment: ProjectEnvironment;
};

export default function DSREnvironment({environment}: DSREnvironmentProps) {
	const [error, setError] = useState(false);
	const [token, setToken] = useState<string>();

	useEffect(() => {
		let cancelled = false;

		setError(false);
		setToken(undefined);

		DigitalSalesRoom.getEnvironmentsDataSourceToken(
			environment.externalReferenceCode
		)
			.then(({dataSourceAccessToken}) => {
				if (!cancelled) {
					setToken(dataSourceAccessToken);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setError(true);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [environment.externalReferenceCode]);

	const rows: DetailsRow[] = [
		{
			label: i18n.translate('workspace-name'),
			value: environment.workspaceName,
		},
		{
			label: i18n.translate('workspace-owner-email'),
			value: environment.ownerEmailAddress,
		},
		{
			label: i18n.translate('data-center-location'),
			value: environment.region,
		},
	].filter((row) => row.value);

	return (
		<EnvironmentCards>
			<DetailsCard
				compact
				icon="document"
				rows={rows}
				title="workspace-info"
			/>

			<DetailedCard
				cardIconAltText={i18n.translate('connect-your-liferay-dsr')}
				cardTitle={i18n.translate('connect-your-liferay-dsr')}
				className="detailed-card-compact mt-3"
				clayIcon="diagram"
				fitContent
			>
				<div className="mt-3">
					<p className="font-weight-semi-bold">
						{i18n.translate(
							'copy-this-token-to-your-liferay-dxp-instance'
						)}
					</p>

					{error ? (
						<p className="text-danger">
							{i18n.translate('unable-to-load-the-token')}
						</p>
					) : token === undefined ? (
						<Loading.Inline />
					) : (
						<CopyTokenField token={token} />
					)}
				</div>
			</DetailedCard>
		</EnvironmentCards>
	);
}
