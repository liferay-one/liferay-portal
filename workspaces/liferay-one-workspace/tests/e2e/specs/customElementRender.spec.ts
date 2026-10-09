/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {test} from '@playwright/test';

import {gotoAndExpectRender} from '../utils/customElementUtils';
import {liferayLogin, liferayLogout} from '../utils/loginUtils';

const ADMIN = '/web/one/admin';
const BUSINESS_EVENTS = '/web/one/support/business-events';
const HOME = '/web/one/home';
const MY_ACCOUNT = '/web/one/my-account';
const PRODUCT_PURCHASE = '/web/one/product-purchase';
const PUBLISHER_DASHBOARD = '/web/one/my-account/publisher-dashboard';
const TICKET_ATTACHMENTS = '/web/one/support/ticket-attachments';

const ACCOUNT = 'placeholder-account';
const ERC = 'placeholder-erc';
const ID = '1';
const PROJECT = 'placeholder-project';

interface RouteCheck {
	name: string;
	planId: string;
	url: string;
}

const ROUTE_CHECKS: RouteCheck[] = [
	{
		name: 'account-selector mounts in the page header',
		planId: 'FLOW-SPA-RENDER-SMOKE',
		url: HOME,
	},

	{
		name: 'admin marketplace summary',
		planId: 'ROUTE-ADMIN-MP-SUMMARY',
		url: `${ADMIN}#/mp-summary`,
	},
	{
		name: 'admin marketplace orders',
		planId: 'ROUTE-ADMIN-MP-ORDERS',
		url: `${ADMIN}#/mp-orders`,
	},
	{
		name: 'admin marketplace apps',
		planId: 'ROUTE-ADMIN-MP-APPS',
		url: `${ADMIN}#/mp-apps`,
	},
	{
		name: 'admin marketplace solutions',
		planId: 'ROUTE-ADMIN-MP-SOLUTIONS',
		url: `${ADMIN}#/mp-solutions`,
	},
	{
		name: 'admin marketplace finance orders',
		planId: 'ROUTE-ADMIN-MP-FINANCE-ORDERS',
		url: `${ADMIN}#/mp-finance-orders`,
	},
	{
		name: 'admin marketplace finance order details',
		planId: 'ROUTE-ADMIN-MP-FINANCE-ORDERS-ORDERID',
		url: `${ADMIN}#/mp-finance-orders/${ID}`,
	},
	{
		name: 'admin marketplace payments',
		planId: 'ROUTE-ADMIN-MP-PAYMENTS',
		url: `${ADMIN}#/mp-payments`,
	},
	{
		name: 'admin marketplace payment details',
		planId: 'ROUTE-ADMIN-MP-PAYMENTS-ENTRYID',
		url: `${ADMIN}#/mp-payments/${ID}`,
	},
	{
		name: 'admin publishers',
		planId: 'ROUTE-ADMIN-PUBLISHERS',
		url: `${ADMIN}#/publishers`,
	},
	{
		name: 'admin publisher requests',
		planId: 'ROUTE-ADMIN-PUBLISHER-REQUESTS',
		url: `${ADMIN}#/publisher-requests`,
	},
	{
		name: 'admin trials',
		planId: 'ROUTE-ADMIN-TRIALS',
		url: `${ADMIN}#/trials`,
	},
	{
		name: 'admin my SSA SaaS demo',
		planId: 'ROUTE-ADMIN-MY-SSA-SAAS-DEMO',
		url: `${ADMIN}#/my-ssa-saas-demo`,
	},
	{
		name: 'admin SSA SaaS environments',
		planId: 'ROUTE-ADMIN-SSA-SAAS-ENVIRONMENTS',
		url: `${ADMIN}#/ssa-saas-environments`,
	},
	{
		name: 'admin manage SSA SaaS users',
		planId: 'ROUTE-ADMIN-MANAGE-SSA-SAAS-USERS',
		url: `${ADMIN}#/manage-ssa-saas-users`,
	},
	{
		name: 'admin trial details',
		planId: 'ROUTE-ADMIN-DETAILS-ORDERID',
		url: `${ADMIN}#/details/${ID}`,
	},
	{
		name: 'admin PubSub',
		planId: 'ROUTE-ADMIN-PUB-SUB',
		url: `${ADMIN}#/pub-sub`,
	},
	{
		name: 'admin activation key uploads',
		planId: 'ROUTE-ADMIN-ACTIVATION-KEY-UPLOADS',
		url: `${ADMIN}#/activation-key-uploads`,
	},

	{
		name: 'my account account details',
		planId: 'ROUTE-MY-ACCOUNT-ACCOUNT-DETAILS',
		url: `${MY_ACCOUNT}#/${ACCOUNT}/account-details`,
	},
	{
		name: 'my account account members',
		planId: 'ROUTE-MY-ACCOUNT-ACCOUNT-MEMBERS',
		url: `${MY_ACCOUNT}#/${ACCOUNT}/account-members`,
	},
	{
		name: 'my account orders',
		planId: 'ROUTE-MY-ACCOUNT-ORDERS',
		url: `${MY_ACCOUNT}#/${ACCOUNT}/orders`,
	},
	{
		name: 'my account order history',
		planId: 'ROUTE-MY-ACCOUNT-HISTORY',
		url: `${MY_ACCOUNT}#/${ACCOUNT}/orders/history`,
	},
	{
		name: 'my account order details',
		planId: 'ROUTE-MY-ACCOUNT-ORDERID',
		url: `${MY_ACCOUNT}#/${ACCOUNT}/orders/${ID}`,
	},
	{
		name: 'my account access guard',
		planId: 'ROUTE-MY-ACCOUNT-ACCOUNTERC',
		url: `${MY_ACCOUNT}#/${ACCOUNT}`,
	},
	{
		name: 'my account project layout',
		planId: 'ROUTE-MY-ACCOUNT-PROJECT',
		url: `${MY_ACCOUNT}#/${ACCOUNT}/project`,
	},
	{
		name: 'my account project detail',
		planId: 'ROUTE-MY-ACCOUNT-PROJECTERC',
		url: `${MY_ACCOUNT}#/${ACCOUNT}/project/${PROJECT}`,
	},
	{
		name: 'my account project products',
		planId: 'ROUTE-MY-ACCOUNT-PRODUCTS',
		url: `${MY_ACCOUNT}#/${ACCOUNT}/project/${PROJECT}/products`,
	},
	{
		name: 'my account product detail',
		planId: 'ROUTE-MY-ACCOUNT-PRODUCTERC',
		url: `${MY_ACCOUNT}#/${ACCOUNT}/project/${PROJECT}/products/placeholder-product`,
	},
	{
		name: 'my account project applications',
		planId: 'ROUTE-MY-ACCOUNT-APPLICATIONS',
		url: `${MY_ACCOUNT}#/${ACCOUNT}/project/${PROJECT}/applications`,
	},
	{
		name: 'my account application detail',
		planId: 'ROUTE-MY-ACCOUNT-APPLICATIONERC',
		url: `${MY_ACCOUNT}#/${ACCOUNT}/project/${PROJECT}/applications/placeholder-app`,
	},

	{
		name: 'publisher dashboard published apps',
		planId: 'ROUTE-PUBLISHER-DASHBOARD-PUBLISHED-APPS',
		url: `${PUBLISHER_DASHBOARD}#/published-apps`,
	},
	{
		name: 'publisher dashboard published solutions',
		planId: 'ROUTE-PUBLISHER-DASHBOARD-PUBLISHED-SOLUTIONS',
		url: `${PUBLISHER_DASHBOARD}#/published-solutions`,
	},
	{
		name: 'publisher dashboard publisher profile',
		planId: 'ROUTE-PUBLISHER-DASHBOARD-PUBLISHER-PROFILE',
		url: `${PUBLISHER_DASHBOARD}#/publisher-profile`,
	},
	{
		name: 'publisher dashboard publisher profile edit',
		planId: 'ROUTE-PUBLISHER-DASHBOARD-EDIT',
		url: `${PUBLISHER_DASHBOARD}#/publisher-profile/edit`,
	},

	{
		name: 'business events list',
		planId: 'ROUTE-BUSINESS-EVENTS-PROJECTERC-BUSINESS-EVENTS',
		url: `${BUSINESS_EVENTS}#/${ACCOUNT}/business-events`,
	},
	{
		name: 'business events add',
		planId: 'ROUTE-BUSINESS-EVENTS-ADD',
		url: `${BUSINESS_EVENTS}#/${ACCOUNT}/business-events/add`,
	},
	{
		name: 'business event details',
		planId: 'ROUTE-BUSINESS-EVENTS-ID',
		url: `${BUSINESS_EVENTS}#/${ACCOUNT}/business-events/${ID}`,
	},
	{
		name: 'business event edit',
		planId: 'ROUTE-BUSINESS-EVENTS-EDIT',
		url: `${BUSINESS_EVENTS}#/${ACCOUNT}/business-events/${ID}/edit`,
	},
	{
		name: 'business event activity history',
		planId: 'ROUTE-BUSINESS-EVENTS-ACTIVITY-HISTORY',
		url: `${BUSINESS_EVENTS}#/${ACCOUNT}/business-events/${ID}/activity-history`,
	},

	{
		name: 'ticket attachments new',
		planId: 'ROUTE-TICKET-ATTACHMENTS-NEW',
		url: `${TICKET_ATTACHMENTS}#/new`,
	},
	{
		name: 'ticket attachments uploader for a new ticket',
		planId: 'ROUTE-TICKET-ATTACHMENTS-NEW-TICKETID',
		url: `${TICKET_ATTACHMENTS}#/new/${ID}`,
	},
	{
		name: 'ticket attachments downloader by ERC',
		planId: 'ROUTE-TICKET-ATTACHMENTS-ERC-TICKETATTACHMENTERC',
		url: `${TICKET_ATTACHMENTS}#/erc/${ERC}`,
	},
	{
		name: 'ticket attachments downloader by id',
		planId: 'ROUTE-TICKET-ATTACHMENTS-ID-TICKETATTACHMENTID',
		url: `${TICKET_ATTACHMENTS}#/id/${ID}`,
	},
	{
		name: 'ticket attachments uploader for a ticket',
		planId: 'ROUTE-TICKET-ATTACHMENTS-TICKETID',
		url: `${TICKET_ATTACHMENTS}#/${ID}`,
	},

	{
		name: 'product purchase summary',
		planId: 'ROUTE-PRODUCT-PURCHASE-SUMMARY',
		url: `${PRODUCT_PURCHASE}?productId=${ID}#/summary`,
	},
	{
		name: 'product purchase license selection',
		planId: 'ROUTE-PRODUCT-PURCHASE-LICENSE',
		url: `${PRODUCT_PURCHASE}?productId=${ID}#/license`,
	},
	{
		name: 'product purchase payment method',
		planId: 'ROUTE-PRODUCT-PURCHASE-PAYMENT-METHOD',
		url: `${PRODUCT_PURCHASE}?productId=${ID}#/payment-method`,
	},
	{
		name: 'product purchase bank transfer completed',
		planId: 'ROUTE-PRODUCT-PURCHASE-BANK-TRANSFER-COMPLETED',
		url: `${PRODUCT_PURCHASE}?productId=${ID}#/bank-transfer-completed`,
	},
	{
		name: 'product purchase completed',
		planId: 'ROUTE-PRODUCT-PURCHASE-PURCHASE-COMPLETED',
		url: `${PRODUCT_PURCHASE}?productId=${ID}#/purchase-completed`,
	},
];

test.afterEach(async ({page}) => {
	await liferayLogout(page);
});

test.beforeEach(async ({page}) => {
	await liferayLogin(page);
});

test.describe('Custom element render @render', () => {
	for (const {name, planId, url} of ROUTE_CHECKS) {
		test(`[${planId}] ${name} renders`, async ({page}) => {
			await gotoAndExpectRender(page, url);
		});
	}
});
