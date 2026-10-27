/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {toNumber} from './accountFindingUtils';
import {
	JSM_PARTNER_ENTITLEMENT_NAME,
	JSM_PROJECT_ENTITLEMENT_NAMES,
} from './jsmSyncConstants';

import type {
	AccountInspection,
	InspectedEntry,
} from '~/types/accountInspection';

const NO_PROJECT_ID = 0;

const TERMINATION_STATUS_TERMINATED = 'terminated';

function isUnterminatedActive(entitlement: InspectedEntry, now: number) {
	const {endDate, startDate, terminationStatus} = entitlement;

	return (
		terminationStatus !== TERMINATION_STATUS_TERMINATED &&
		(!endDate || Date.parse(String(endDate)) >= now) &&
		(!startDate || Date.parse(String(startDate)) <= now)
	);
}

function hasName(entitlement: InspectedEntry, names: string[]) {
	return names.includes(String(entitlement.name ?? ''));
}

export default function getJSMProjectQualification(
	{related}: AccountInspection,
	now = Date.now()
) {
	const entitlements = related.entitlements.items.filter((entitlement) =>
		isUnterminatedActive(entitlement, now)
	);

	const getProjectId = (entitlement: InspectedEntry) =>
		toNumber(entitlement.r_projectToEntitlement_c_projectId);

	const accountQualifies = entitlements.some(
		(entitlement) =>
			hasName(entitlement, [JSM_PARTNER_ENTITLEMENT_NAME]) ||
			(getProjectId(entitlement) === NO_PROJECT_ID &&
				hasName(entitlement, JSM_PROJECT_ENTITLEMENT_NAMES))
	);

	const qualifyingProjectIds = new Set(
		entitlements
			.filter((entitlement) =>
				hasName(entitlement, JSM_PROJECT_ENTITLEMENT_NAMES)
			)
			.map(getProjectId)
	);

	const projects = related.projects.items;

	const isQualifying = ({id}: InspectedEntry) =>
		accountQualifies || qualifyingProjectIds.has(id);

	return {
		nonqualifyingProjects: projects.filter(
			(project) => !isQualifying(project)
		),
		qualifyingProjects: projects.filter(isQualifying),
	};
}
