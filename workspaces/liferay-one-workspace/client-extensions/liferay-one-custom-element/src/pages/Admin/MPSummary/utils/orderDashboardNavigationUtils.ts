/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {getProjectName} from '~/hooks/useProjectOrders';
import i18n from '~/i18n';
import {ONE_TIME_PURCHASES} from '~/pages/MyAccount/Projects/projects';
import SearchBuilder from '~/services/fetcher/SearchBuilder';
import fetcher from '~/services/fetcher/fetcher';
import HeadlessCommerceAdminCatalog from '~/services/headless/HeadlessCommerceAdminCatalog';
import {Liferay} from '~/services/liferay/liferay';
import {APP_ORDER_TYPES} from '~/utils/orderUtils';
import {setCurrentAccount} from '~/utils/setCurrentAccount';
import {getSiteURL} from '~/utils/siteUtils';

import type {APIResponse} from '~/types/api';
import type {Order, OrderTypes} from '~/types/orders';

type ProjectAPIItem = {
	externalReferenceCode: string;
};

export function getOrderProductId(order: Order) {
	return order.orderItems?.[0]?.productId;
}

export async function resolveProjectPath(order: Order) {
	const tab = APP_ORDER_TYPES.includes(
		order.orderTypeExternalReferenceCode as OrderTypes
	)
		? 'applications'
		: 'products';

	const projectName = getProjectName(order);

	if (!projectName) {
		return `${ONE_TIME_PURCHASES}/${tab}`;
	}

	const {items} = await fetcher<APIResponse<ProjectAPIItem>>(
		`/o/c/projects?${new URLSearchParams({
			fields: 'externalReferenceCode',
			filter: new SearchBuilder({useURIEncode: false})
				.eq('r_accountEntryToProject_accountEntryId', order.accountId)
				.and()
				.eq('name', projectName.replaceAll("'", "''"))
				.build(),
			pageSize: '1',
		})}`
	);

	const projectExternalReferenceCode = items?.[0]?.externalReferenceCode;

	return projectExternalReferenceCode
		? `${projectExternalReferenceCode}/${tab}`
		: tab;
}

export async function openCustomerDashboard(order: Order) {
	const projectPath = await resolveProjectPath(order);

	await setCurrentAccount(String(order.accountId));

	Liferay.Util.navigate(`${getSiteURL()}/my-account#/project/${projectPath}`);
}

export async function openPublisherDashboard(order: Order) {
	const productId = getOrderProductId(order);

	if (!productId) {
		return;
	}

	const product = await HeadlessCommerceAdminCatalog.getProduct(
		productId,
		new URLSearchParams({nestedFields: 'catalog'})
	);

	const accountId = product?.catalog?.accountId;

	if (!accountId) {
		Liferay.Util.openToast({
			message: i18n.translate('this-order-does-not-have-a-publisher'),
			type: 'warning',
		});

		return;
	}

	await setCurrentAccount(String(accountId));

	Liferay.Util.navigate(`${getSiteURL()}/my-account/publisher-dashboard`);
}
