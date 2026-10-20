/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClaySelect} from '@clayui/form';
import {UseFormReturn} from 'react-hook-form';
import i18n, {translate} from '~/i18n';

import {GenerateActivationKeyForm} from '../../types';
import SelectField from '../SelectField/SelectField';

type ClusterNodesFieldProps = {
	availableCount: number;
	disabled?: boolean;
	form: UseFormReturn<GenerateActivationKeyForm>;
};

export default function ClusterNodesField({
	availableCount,
	disabled,
	form,
}: ClusterNodesFieldProps) {
	const {register} = form;

	return (
		<div className="form-group">
			<label className="ml-0" htmlFor="generateKeyClusterNodes">
				{translate('cluster-nodes')}
			</label>

			<SelectField id="generateKeyClusterNodes">
				<ClaySelect
					disabled={disabled}
					id="generateKeyClusterNodes"
					{...register('maxClusterNodes', {valueAsNumber: true})}
				>
					<ClaySelect.Option label="" value={0} />

					{Array.from(
						{length: availableCount},
						(_, index) => index + 1
					).map((clusterNodes) => (
						<ClaySelect.Option
							key={clusterNodes}
							label={String(clusterNodes)}
							value={clusterNodes}
						/>
					))}
				</ClaySelect>
			</SelectField>

			<div className="form-text">
				{i18n.sub(
					'cluster-nodes-may-not-exceed-the-maximum-number-of-x',
					[String(availableCount)]
				)}
			</div>
		</div>
	);
}
