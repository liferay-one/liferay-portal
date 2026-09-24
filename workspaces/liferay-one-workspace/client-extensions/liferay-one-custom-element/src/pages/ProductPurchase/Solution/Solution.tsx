/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Navigate} from 'react-router-dom';
import {SolutionTypes} from '~/enums/Product';
import ContactSales from '~/pages/ProductPurchase/ContactSales/ContactSales';
import {useProductPurchaseLayoutContext} from '~/pages/ProductPurchase/components/ProductPurchaseLayout/ProductPurchaseLayout';
import {
	ProductSpecificationKey,
	getProductSpecificationValue,
} from '~/utils/productUtils';

import PreBuiltTrialForm from './PreBuiltTrialForm/PreBuiltTrialForm';

const Solution = () => {
	const {product, selectedAccount} = useProductPurchaseLayoutContext();

	if (!selectedAccount?.id) {
		return <Navigate replace to="/" />;
	}

	const solutionType = getProductSpecificationValue(
		ProductSpecificationKey.SOLUTION_TYPE,
		product
	);

	if (solutionType === SolutionTypes.PRE_BUILT_TRIAL) {
		return <PreBuiltTrialForm />;
	}

	return <ContactSales product={product} />;
};

export default Solution;
