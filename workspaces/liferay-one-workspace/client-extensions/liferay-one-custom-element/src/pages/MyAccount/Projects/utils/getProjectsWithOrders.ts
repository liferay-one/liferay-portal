/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {
	getProjectExternalReferenceCode,
	getProjectName,
} from '~/hooks/useProjectOrders';

type ProjectOrder = {
	customFields?: {[key: string]: string};
};

type OrderedProject = {
	externalReferenceCode: string;
	name: string;
};

export function getProjectsWithOrders<T extends OrderedProject>(
	projects: T[],
	placedOrders: ProjectOrder[]
): T[] {
	const projectExternalReferenceCodes = new Set<string>();
	const projectNames = new Set<string>();

	placedOrders.forEach((order) => {
		const projectExternalReferenceCode =
			getProjectExternalReferenceCode(order);

		if (projectExternalReferenceCode) {
			projectExternalReferenceCodes.add(projectExternalReferenceCode);
		}
		else {
			projectNames.add(getProjectName(order));
		}
	});

	return projects.filter(
		(project) =>
			projectExternalReferenceCodes.has(project.externalReferenceCode) ||
			projectNames.has(project.name)
	);
}

export default getProjectsWithOrders;
