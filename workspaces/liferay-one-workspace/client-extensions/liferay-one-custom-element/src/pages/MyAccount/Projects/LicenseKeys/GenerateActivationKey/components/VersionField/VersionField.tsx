/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClaySelect} from '@clayui/form';
import {UseFormReturn} from 'react-hook-form';
import {translate} from '~/i18n';

import {GenerateActivationKeyForm} from '../../types';
import SelectField from '../SelectField/SelectField';

type VersionFieldProps = {
	form: UseFormReturn<GenerateActivationKeyForm>;
	renewing?: boolean;
	versions: string[];
};

export default function VersionField({
	form,
	renewing,
	versions,
}: VersionFieldProps) {
	const {register, watch} = form;

	const version = watch('version');

	const locked = Boolean(renewing && version);

	if (!locked && versions.length <= 1) {
		return null;
	}

	return (
		<div className="form-group">
			<label className="ml-0" htmlFor="generateKeyVersion">
				{translate('version')}
			</label>

			<SelectField id="generateKeyVersion" single={locked}>
				<ClaySelect
					disabled={locked}
					id="generateKeyVersion"
					{...register('version')}
				>
					{locked ? (
						<ClaySelect.Option label={version} value={version} />
					) : (
						versions.map((current) => (
							<ClaySelect.Option
								key={current}
								label={current}
								value={current}
							/>
						))
					)}
				</ClaySelect>
			</SelectField>
		</div>
	);
}
