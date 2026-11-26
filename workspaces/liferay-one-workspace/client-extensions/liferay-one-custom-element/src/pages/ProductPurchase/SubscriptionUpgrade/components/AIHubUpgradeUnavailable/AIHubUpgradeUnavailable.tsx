/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import EmptyState from '~/components/EmptyState/EmptyState';
import i18n from '~/i18n';

type AIHubUpgradeUnavailableProps = {
	error?: unknown;
};

const AIHubUpgradeUnavailable = ({error}: AIHubUpgradeUnavailableProps) => (
	<EmptyState
		description={i18n.translate(
			error
				? 'try-again-later'
				: 'this-upgrade-is-not-available-for-the-selected-project'
		)}
		title={i18n.translate('upgrade-unavailable')}
		type="NOT_FOUND"
	/>
);

export default AIHubUpgradeUnavailable;
