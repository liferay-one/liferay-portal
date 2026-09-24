/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import type {ConsoleUserProject} from '~/services/spring-boot/Console';
import type {Account} from '~/types/accounts';

export type ConsoleEnvironment = ConsoleUserProject['environments'][number];

export type OAuth2AuthorizeContext = {
	code: string;
	environment?: ConsoleEnvironment;
	isLoadingProjects: boolean;
	origin: string;
	project?: ConsoleUserProject;
	projects: ConsoleUserProject[];
	selectedAccount?: Account;
	setEnvironment: (environment?: ConsoleEnvironment) => void;
	setProject: (project?: ConsoleUserProject) => void;
	setSelectedAccount: (account?: Account) => void;
};
