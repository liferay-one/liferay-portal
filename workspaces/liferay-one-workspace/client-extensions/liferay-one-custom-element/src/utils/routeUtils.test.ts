/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {
	AppRoute,
	buildNavItems,
	filterAccessibleRoutes,
	toRouteObjects,
} from './routeUtils';

import type {UserAccountModel} from '~/services/models/UserAccountModel';

const userAccountModel = {isAdmin: false} as UserAccountModel;

describe('[MOD-ROUTEUTILS] routeUtils', () => {
	describe('filterAccessibleRoutes', () => {
		it('drops routes the user cannot access and recurses into children', () => {
			const routes: AppRoute[] = [
				{
					children: [
						{index: true},
						{canAccess: () => false, path: 'secret'},
						{canAccess: () => true, path: 'open'},
					],
					path: 'parent',
				},
				{canAccess: () => false, path: 'hidden'},
				{path: 'public'},
			];

			const accessibleRoutes = filterAccessibleRoutes(
				routes,
				userAccountModel
			);

			expect(accessibleRoutes.map(({path}) => path)).toEqual([
				'parent',
				'public',
			]);
			expect(
				accessibleRoutes[0].children?.map(({index, path}) =>
					index ? 'index' : path
				)
			).toEqual(['index', 'open']);
		});

		it('passes the user to canAccess', () => {
			const routes: AppRoute[] = [
				{
					canAccess: (current) => current === userAccountModel,
					path: 'mine',
				},
			];

			expect(filterAccessibleRoutes(routes, userAccountModel)).toEqual(
				routes
			);
		});
	});

	describe('toRouteObjects', () => {
		it('converts index and path routes', () => {
			expect(
				toRouteObjects([
					{index: true},
					{children: [{path: 'child'}], path: 'parent'},
					{path: 'leaf'},
				])
			).toEqual([
				{element: undefined, index: true},
				{
					children: [
						{
							children: undefined,
							element: undefined,
							path: 'child',
						},
					],
					element: undefined,
					path: 'parent',
				},
				{children: undefined, element: undefined, path: 'leaf'},
			]);
		});
	});

	describe('buildNavItems', () => {
		it('skips routes without nav or with parameter paths', () => {
			expect(
				buildNavItems([
					{path: 'no-nav'},
					{nav: {label: 'Detail'}, path: ':id'},
					{index: true},
					{nav: {icon: 'home', label: 'Home'}, path: 'home'},
				])
			).toEqual([
				{
					children: undefined,
					end: undefined,
					icon: 'home',
					label: 'Home',
					path: '/home',
				},
			]);
		});

		it('builds full paths and sets end false only with real child routes', () => {
			expect(
				buildNavItems(
					[
						{
							children: [
								{index: true},
								{nav: {label: 'Members'}, path: 'members'},
							],
							nav: {label: 'Account'},
							path: 'account',
						},
						{
							children: [{index: true}, {path: '*'}],
							nav: {label: 'Orders'},
							path: 'orders',
						},
					],
					'/my'
				)
			).toEqual([
				{
					children: [
						{
							children: undefined,
							end: undefined,
							icon: undefined,
							label: 'Members',
							path: '/my/account/members',
						},
					],
					end: false,
					icon: undefined,
					label: 'Account',
					path: '/my/account',
				},
				{
					children: undefined,
					end: undefined,
					icon: undefined,
					label: 'Orders',
					path: '/my/orders',
				},
			]);
		});

		it('omits empty children', () => {
			const [navItem] = buildNavItems([
				{
					children: [{path: 'hidden-child'}],
					nav: {label: 'Settings'},
					path: 'settings',
				},
			]);

			expect(navItem.children).toBeUndefined();
			expect(navItem.end).toBe(false);
		});
	});
});
