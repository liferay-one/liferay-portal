/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayLoadingIndicator from '@clayui/loading-indicator';
import {useEffect} from 'react';
import {Navigate, useNavigate} from 'react-router-dom';
import RadioCardList from '~/components/RadioCardList/RadioCardList';
import {useOneContext} from '~/context/OneContextProvider';
import i18n from '~/i18n';
import WizardFooter from '~/pages/MyAccount/Projects/CloudAppInstall/WizardFooter/WizardFooter';
import {getResourceSummary} from '~/pages/MyAccount/Projects/CloudAppInstall/utils';

import useOAuth2AuthorizeContext from '../hooks/useOAuth2AuthorizeContext';
import {hasExtensionEnvironment} from '../utils';

import type {ConsoleUserProject} from '~/services/spring-boot/Console';

export default function ProjectSelection() {
	const {myUserAccount} = useOneContext();
	const {
		isLoadingProjects,
		project,
		projects,
		selectedAccount,
		setEnvironment,
		setProject,
	} = useOAuth2AuthorizeContext();

	const navigate = useNavigate();

	const connectableProjects = projects.filter(hasExtensionEnvironment);

	const singleProject =
		projects.length === 1 && connectableProjects.length === 1
			? projects[0]
			: undefined;

	useEffect(() => {
		if (!singleProject) {
			return;
		}

		setProject(singleProject);

		navigate('/environment-selection');
	}, [navigate, setProject, singleProject]);

	if (!selectedAccount) {
		return <Navigate replace to="/" />;
	}

	const noCloudProjectsAvailable =
		!isLoadingProjects && !connectableProjects.length;

	const sortedProjects = [...projects].sort((projectA, projectB) =>
		projectA.rootProjectId.localeCompare(projectB.rootProjectId)
	);

	const selectProject = (selectedProject: ConsoleUserProject) => {
		if (!hasExtensionEnvironment(selectedProject)) {
			return;
		}

		setEnvironment(undefined);

		setProject(selectedProject);
	};

	return (
		<div className="border mt-2 p-4 pt-2 rounded">
			<h1 className="align-items-center d-flex flex-column mt-2 p-2 pb-5">
				{i18n.translate('project-selection')}
			</h1>

			<p
				className="secondary-text"
				dangerouslySetInnerHTML={{
					__html: i18n.sub('x-available-for-you', ['projects']),
				}}
			/>

			{isLoadingProjects && <ClayLoadingIndicator />}

			{noCloudProjectsAvailable && (
				<p className="text-neutral-7">
					{i18n.translate('no-cloud-projects-available')}
				</p>
			)}

			{!isLoadingProjects && !noCloudProjectsAvailable && (
				<RadioCardList<ConsoleUserProject>
					contentList={sortedProjects.map((userProject, index) => ({
						disabled: !hasExtensionEnvironment(userProject),
						fullTitle: true,
						id: index,
						selected:
							project?.rootProjectId ===
							userProject.rootProjectId,
						title: (
							<div className="d-flex flex-column w-100">
								<div className="h5 m-0">
									{userProject.rootProjectId.toUpperCase()}
								</div>

								<p className="m-0 secondary-text">
									{getResourceSummary(userProject)}
								</p>

								{!hasExtensionEnvironment(userProject) && (
									<small className="text-danger">
										{i18n.translate(
											'this-project-has-no-extension-environments'
										)}
									</small>
								)}
							</div>
						),
						value: userProject,
					}))}
					leftRadio
					onSelect={(radioOption) => selectProject(radioOption.value)}
				/>
			)}

			<WizardFooter
				backButtonProps={
					(myUserAccount?.accountBriefs?.length ?? 0) > 1
						? {onClick: () => navigate('/')}
						: undefined
				}
				continueButtonProps={
					noCloudProjectsAvailable
						? {
								children: i18n.translate('connect-anyway'),
								onClick: () => navigate('/congratulations'),
							}
						: {
								disabled: !project,
								onClick: () =>
									navigate('/environment-selection'),
							}
				}
			/>
		</div>
	);
}
