/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import Loading from '~/components/Loading/Loading';
import {useProject} from '~/context/ProjectContext';
import {useProperties} from '~/context/PropertiesContext';
import {useProjectEnvironments} from '~/hooks/useProjectEnvironments';
import i18n from '~/i18n';
import {buildEnvironmentSections} from '~/pages/MyAccount/Projects/utils/buildEnvironmentSections';
import {filterEnvironmentsByProject} from '~/pages/MyAccount/Projects/utils/filterEnvironmentsByProject';

import AIHubEnvironment from '../AIHubEnvironment/AIHubEnvironment';
import DSREnvironment from '../DSREnvironment/DSREnvironment';
import DXPConnections from '../DXPConnections/DXPConnections';
import EnvironmentCard from '../EnvironmentCard/EnvironmentCard';
import EnvironmentCards from '../EnvironmentCards/EnvironmentCards';
import LDPTokenCard from '../LDPTokenCard/LDPTokenCard';
import SectionedDetailsCard from '../SectionedDetailsCard/SectionedDetailsCard';

import type {ProductEnvironmentInfo} from '~/hooks/useProjectOrders';
import type {EnvironmentProfile} from '~/pages/MyAccount/Projects/utils/resolveEnvironmentProfile';

import type {DetailsRow} from '../DetailsCard/DetailsCard';

type ProductEnvironmentProfile = Exclude<EnvironmentProfile, 'dxp'>;

type EnvironmentTabProps = {
	environment: ProductEnvironmentInfo;
	profile?: EnvironmentProfile;
};

const ENVIRONMENT_OFFERING_BY_PROFILE: Record<
	ProductEnvironmentProfile,
	string
> = {
	'ac-token': 'DSR',
	'ai-hub': 'AI Hub',
	'analytics-cloud': 'Analytics Cloud',
	'cloud-native': 'Cloud Native',
	'none': '',
	'paas': 'PaaS',
	'saas': 'SaaS',
	'workspace': 'LDP',
};

function ProductEnvironment({
	environment,
	profile,
}: {
	environment: ProductEnvironmentInfo;
	profile?: ProductEnvironmentProfile;
}) {
	const {projectId} = useProject();
	const {analyticsCloudURL} = useProperties();
	const {environments, loading} = useProjectEnvironments();

	const expectedOffering = profile
		? ENVIRONMENT_OFFERING_BY_PROFILE[profile]
		: '';

	const matchingEnvironments = filterEnvironmentsByProject(
		projectId,
		environments.filter((item) => item.offering === expectedOffering)
	);

	const [environmentEntry] = matchingEnvironments;

	if (loading) {
		return <Loading.Page />;
	}

	const workspaceURL =
		profile === 'workspace' &&
		analyticsCloudURL &&
		environment.ldpWorkspacePath
			? `${analyticsCloudURL}${environment.ldpWorkspacePath}`
			: '';

	const workspaceURLRows: DetailsRow[] = workspaceURL
		? [
				{
					label: i18n.translate('workspace-url'),
					value: (
						<a
							href={workspaceURL}
							rel="noopener noreferrer"
							target="_blank"
						>
							{workspaceURL}
						</a>
					),
				},
			]
		: [];

	const workspaceInfoCard =
		!profile || !environmentEntry ? (
			<EnvironmentCard
				environment={environment}
				extraRows={workspaceURLRows}
			/>
		) : (
			<SectionedDetailsCard
				icon="cloud"
				sections={buildEnvironmentSections(
					matchingEnvironments,
					profile
				).map((section, index) =>
					index
						? section
						: {
								...section,
								rows: [...section.rows, ...workspaceURLRows],
							}
				)}
				title="workspace-info"
			/>
		);

	if (profile === 'ai-hub') {
		return <AIHubEnvironment environment={environmentEntry} />;
	}

	if (profile === 'ac-token' && environmentEntry) {
		return <DSREnvironment environment={environmentEntry} />;
	}

	if (profile !== 'workspace') {
		return workspaceInfoCard;
	}

	return (
		<EnvironmentCards>
			{workspaceInfoCard}

			<LDPTokenCard
				dataSourceAccessToken={environment.ldpDataSourceAccessToken}
			/>
		</EnvironmentCards>
	);
}

export default function EnvironmentTab({
	environment,
	profile,
}: EnvironmentTabProps) {
	if (profile === 'dxp') {
		return <DXPConnections />;
	}

	return <ProductEnvironment environment={environment} profile={profile} />;
}
