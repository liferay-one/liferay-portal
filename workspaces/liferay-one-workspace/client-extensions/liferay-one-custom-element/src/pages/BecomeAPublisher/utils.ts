/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import i18n from '~/i18n';

export type PublisherTypeEntry = {
	key: string;
	name: string;
};

export const PUBLISHER_TYPE_ENTRIES: PublisherTypeEntry[] = [
	{key: 'appPublisher', name: i18n.translate('app-publisher')},
	{key: 'solutionPublisher', name: i18n.translate('solution-publisher')},
];

export const PUBLISHER_TYPE_TOOLTIPS: Record<string, string> = {
	appPublisher: i18n.translate(
		'ability-to-publish-dxp-and-cloud-free-or-charged'
	),
	solutionPublisher: i18n.translate(
		'solutions-built-on-liferay-requires-existing-liferay-partnership'
	),
};

export function getPublisherTypeNames(keys: string[]): string[] {
	return keys.map(
		(key) =>
			PUBLISHER_TYPE_ENTRIES.find((entry) => entry.key === key)?.name ??
			key
	);
}
