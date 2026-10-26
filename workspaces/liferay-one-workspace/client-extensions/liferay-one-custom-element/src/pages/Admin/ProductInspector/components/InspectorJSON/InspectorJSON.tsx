/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayButtonWithIcon} from '@clayui/button';
import {useState} from 'react';
import i18n from '~/i18n';

type InspectorJSONProps = {
	record: unknown;
};

export default function InspectorJSON({record}: InspectorJSONProps) {
	const [visible, setVisible] = useState(false);

	const label = i18n.translate(visible ? 'hide-json' : 'view-json');

	return (
		<>
			<div className="d-flex justify-content-end">
				<ClayButtonWithIcon
					aria-expanded={visible}
					aria-label={label}
					borderless
					displayType="secondary"
					onClick={() => setVisible(!visible)}
					size="sm"
					symbol="code"
					title={label}
				/>
			</div>

			{visible && (
				<pre className="account-inspector-json mb-3">
					{JSON.stringify(record, null, 2)}
				</pre>
			)}
		</>
	);
}
