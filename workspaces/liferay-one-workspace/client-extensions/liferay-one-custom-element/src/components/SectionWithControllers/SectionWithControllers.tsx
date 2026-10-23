/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import '~/components/MarketplaceForm/MarketplaceForm.css';
import ClayButton from '@clayui/button';
import ClayIcon from '@clayui/icon';
import {HTMLAttributes, useState} from 'react';
import RowActionsMenu, {
	RowAction,
} from '~/components/RowActionsMenu/RowActionsMenu';
import {BlockDirections} from '~/context/SolutionContextProvider';

interface ISectionWithControllersProps extends HTMLAttributes<HTMLDivElement> {
	dropdownItems: RowAction[];
	index: number;
	name: string;
	onArrowClick: (direction: BlockDirections) => void;
	position: number;
}

export function SectionWithControllers({
	children,
	dropdownItems,
	index,
	name,
	onArrowClick,
	position,
	...props
}: ISectionWithControllersProps) {
	const [collapsed, setCollapsed] = useState(true);

	return (
		<div className="marketplace-form-section mt-4 p-0" {...props}>
			<div className="controllers d-flex justify-content-between">
				<div className="d-flex inline-item justify-content-start">
					<div className="arrow-container ml-4">
						<ClayButton
							aria-label="arrow-up"
							className="text-neutral-7"
							disabled={index === 0}
							displayType="unstyled"
							onClick={() =>
								onArrowClick(BlockDirections.MOVE_UP)
							}
							size="sm"
						>
							<ClayIcon symbol="order-arrow-up" />
						</ClayButton>

						<ClayButton
							aria-label="arrow-down"
							className="text-neutral-7"
							disabled={index === position - 1}
							displayType="unstyled"
							onClick={() =>
								onArrowClick(BlockDirections.MOVE_DOWN)
							}
							size="sm"
						>
							<ClayIcon symbol="order-arrow-down" />
						</ClayButton>
					</div>

					<b className="ml-4">{name}</b>
				</div>

				<div className="align-self-center d-flex justify-content-end">
					<RowActionsMenu actions={dropdownItems} />

					<ClayButton
						aria-labelledby="angle-right"
						className="align-self-center d-flex mr-3 text-neutral-7"
						displayType="unstyled"
						onClick={() => setCollapsed(!collapsed)}
					>
						<ClayIcon
							symbol={collapsed ? 'angle-down' : 'angle-right'}
						/>
					</ClayButton>
				</div>
			</div>

			{collapsed && <div className="children-container">{children}</div>}
		</div>
	);
}
