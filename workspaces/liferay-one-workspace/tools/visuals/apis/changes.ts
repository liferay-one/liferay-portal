/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * The items of the APIs visual that a comparison marks: the endpoints, the
 * custom element routes, the modules that make the calls, and the OAuth2
 * scopes. A call has a numeric ID that shifts with every call above it, so a
 * route and a module name the endpoints they call instead, and an added or
 * removed call changes them. An endpoint is keyed by its method and path, a
 * route by its group and path, a module by its file, and a scope by its name.
 */

import type {IChangeItem} from '../lib.ts';

export function changeItems(data: any): IChangeItem[] {
	const endpointsOf = (callIds: number[]) =>
		[...new Set(callIds.map((id) => data.calls[id].endpoint))].sort();

	return [
		...data.endpoints.map((endpoint: any) => ({
			key: `endpoint:${endpoint.key}`,
			kind: 'endpoints',
			label: endpoint.key,
			value: {
				auth: endpoint.auth,
				category: endpoint.category,
				controller: endpoint.controller,
				handler: endpoint.handler,
				kind: endpoint.kind,
				path: endpoint.path,
				public: endpoint.public,
			},
		})),
		...data.modules.map((module: any) => ({
			key: `module:${module.file}`,
			kind: 'modules',
			label: module.file,
			value: {
				endpoints: [
					...new Set(
						data.calls
							.filter((call: any) => call.module === module.file)
							.map((call: any) => call.endpoint)
					),
				].sort(),
				kind: module.kind,
			},
		})),
		...data.routes.map((route: any) => ({
			key: `route:${route.group} ${route.path}`,
			kind: 'routes',
			label: `${route.group} ${route.path}`,
			value: {
				components: route.components.map(
					(component: any) => `${component.name} ${component.file}`
				),
				endpoints: endpointsOf(route.calls),
				gate: route.gate,
				layouts: route.layouts,
			},
		})),
		...data.scopes.map((scope: any) => ({
			key: `scope:${scope.scope}`,
			kind: 'scopes',
			label: scope.scope,
			value: {
				declaredBy: scope.declaredBy,
				files: scope.files,
				readOnly: scope.readOnly,
				status: scope.status,
			},
		})),
	];
}
