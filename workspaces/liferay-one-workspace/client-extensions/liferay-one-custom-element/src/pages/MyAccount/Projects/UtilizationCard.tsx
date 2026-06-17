/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {DetailedCard} from '../../../components/DetailedCard/DetailedCard';
import i18n from '../../../i18n';

// Usage metrics are not yet backed by a consumption/usage object in this
// workspace, so the tab renders an empty state. Once a usage data source
// exists, render the per-type metric tiles here (e.g. Events/month and API
// Requests/month for LDP, the New Project Usage Dashboard for PaaS/SaaS).

export default function UtilizationCard() {
	return (
		<DetailedCard
			cardIconAltText={i18n.translate('utilization')}
			cardTitle={i18n.translate('usage')}
			className="mt-3"
			clayIcon="analytics"
		>
			<p className="mt-3 text-neutral-7">
				{i18n.translate('no-usage-data-yet')}
			</p>
		</DetailedCard>
	);
}
