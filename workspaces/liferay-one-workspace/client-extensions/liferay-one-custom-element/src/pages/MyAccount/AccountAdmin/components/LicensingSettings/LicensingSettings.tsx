/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayToggle} from '@clayui/form';
import ClayTable from '@clayui/table';
import {useState} from 'react';
import {DetailedCard} from '~/components/DetailedCard/DetailedCard';
import Loading from '~/components/Loading/Loading';
import {useOneContext} from '~/context/OneContextProvider';
import i18n, {Word} from '~/i18n';
import useProjectLicensingSettings from '~/pages/MyAccount/AccountAdmin/hooks/useProjectLicensingSettings';
import {Liferay} from '~/services/liferay/liferay';
import Projects from '~/services/spring-boot/Projects';

import type FetcherError from '~/services/fetcher/FetcherError';
import type {
	ProjectLicensingSetting,
	ProjectLicensingSettings,
} from '~/types/projects';

const LICENSING_SETTINGS: {
	defaultValue: boolean;
	label: Word;
	name: ProjectLicensingSetting;
}[] = [
	{
		defaultValue: false,
		label: 'complimentary-key',
		name: 'allowComplimentary',
	},
	{
		defaultValue: false,
		label: 'permanent-licenses',
		name: 'allowPermanentLicenses',
	},
	{
		defaultValue: true,
		label: 'self-provisioning',
		name: 'allowSelfProvisioning',
	},
];

export default function LicensingSettings() {
	const {userAccountModel} = useOneContext();

	const canManageAccountAdmin = Boolean(
		userAccountModel?.canManageAccountAdmin
	);

	const {data, error, isLoading, mutate} = useProjectLicensingSettings();

	const [saving, setSaving] = useState(false);

	const handleToggle = async (
		name: ProjectLicensingSetting,
		project: ProjectLicensingSettings,
		value: boolean
	) => {
		setSaving(true);

		try {
			const licensingSettings = await Projects.patchLicensingSettings(
				project.externalReferenceCode,
				{[name]: value}
			);

			await mutate(
				(current) =>
					current && {
						...current,
						items: current.items.map((item) =>
							item.externalReferenceCode ===
							project.externalReferenceCode
								? {...item, ...licensingSettings}
								: item
						),
					},
				{revalidate: false}
			);

			Liferay.Util.openToast({
				message: i18n.translate('the-changes-were-saved-successfully'),
				type: 'success',
			});
		}
		catch (error) {
			const info = (error as FetcherError)?.info;

			Liferay.Util.openToast({
				message:
					info?.detail ??
					info?.title ??
					i18n.translate('an-unexpected-error-occurred'),
				type: 'danger',
			});

			await mutate();
		}
		finally {
			setSaving(false);
		}
	};

	const projects = data?.items ?? [];

	const renderContent = () => {
		if (isLoading) {
			return <Loading className="my-4" size="sm" />;
		}

		if (error) {
			return (
				<p className="mb-0 mt-3 text-danger">
					{i18n.translate('an-unexpected-error-occurred')}
				</p>
			);
		}

		if (!projects.length) {
			return (
				<p className="mb-0 mt-3">
					{i18n.translate('no-projects-were-found')}
				</p>
			);
		}

		return (
			<ClayTable borderless className="mt-3">
				<ClayTable.Head>
					<ClayTable.Row>
						<ClayTable.Cell headingCell>
							{i18n.translate('project')}
						</ClayTable.Cell>

						{LICENSING_SETTINGS.map(({label, name}) => (
							<ClayTable.Cell headingCell key={name}>
								{i18n.translate(label)}
							</ClayTable.Cell>
						))}
					</ClayTable.Row>
				</ClayTable.Head>

				<ClayTable.Body>
					{projects.map((project) => (
						<ClayTable.Row key={project.externalReferenceCode}>
							<ClayTable.Cell>{project.name}</ClayTable.Cell>

							{LICENSING_SETTINGS.map(
								({defaultValue, label, name}) => (
									<ClayTable.Cell key={name}>
										<ClayToggle
											aria-label={`${i18n.translate(label)} ${project.name}`}
											disabled={
												!canManageAccountAdmin || saving
											}
											onToggle={(value) =>
												handleToggle(
													name,
													project,
													value
												)
											}
											toggled={
												project[name] ?? defaultValue
											}
										/>
									</ClayTable.Cell>
								)
							)}
						</ClayTable.Row>
					))}
				</ClayTable.Body>
			</ClayTable>
		);
	};

	return (
		<DetailedCard
			cardIconAltText={i18n.translate('licensing-settings')}
			cardTitle={i18n.translate('licensing-settings')}
			className="mt-4"
			clayIcon="lock"
		>
			<p className="mb-0 mt-3 text-secondary">
				{i18n.translate('licensing-settings-description')}
			</p>

			{renderContent()}
		</DetailedCard>
	);
}
