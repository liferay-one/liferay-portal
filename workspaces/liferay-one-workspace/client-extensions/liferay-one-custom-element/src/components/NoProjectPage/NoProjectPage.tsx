/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import PageTitle from '~/components/PageTitle/PageTitle';
import RestrictedFeatureMessage from '~/components/RestrictedFeatureMessage/RestrictedFeatureMessage';
import {translate} from '~/i18n';

export default function NoProjectPage({
	hasAccountProjects,
	title,
}: {
	hasAccountProjects: boolean;
	title: string;
}) {
	return (
		<PageTitle title={title}>
			<RestrictedFeatureMessage
				message={
					hasAccountProjects
						? translate(
								'login-as-a-user-that-has-access-to-a-project-or-contact-your-project-administrator-to-add-you-to-a-project.'
							)
						: undefined
				}
			/>
		</PageTitle>
	);
}
