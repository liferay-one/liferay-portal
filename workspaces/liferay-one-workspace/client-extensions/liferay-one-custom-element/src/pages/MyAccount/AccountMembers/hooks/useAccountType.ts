/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {
	getSpecificationValue,
	useAccountProducts,
} from '~/hooks/useProjectCommerce';
import {
	MANAGEABLE_ACCOUNT_ROLES,
	PARTNER_ACCOUNT_ROLES,
	STANDARD_ACCOUNT_ROLES,
} from '~/pages/MyAccount/AccountMembers/accountRoles';
import {useHasProject} from '~/pages/MyAccount/Projects/hooks/useHasProject';

const PARTNER_PRODUCT_SPECIFICATION_KEY = 'partner-product';

type AccountType = {
	isHybrid: boolean;
	isPartner: boolean;
	loading: boolean;
	roleNames: string[];
};

export function useAccountType(): AccountType {
	const {hasProject, loading: projectsLoading} = useHasProject();

	const {loading: productsLoading, products} = useAccountProducts();

	const isPartner = products.some(
		(product) =>
			getSpecificationValue(
				product,
				PARTNER_PRODUCT_SPECIFICATION_KEY
			) === 'true'
	);

	const isHybrid = isPartner && hasProject;

	let roleNames = STANDARD_ACCOUNT_ROLES;

	if (isHybrid) {
		roleNames = MANAGEABLE_ACCOUNT_ROLES;
	}
	else if (isPartner) {
		roleNames = PARTNER_ACCOUNT_ROLES;
	}

	return {
		isHybrid,
		isPartner,
		loading: productsLoading || projectsLoading,
		roleNames,
	};
}
