/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayIcon from '@clayui/icon';
import classNames from 'classnames';
import {Word, translate} from '~/i18n';
import {OrderWorkflowStatusCode, getOrderStatusToken} from '~/utils/orderUtils';

import './OrderStatus.css';

import type {PlacedOrder} from '~/types/orders';

type OrderStatusProps = {
	placedOrder: PlacedOrder;
};

const OrderStatus = ({placedOrder}: OrderStatusProps) => {
	const getOrderStatusClassName = () => {
		const orderStatus = placedOrder.orderStatusInfo.code;

		if (
			placedOrder.orderStatusInfo.code !==
				OrderWorkflowStatusCode.COMPLETED &&
			placedOrder.orderTypeExternalReferenceCode === 'AI_HUB'
		) {
			return 'order-status-icon-processing';
		}

		if (
			OrderWorkflowStatusCode.PENDING === orderStatus ||
			OrderWorkflowStatusCode.PENDING_PAYMENT === orderStatus
		) {
			return 'order-status-icon-pending';
		}

		if (
			OrderWorkflowStatusCode.COMPLETED === orderStatus ||
			OrderWorkflowStatusCode.IN_PROGRESS === orderStatus
		) {
			return 'order-status-icon-completed';
		}

		if (OrderWorkflowStatusCode.CANCELLED === orderStatus) {
			return 'order-status-icon-canceled';
		}

		return 'order-status-icon-processing';
	};

	return (
		<>
			<ClayIcon
				className={classNames(
					'mr-2 order-status-icon',
					getOrderStatusClassName()
				)}
				symbol="circle"
			/>

			<span className="order-status-text">
				{translate(getOrderStatusToken(placedOrder) as Word)}
			</span>
		</>
	);
};

export default OrderStatus;
