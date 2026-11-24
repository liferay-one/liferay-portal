/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {
	useAccountProducts,
	useActiveSkuExternalReferenceCodes,
} from '~/hooks/useProjectCommerce';
import {
	MANAGEABLE_ACCOUNT_ROLES,
	PARTNER_ACCOUNT_ROLES,
	STANDARD_ACCOUNT_ROLES,
} from '~/pages/MyAccount/AccountMembers/accountRoles';
import {useHasProject} from '~/pages/MyAccount/Projects/hooks/useHasProject';
import {getProductSpecificationValue} from '~/utils/productUtils';

const PARTNER_PRODUCT_SPECIFICATION_KEY = 'partner-product';

type AccountType = {
	hasActivePartnerSubscription: boolean;
	isHybrid: boolean;
	isPartner: boolean;
	loading: boolean;
	roleNames: string[];
};

export function useAccountType(): AccountType {
	const {hasProject, loading: projectsLoading} = useHasProject();

	const {loading: productsLoading, products} = useAccountProducts();

	const {
		activeSkuExternalReferenceCodesByProduct,
		loading: activeSkusLoading,
	} = useActiveSkuExternalReferenceCodes();

	const partnerProducts = products.filter(
		(product) =>
			getProductSpecificationValue(
				PARTNER_PRODUCT_SPECIFICATION_KEY,
				product
			) === 'true'
	);

	const hasActivePartnerSubscription = partnerProducts.some((product) =>
		activeSkuExternalReferenceCodesByProduct.has(
			product.externalReferenceCode
		)
	);

	const isPartner = Boolean(partnerProducts.length);

	const isHybrid = isPartner && hasProject;

	let roleNames = STANDARD_ACCOUNT_ROLES;

	if (isHybrid) {
		roleNames = MANAGEABLE_ACCOUNT_ROLES;
	}
	else if (isPartner) {
		roleNames = PARTNER_ACCOUNT_ROLES;
	}

	return {
		hasActivePartnerSubscription,
		isHybrid,
		isPartner,
		loading: activeSkusLoading || productsLoading || projectsLoading,
		roleNames,
	};
}
