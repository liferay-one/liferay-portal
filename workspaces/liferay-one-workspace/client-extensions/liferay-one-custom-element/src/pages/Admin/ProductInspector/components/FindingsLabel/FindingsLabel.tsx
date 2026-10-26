/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayLabel from '@clayui/label';

import {getWorstSeverity} from '../../utils/productCatalogUtils';

import type {InspectorFinding} from '~/types/productInspection';

type FindingsLabelProps = {
	findings: InspectorFinding[];
};

export default function FindingsLabel({findings}: FindingsLabelProps) {
	const severity = getWorstSeverity(findings);

	if (!severity) {
		return <span className="text-secondary">0</span>;
	}

	return <ClayLabel displayType={severity}>{findings.length}</ClayLabel>;
}
