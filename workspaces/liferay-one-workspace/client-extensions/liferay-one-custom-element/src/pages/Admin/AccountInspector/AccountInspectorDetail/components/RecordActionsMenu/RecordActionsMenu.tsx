/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayButtonWithIcon} from '@clayui/button';
import {ClayDropDownWithItems} from '@clayui/drop-down';
import {ComponentProps} from 'react';
import i18n from '~/i18n';
import {Liferay} from '~/services/liferay/liferay';

import getRecordActions from '../../utils/getRecordActions';

import type {
	InspectedCollectionKey,
	InspectedEntry,
} from '~/types/accountInspection';
import type {Account} from '~/types/accounts';

import type {RecordAction} from '../../utils/getRecordActions';

type DropDownItems = ComponentProps<typeof ClayDropDownWithItems>['items'];

async function copyText(text: string) {
	try {
		await navigator.clipboard.writeText(text);

		Liferay.Util.openToast({
			message: i18n.translate('copied-to-the-clipboard'),
			type: 'success',
		});
	}
	catch {
		Liferay.Util.openToast({
			message: i18n.translate('unable-to-copy-to-the-clipboard'),
			type: 'danger',
		});
	}
}

function toDropDownItem(action: RecordAction): DropDownItems[number] {
	if ('copyText' in action) {
		return {
			label: i18n.translate(action.label),
			onClick: () => copyText(action.copyText),
		};
	}

	return {
		href: action.href,
		label: i18n.translate(action.label),
		...(action.newTab
			? {rel: 'noopener noreferrer', target: '_blank'}
			: {}),
	};
}

type RecordActionsMenuProps = {
	account: Account;
	collection: InspectedCollectionKey;
	entry: InspectedEntry;
	jsonVisible: boolean;
	onToggleJSON: () => void;
};

export default function RecordActionsMenu({
	account,
	collection,
	entry,
	jsonVisible,
	onToggleJSON,
}: RecordActionsMenuProps) {
	return (
		<ClayDropDownWithItems
			items={[
				{
					label: i18n.translate(
						jsonVisible ? 'hide-json' : 'view-json'
					),
					onClick: onToggleJSON,
				},
				{type: 'divider'},
				...getRecordActions(account, collection, entry).map(
					toDropDownItem
				),
			]}
			trigger={
				<ClayButtonWithIcon
					aria-label={i18n.translate('actions')}
					borderless
					displayType="secondary"
					size="sm"
					symbol="ellipsis-v"
					title={i18n.translate('actions')}
				/>
			}
		/>
	);
}
