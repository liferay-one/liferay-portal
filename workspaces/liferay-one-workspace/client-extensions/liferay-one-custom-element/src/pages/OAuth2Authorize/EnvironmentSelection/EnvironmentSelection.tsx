/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayBadge from '@clayui/badge';
import {Navigate, useNavigate} from 'react-router-dom';
import RadioCardList from '~/components/RadioCardList/RadioCardList';
import i18n from '~/i18n';
import SelectedProjectBanner from '~/pages/MyAccount/Projects/CloudAppInstall/SelectedProjectBanner/SelectedProjectBanner';
import WizardFooter from '~/pages/MyAccount/Projects/CloudAppInstall/WizardFooter/WizardFooter';
import {parseProjectId} from '~/utils/parseProjectId';

import useOAuth2AuthorizeContext from '../hooks/useOAuth2AuthorizeContext';
import {hasExtensionEnvironment} from '../utils';

import type {ConsoleEnvironment} from '../types';

export default function EnvironmentSelection() {
	const {environment, project, projects, selectedAccount, setEnvironment} =
		useOAuth2AuthorizeContext();

	const navigate = useNavigate();

	if (!selectedAccount) {
		return <Navigate replace to="/" />;
	}

	if (!project) {
		return <Navigate replace to="/project-selection" />;
	}

	const connectableProjects = projects.filter(hasExtensionEnvironment);

	return (
		<div className="border mt-2 p-4 pt-2 rounded">
			<h1 className="align-items-center d-flex flex-column mt-2 p-2 pb-5">
				{i18n.translate('environment-selection')}
			</h1>

			<p
				className="secondary-text"
				dangerouslySetInnerHTML={{
					__html: i18n.sub('x-available-for-you', ['environments']),
				}}
			/>

			<SelectedProjectBanner project={project} />

			<RadioCardList<ConsoleEnvironment>
				contentList={project.environments.map(
					(projectEnvironment, index) => {
						const {environment: environmentName, projectName} =
							parseProjectId(projectEnvironment.projectId);

						return {
							fullTitle: true,
							id: index,
							selected:
								environment?.projectId ===
								projectEnvironment.projectId,
							title: (
								<div>
									<span className="h5 mr-3">
										{projectName.toUpperCase()}
									</span>

									<ClayBadge
										className="text-uppercase"
										label={environmentName}
									/>
								</div>
							),
							value: projectEnvironment,
						};
					}
				)}
				leftRadio
				onSelect={(radioOption) => setEnvironment(radioOption.value)}
			/>

			<WizardFooter
				backButtonProps={
					connectableProjects.length > 1
						? {onClick: () => navigate('/project-selection')}
						: undefined
				}
				continueButtonProps={{
					children: i18n.translate('connect'),
					disabled: !environment,
					onClick: () => navigate('/congratulations'),
				}}
			/>
		</div>
	);
}
