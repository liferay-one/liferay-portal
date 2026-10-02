/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayLoadingIndicator from '@clayui/loading-indicator';
import i18n from '~/utils/I18n';

import useCheckSecurityVulnerabilitiesAccess from './hooks/useCheckSecurityVulnerabilitiesAccess';
import SecurityVulnerabilitiesPages from './pages';

import './SecurityVulnerabilities.css';

const SecurityVulnerabilities = () => {
	const {hasAccess, loading} = useCheckSecurityVulnerabilitiesAccess();

	if (loading) {
		return (
			<div className="mx-auto">
				<ClayLoadingIndicator size="sm" />
			</div>
		);
	}

	if (!hasAccess) {
		return (
			<p className="py-5 text-center text-neutral-7 text-paragraph w-100">
				{i18n.translate('an-unexpected-error-occurred')}
			</p>
		);
	}

	return <SecurityVulnerabilitiesPages />;
};

export default SecurityVulnerabilities;
