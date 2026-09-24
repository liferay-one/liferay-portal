/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import CopyTokenField from '~/components/CopyTokenField/CopyTokenField';
import {DetailedCard} from '~/components/DetailedCard/DetailedCard';
import i18n from '~/i18n';

type LDPTokenCardProps = {
	dataSourceAccessToken: string;
};

export default function LDPTokenCard({
	dataSourceAccessToken,
}: LDPTokenCardProps) {
	return (
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
				{dataSourceAccessToken ? (
					<>
						<p className="font-weight-semi-bold">
							{i18n.translate(
								'copy-this-token-to-your-liferay-dxp-instance'
							)}
						</p>

						<CopyTokenField token={dataSourceAccessToken} />
					</>
				) : (
					<p className="m-0 text-neutral-7">
						{i18n.translate(
							'the-data-source-token-is-not-available-yet-please-try-again-in-a-few-minutes'
						)}
					</p>
				)}
			</div>
		</DetailedCard>
	);
}
