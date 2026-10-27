/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import type {Word} from '~/i18n';
import type {
	InspectedEntry,
	JSMRecord,
	JiraAsset,
	JiraAssets,
} from '~/types/accountInspection';

const JSM_ATTRIBUTE_NAME = 'Name';

function normalize(value: string | undefined) {
	return (value ?? '').trim();
}

function getDrift(name: string, jiraAsset: JiraAsset | undefined): Word[] {
	if (!jiraAsset) {
		return ['missing-in-jsm'];
	}

	if (
		normalize(name) !==
		normalize(jiraAsset.attributes[JSM_ATTRIBUTE_NAME]?.[0])
	) {
		return ['name-differs-in-jsm'];
	}

	return [];
}

export default function getJSMRecords(
	projects: InspectedEntry[],
	jiraAssets: JiraAssets
): JSMRecord[] {
	const jiraAssetsByExternalKey = new Map(
		jiraAssets.accounts.map((jiraAsset) => [
			jiraAsset.externalKey,
			jiraAsset,
		])
	);

	return projects.map(({externalReferenceCode, id, name}) => {
		const jiraAsset = externalReferenceCode
			? jiraAssetsByExternalKey.get(externalReferenceCode)
			: undefined;

		const projectName = String(name ?? '');

		return {
			drift: getDrift(projectName, jiraAsset),
			externalReferenceCode,
			id,
			jiraAsset,
			name: projectName,
			recordId: id,
			type: 'project',
		};
	});
}
