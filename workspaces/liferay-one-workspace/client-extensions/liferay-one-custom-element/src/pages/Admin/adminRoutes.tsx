/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {lazy} from 'react';
import {Navigate} from 'react-router-dom';
import {UserAccountModel} from '~/models/UserAccountModel';
import i18n from '~/i18n';
import {AppRoute} from '~/utils/routeUtils';

const AppDetail = lazy(() => import('./Apps/AppDetail/AppDetail'));
const Apps = lazy(() => import('./Apps/Apps'));
const Environments = lazy(() => import('./Environments/Environments'));
const LicenseKeyUploads = lazy(
	() => import('./LicenseKeyUploads/LicenseKeyUploads')
);
const ManageSsaSaasUsers = lazy(
	() => import('./ManageSsaSaasUsers/ManageSsaSaasUsers')
);
const MPFinanceOrders = lazy(() => import('./MPFinanceOrders/MPFinanceOrders'));
const MPSummary = lazy(() => import('./MPSummary/MPSummary'));
const MySsaSaasDemo = lazy(() => import('./MySsaSaasDemo/MySsaSaasDemo'));
const OrderDetails = lazy(() => import('./MPFinanceOrders/OrderDetails'));
const Orders = lazy(() => import('./Orders/Orders'));
const PaymentDetails = lazy(() => import('./Payments/PaymentDetails'));
const Payments = lazy(() => import('./Payments/Payments'));
const PublisherRequests = lazy(
	() => import('./PublisherRequests/PublisherRequests')
);
const Publishers = lazy(() => import('./Publishers/Publishers'));
const PubSub = lazy(() => import('./PubSub/PubSub'));
const SolutionDetail = lazy(
	() => import('./Solutions/SolutionDetail/SolutionDetail')
);
const Solutions = lazy(() => import('./Solutions/Solutions'));
const TrialDetails = lazy(
	() => import('./SSADashboard/pages/TrialDetails/TrialDetails')
);
const Trials = lazy(() => import('./Trials/Trials'));

const canAccessAdmin = (userAccountModel: UserAccountModel) =>
	userAccountModel.isAdmin;

const canAccessFinance = (userAccountModel: UserAccountModel) =>
	userAccountModel.isAdmin || userAccountModel.isFinanceAdministrator;

const canAccessSSA = (userAccountModel: UserAccountModel) =>
	userAccountModel.isSSAAdmin || userAccountModel.isSSAUser;

const canAccessSSAAdmin = (userAccountModel: UserAccountModel) =>
	userAccountModel.isSSAAdmin;

export const adminRoutes: AppRoute[] = [
	{
		canAccess: canAccessAdmin,
		element: <MPSummary />,
		nav: {icon: 'polls', label: i18n.translate('marketplace-summary')},
		path: 'mp-summary',
	},
	{
		canAccess: canAccessAdmin,
		element: <Orders />,
		nav: {icon: 'order-form', label: i18n.translate('marketplace-orders')},
		path: 'mp-orders',
	},
	{
		canAccess: canAccessAdmin,
		element: <Apps />,
		nav: {icon: 'grid', label: i18n.translate('marketplace-apps')},
		path: 'mp-apps',
	},
	{
		canAccess: canAccessAdmin,
		element: <AppDetail />,
		path: 'mp-apps/:productId',
	},
	{
		canAccess: canAccessAdmin,
		element: <Solutions />,
		nav: {icon: 'union', label: i18n.translate('marketplace-solutions')},
		path: 'mp-solutions',
	},
	{
		canAccess: canAccessAdmin,
		element: <SolutionDetail />,
		path: 'mp-solutions/:productId',
	},
	{
		canAccess: canAccessFinance,
		element: <MPFinanceOrders />,
		nav: {
			icon: 'order-form',
			label: i18n.translate('marketplace-finance-orders'),
		},
		path: 'mp-finance-orders',
	},
	{
		canAccess: canAccessFinance,
		element: <OrderDetails />,
		path: 'mp-finance-orders/:orderId',
	},
	{
		canAccess: canAccessFinance,
		element: <Payments />,
		nav: {
			icon: 'order-form',
			label: i18n.translate('marketplace-payments'),
		},
		path: 'mp-payments',
	},
	{
		canAccess: canAccessFinance,
		element: <PaymentDetails />,
		path: 'mp-payments/:entryId',
	},
	{
		canAccess: canAccessAdmin,
		element: <Publishers />,
		nav: {icon: 'squares-clock', label: i18n.translate('publishers')},
		path: 'publishers',
	},
	{
		canAccess: canAccessAdmin,
		element: <PublisherRequests />,
		nav: {
			icon: 'order-form',
			label: i18n.translate('publisher-requests'),
		},
		path: 'publisher-requests',
	},
	{
		canAccess: canAccessAdmin,
		element: <Trials />,
		nav: {icon: 'grid', label: i18n.translate('7-days-trials')},
		path: 'trials',
	},
	{
		canAccess: canAccessSSA,
		element: <MySsaSaasDemo />,
		nav: {icon: 'union', label: i18n.translate('my-ssa-saas-demo')},
		path: 'my-ssa-saas-demo',
	},
	{
		canAccess: canAccessSSAAdmin,
		element: <Environments />,
		nav: {
			icon: 'squares-clock',
			label: i18n.translate('ssa-saas-environments'),
		},
		path: 'ssa-saas-environments',
	},
	{
		canAccess: canAccessSSAAdmin,
		element: <ManageSsaSaasUsers />,
		nav: {icon: 'users', label: i18n.translate('manage-ssa-saas-users')},
		path: 'manage-ssa-saas-users',
	},
	{
		canAccess: canAccessSSA,
		element: <TrialDetails />,
		path: 'details/:orderId',
	},
	{
		canAccess: canAccessAdmin,
		element: <PubSub />,
		nav: {icon: 'message-boards', label: i18n.translate('pub-sub')},
		path: 'pub-sub',
	},
	{
		canAccess: canAccessAdmin,
		element: <LicenseKeyUploads />,
		nav: {
			icon: 'password-policies',
			label: i18n.translate('activation-key-uploads'),
		},
		path: 'activation-key-uploads',
	},

	{element: <Navigate replace to="." />, path: '*'},
];
