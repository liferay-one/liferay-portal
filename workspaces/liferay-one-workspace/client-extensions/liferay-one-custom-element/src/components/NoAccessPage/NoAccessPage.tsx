/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import EmptyState from '~/components/EmptyState/EmptyState';
import PageTitle from '~/components/PageTitle/PageTitle';
import {translate} from '~/i18n';

export default function NoAccessPage({title}: {title: string}) {
	return (
		<PageTitle title={title}>
			<EmptyState
				className="mt-5"
				title={translate('you-do-not-have-access-to-this-page')}
				type="NO_ACCESS"
			/>
		</PageTitle>
	);
}
