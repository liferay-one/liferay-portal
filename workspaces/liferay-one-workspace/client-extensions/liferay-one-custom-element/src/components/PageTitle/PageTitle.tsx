/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import type {ReactNode} from 'react';

export default function PageTitle({
	children,
	title,
}: {
	children: ReactNode;
	title: string;
}) {
	return (
		<div className="py-4">
			<div>
				<h1 className="font-weight-bold text-neutral-10">{title}</h1>
			</div>

			{children}
		</div>
	);
}
