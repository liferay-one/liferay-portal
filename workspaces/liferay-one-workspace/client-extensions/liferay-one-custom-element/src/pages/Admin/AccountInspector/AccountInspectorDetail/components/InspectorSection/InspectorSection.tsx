/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import Panel from '@clayui/panel';
import {ReactNode} from 'react';

type InspectorSectionProps = {
	badges?: ReactNode;
	children: ReactNode;
	defaultExpanded?: boolean;
	expanded?: boolean;
	id?: string;
	onExpandedChange?: (expanded: boolean) => void;
	title: string;
};

export default function InspectorSection({
	badges,
	children,
	defaultExpanded = false,
	expanded,
	id,
	onExpandedChange,
	title,
}: InspectorSectionProps) {
	return (
		<Panel
			className="account-inspector-panel mb-3"
			collapsable
			defaultExpanded={defaultExpanded}
			displayTitle={
				<div className="align-items-center d-flex" id={id}>
					<span className="font-weight-semi-bold mr-2">{title}</span>

					{badges && (
						<span className="account-inspector-badges">
							{badges}
						</span>
					)}
				</div>
			}
			displayType="secondary"
			expanded={expanded}
			onExpandedChange={onExpandedChange}
			showCollapseIcon
		>
			<Panel.Body>{children}</Panel.Body>
		</Panel>
	);
}
