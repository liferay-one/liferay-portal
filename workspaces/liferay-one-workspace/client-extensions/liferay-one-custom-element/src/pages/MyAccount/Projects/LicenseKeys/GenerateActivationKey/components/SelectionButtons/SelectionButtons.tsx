/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import Button from '~/components/Button/Button';
import {translate} from '~/i18n';

type SelectionButtonsProps = {
	onClickDeselectAll: () => void;
	onClickSelectAll: () => void;
};

export default function SelectionButtons({
	onClickDeselectAll,
	onClickSelectAll,
}: SelectionButtonsProps) {
	return (
		<div className="align-items-center d-flex mb-3">
			<Button
				className="mr-2"
				displayType="unstyled"
				onClick={onClickSelectAll}
			>
				{translate('select-all')}
			</Button>

			<Button displayType="unstyled" onClick={onClickDeselectAll}>
				{translate('deselect-all')}
			</Button>
		</div>
	);
}
