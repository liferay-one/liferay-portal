/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * Lists the configuration items that a comparison can find added, changed,
 * or removed: each sidecar variable, feature flag, portal property, OSGi
 * configuration, and UAT host in production configuration. The drift between
 * the batch and each environment comes from the snapshots that `yarn viz:env`
 * writes, which are not committed, so it is the same at both refs and is
 * left out. So are .env and .env.local, which are not committed either. A
 * variable, a flag, and a property keep their name across refs. An OSGi
 * configuration is keyed by its folder and its PID, because two folders can
 * hold the same PID, and a host by the host and its file.
 */

import type {IChangeItem} from '../lib.ts';

interface IEnvironmentDrift {
	config: {
		crossEnvironment: {file: string; host: string}[];
		flags: {folders: string[]; key: string}[];
		osgi: {file: string; folder: string; pid: string}[];
		properties: {folders: string[]; key: string}[];
		variables: {setIn: string[]; variable: string}[];
	};
}

const LOCAL_SOURCES = new Set(['.env', '.env.local']);

export function changeItems(data: IEnvironmentDrift): IChangeItem[] {
	const config = data.config;

	return [
		...config.variables.map((variable) => ({
			key: `variable:${variable.variable}`,
			kind: 'sidecar variables',
			label: variable.variable,
			value: {
				...variable,
				setIn: variable.setIn.filter(
					(source) => !LOCAL_SOURCES.has(source)
				),
			},
		})),
		...config.flags.map((flag) => ({
			key: `flag:${flag.key}`,
			kind: 'feature flags',
			label: flag.key,
			value: flag,
		})),
		...config.properties.map((property) => ({
			key: `property:${property.key}`,
			kind: 'portal properties',
			label: property.key,
			value: property,
		})),
		...config.osgi.map((osgi) => ({
			key: `osgi:${osgi.folder}/${osgi.pid}`,
			kind: 'OSGi configurations',
			label: `${osgi.folder}/${osgi.pid}`,
			value: osgi,
		})),
		...config.crossEnvironment.map((host) => ({
			key: `host:${host.host}@${host.file}`,
			kind: 'UAT hosts',
			label: host.host,
			value: {file: host.file, host: host.host},
		})),
	];
}
