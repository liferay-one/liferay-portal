/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import Loading from '~/components/Loading/Loading';
import useMarketoForm, {UseMarketoFormProps} from '~/hooks/useMarketoForm';

import './MarketoForm.css';

const MarketoForm = (props: UseMarketoFormProps) => {
	const {started} = useMarketoForm(props);

	return (
		<>
			{!started && <Loading />}

			<form id={`mktoForm_${props.formId}`} />
		</>
	);
};

export default MarketoForm;
