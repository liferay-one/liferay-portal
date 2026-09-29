/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayDropDown from '@clayui/drop-down';
import ClayTable from '@clayui/table';
import Loading from '~/components/Loading/Loading';
import {useProject} from '~/context/ProjectContext';
import {translate} from '~/i18n';

import WizardFooter from '../../../CloudAppInstall/WizardFooter/WizardFooter';
import useCloudNativeEnvironments from '../hooks/useCloudNativeEnvironments';
import {NON_PRODUCTION_KEY_TYPE} from '../utils';

type NonProductionEnvironmentsStepProps = {
	onClickActivate: () => void;
	onClickBack: () => void;
	onClickCancel: () => void;
};

export default function NonProductionEnvironmentsStep({
	onClickActivate,
	onClickBack,
	onClickCancel,
}: NonProductionEnvironmentsStepProps) {
	const {projectId} = useProject();

	const {environments, loading} = useCloudNativeEnvironments(projectId);

	if (loading) {
		return <Loading />;
	}

	const nonProductionEnvironments = environments.filter(
		(environment) => environment.type === NON_PRODUCTION_KEY_TYPE
	);

	return (
		<>
			<div className="generate-activation-key-environments">
				<h2 className="h4">{translate('cloud-native-environments')}</h2>

				{nonProductionEnvironments.length ? (
					<ClayTable>
						<ClayTable.Head>
							<ClayTable.Row>
								<ClayTable.Cell headingCell>
									{translate('type')}
								</ClayTable.Cell>

								<ClayTable.Cell headingCell>
									{translate('environment-id')}
								</ClayTable.Cell>

								<ClayTable.Cell headingCell>
									{translate('environment-name')}
								</ClayTable.Cell>

								<ClayTable.Cell headingCell />
							</ClayTable.Row>
						</ClayTable.Head>

						<ClayTable.Body>
							{nonProductionEnvironments.map((environment) => (
								<ClayTable.Row key={environment.id}>
									<ClayTable.Cell>
										{environment.type}
									</ClayTable.Cell>

									<ClayTable.Cell>
										{environment.externalReferenceCode ||
											environment.id}
									</ClayTable.Cell>

									<ClayTable.Cell>
										{environment.name}
									</ClayTable.Cell>

									<ClayTable.Cell className="text-right">
										<ClayDropDown
											trigger={
												<button
													className="btn btn-unstyled"
													type="button"
												>
													⋮
												</button>
											}
										>
											<ClayDropDown.ItemList>
												<ClayDropDown.Item disabled>
													{translate('modify')}
												</ClayDropDown.Item>
											</ClayDropDown.ItemList>
										</ClayDropDown>
									</ClayTable.Cell>
								</ClayTable.Row>
							))}
						</ClayTable.Body>
					</ClayTable>
				) : (
					<p className="text-neutral-7">
						{translate(
							'no-cloud-native-environments-are-available-for-this-project'
						)}
					</p>
				)}
			</div>

			<WizardFooter
				backButtonProps={{onClick: onClickBack}}
				cancelButtonProps={{onClick: onClickCancel}}
				continueButtonProps={{
					children: translate('activate-new-non-prod-environment'),
					onClick: onClickActivate,
				}}
			/>
		</>
	);
}
