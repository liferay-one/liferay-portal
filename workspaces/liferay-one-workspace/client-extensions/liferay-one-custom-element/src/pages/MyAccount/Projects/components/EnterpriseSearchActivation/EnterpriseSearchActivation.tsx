/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ActivationKeyDownload from '~/pages/MyAccount/Projects/components/ActivationKeyDownload/ActivationKeyDownload';

import type {ProjectContract} from '~/hooks/useProjectCommerce';

type EnterpriseSearchActivationProps = {
	contract?: ProjectContract;
};

export default function EnterpriseSearchActivation({
	contract,
}: EnterpriseSearchActivationProps) {
	return (
		<ActivationKeyDownload
			contract={contract}
			productGroup="ENTERPRISE_SEARCH"
			productTitle="Enterprise Search"
		/>
	);
}
