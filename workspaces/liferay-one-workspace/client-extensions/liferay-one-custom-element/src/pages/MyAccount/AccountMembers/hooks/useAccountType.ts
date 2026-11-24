/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useAccountProducts} from '~/hooks/useProjectCommerce';
import {
	MANAGEABLE_ACCOUNT_ROLES,
	PARTNER_ACCOUNT_ROLES,
	STANDARD_ACCOUNT_ROLES,
} from '~/pages/MyAccount/AccountMembers/accountRoles';
import {useHasProject} from '~/pages/MyAccount/Projects/hooks/useHasProject';
import {getProductSpecificationValue} from '~/utils/productUtils';

const PARTNER_PRODUCT_SPECIFICATION_KEY = 'partner-product';

type AccountType = {
	error?: Error;
	isHybrid: boolean;
	isPartner: boolean;
	isRestricted: boolean;
	loading: boolean;
	roleNames: string[];
};

export function useAccountType(): AccountType {
	const {
		error: projectsError,
		hasProject,
		loading: projectsLoading,
	} = useHasProject();

	const {
		error: productsError,
		loading: productsLoading,
		products,
	} = useAccountProducts();

	const isPartner = products.some(
		(product) =>
			getProductSpecificationValue(
				PARTNER_PRODUCT_SPECIFICATION_KEY,
				product
			) === 'true'
	);

	const isHybrid = isPartner && hasProject;

	const error = projectsError ?? productsError;

	const isRestricted = !error && !hasProject && !isPartner;

	let roleNames = STANDARD_ACCOUNT_ROLES;

	if (isHybrid) {
		roleNames = MANAGEABLE_ACCOUNT_ROLES;
	}
	else if (isPartner) {
		roleNames = PARTNER_ACCOUNT_ROLES;
	}

	return {
		error,
		isHybrid,
		isPartner,
		isRestricted,
		loading: productsLoading || projectsLoading,
		roleNames,
	};
}
