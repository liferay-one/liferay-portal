/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import type {Word} from '~/i18n';
import type {
	AccountInspection,
	JSMRecord,
	JSMRecordType,
	JiraAsset,
	JiraAssets,
} from '~/types/accountInspection';

const JSM_ATTRIBUTE_EMAIL_ADDRESS = 'Email Address';

const JSM_ATTRIBUTE_NAME = 'Name';

type LiferayRecord = {
	emailAddress?: string;
	externalReferenceCode?: string;
	name: string;
	recordId: number;
	type: JSMRecordType;
};

function getAttributeValue(jiraAsset: JiraAsset, attributeName: string) {
	return jiraAsset.attributes[attributeName]?.[0] ?? '';
}

function normalize(value: string | undefined) {
	return (value ?? '').trim();
}

function getDrift(
	liferayRecord: LiferayRecord,
	jiraAsset: JiraAsset | undefined
): Word[] {
	if (!jiraAsset) {
		return ['missing-in-jsm'];
	}

	const drift: Word[] = [];

	if (
		normalize(liferayRecord.name) !==
		normalize(getAttributeValue(jiraAsset, JSM_ATTRIBUTE_NAME))
	) {
		drift.push('name-differs-in-jsm');
	}

	if (
		liferayRecord.type === 'user' &&
		normalize(liferayRecord.emailAddress).toLowerCase() !==
			normalize(
				getAttributeValue(jiraAsset, JSM_ATTRIBUTE_EMAIL_ADDRESS)
			).toLowerCase()
	) {
		drift.push('email-address-differs-in-jsm');
	}

	return drift;
}

function getLiferayRecords({
	account,
	related,
	users,
}: AccountInspection): LiferayRecord[] {
	return [
		{
			externalReferenceCode: account.externalReferenceCode,
			name: account.name,
			recordId: account.id,
			type: 'account',
		},
		...related.projects.items.map((project) => ({
			externalReferenceCode: project.externalReferenceCode,
			name: String(project.name ?? ''),
			recordId: project.id,
			type: 'project' as const,
		})),
		...users.items.map((user) => ({
			emailAddress: user.emailAddress,
			externalReferenceCode: user.externalReferenceCode,
			name: user.name ?? '',
			recordId: user.id,
			type: 'user' as const,
		})),
	];
}

function toJiraAssetsMap(jiraAssets: JiraAsset[]) {
	return new Map(
		jiraAssets.map((jiraAsset) => [jiraAsset.externalKey, jiraAsset])
	);
}

export default function getJSMRecords(
	inspection: AccountInspection,
	jiraAssets: JiraAssets
): JSMRecord[] {
	const accountJiraAssetsMap = toJiraAssetsMap(jiraAssets.accounts);
	const contactJiraAssetsMap = toJiraAssetsMap(jiraAssets.contacts);

	return getLiferayRecords(inspection).map((liferayRecord, index) => {
		const jiraAssetsMap =
			liferayRecord.type === 'user'
				? contactJiraAssetsMap
				: accountJiraAssetsMap;

		const jiraAsset = liferayRecord.externalReferenceCode
			? jiraAssetsMap.get(liferayRecord.externalReferenceCode)
			: undefined;

		return {
			drift: getDrift(liferayRecord, jiraAsset),
			externalReferenceCode: liferayRecord.externalReferenceCode,
			id: index + 1,
			jiraAsset,
			name: liferayRecord.name,
			recordId: liferayRecord.recordId,
			type: liferayRecord.type,
		};
	});
}
