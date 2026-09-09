/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useLiferayBundles} from '~/hooks/useLiferayBundles';

import DownloadListCard, {
	DownloadItem,
} from '../DownloadListCard/DownloadListCard';

import type {VirtualItem} from '~/types/orders';

import type {DownloadProfile} from '../../utils/resolveDownloadProfile';

type DownloadTabProps = {
	profile?: DownloadProfile;
	virtualItems?: VirtualItem[];
};

export default function DownloadTab({
	profile = 'app',
	virtualItems = [],
}: DownloadTabProps) {
	const {bundles} = useLiferayBundles();

	const isBundle = profile === 'bundle';

	const items: DownloadItem[] = isBundle
		? bundles
		: virtualItems.map((virtualItem, index) => ({
				id: `${index}-${virtualItem.version}`,
				link: virtualItem.url,
				name: virtualItem.version,
			}));

	return (
		<DownloadListCard
			emptyLabel={isBundle ? 'no-bundles-yet' : 'no-versions-yet'}
			heading={isBundle ? 'bundle-name' : 'supported-version'}
			items={items}
			title={isBundle ? 'bundle-list' : 'versions-list'}
		/>
	);
}
