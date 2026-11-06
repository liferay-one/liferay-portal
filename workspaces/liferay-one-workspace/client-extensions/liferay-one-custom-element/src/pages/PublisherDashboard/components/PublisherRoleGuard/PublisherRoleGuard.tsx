/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ReactNode} from 'react';
import EmptyState from '~/components/EmptyState/EmptyState';
import i18n from '~/i18n';

import usePublisherPermissions from '../../hooks/usePublisherPermissions';

type PublisherRoleGuardProps = {
	children: ReactNode;
	flow: 'app' | 'solution';
};

export default function PublisherRoleGuard({
	children,
	flow,
}: PublisherRoleGuardProps) {
	const {canPublishApps, canPublishSolutions} = usePublisherPermissions();

	if (flow === 'app' ? canPublishApps : canPublishSolutions) {
		return children;
	}

	return (
		<EmptyState
			className="mt-5"
			description={i18n.translate('you-do-not-have-access-to-this-page')}
			title={i18n.translate('access-required')}
			type="NO_ACCESS"
		/>
	);
}
