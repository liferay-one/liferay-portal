/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {ReactNode} from 'react';
import {useParams} from 'react-router';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useProject} from '~/context/ProjectContext';
import {useDeliveryProduct} from '~/hooks/useDeliveryProduct';
import {useDeliveryProductByExternalReferenceCode} from '~/hooks/useDeliveryProductByExternalReferenceCode';
import {
	useHasActiveExperienceOffering,
	useProjectCommerce,
} from '~/hooks/useProjectCommerce';
import {useProjectItems} from '~/hooks/useProjectItems';
import {useProjectOrders} from '~/hooks/useProjectOrders';
import {resolveProductTabConfig} from '~/pages/MyAccount/Projects/utils/resolveProductTabConfig';

import ProjectItemDetails from './ProjectItemDetails';

vi.mock('react-router', () => ({useParams: vi.fn()}));

vi.mock('~/context/ProjectContext', () => ({useProject: vi.fn()}));

vi.mock('~/hooks/useDeliveryProduct', () => ({useDeliveryProduct: vi.fn()}));

vi.mock('~/hooks/useDeliveryProductByExternalReferenceCode', () => ({
	useDeliveryProductByExternalReferenceCode: vi.fn(),
}));

vi.mock('~/hooks/useProjectCommerce', () => ({
	useHasActiveExperienceOffering: vi.fn(),
	useProjectCommerce: vi.fn(),
}));

vi.mock('~/hooks/useProjectItems', () => ({useProjectItems: vi.fn()}));

vi.mock('~/hooks/useProjectOrders', async (importOriginal) => ({
	...(await importOriginal<typeof import('~/hooks/useProjectOrders')>()),
	useProjectOrders: vi.fn(),
}));

vi.mock(
	'~/pages/MyAccount/Projects/components/ProjectDetailTabs/ProjectDetailTabs',
	() => ({
		default: ({header}: {header: ReactNode}) => <div>{header}</div>,
	})
);

vi.mock('~/pages/MyAccount/Projects/utils/resolveProductTabConfig', () => ({
	resolveProductTabConfig: vi.fn(),
}));

const PRODUCT_DESCRIPTION = 'A description that no longer makes sense.';

describe('[ROUTE-MY-ACCOUNT-PRODUCTERC] ProjectItemDetails', () => {
	beforeEach(() => {
		vi.mocked(useParams).mockReturnValue({productERC: 'PRDCT-1'});

		vi.mocked(useProject).mockReturnValue({
			project: undefined,
			projectId: 'PRJCT-1',
			selectedContractERC: undefined,
		} as unknown as ReturnType<typeof useProject>);

		vi.mocked(useProjectCommerce).mockReturnValue({
			contract: undefined,
			loading: false,
		} as unknown as ReturnType<typeof useProjectCommerce>);

		vi.mocked(useHasActiveExperienceOffering).mockReturnValue({
			hasActiveExperienceOffering: false,
			loading: false,
		} as unknown as ReturnType<typeof useHasActiveExperienceOffering>);

		vi.mocked(useProjectItems).mockReturnValue({
			applications: [],
			loading: false,
			products: [{externalReferenceCode: 'PRDCT-1', id: '101'}],
		} as unknown as ReturnType<typeof useProjectItems>);

		vi.mocked(useDeliveryProduct).mockReturnValue({
			data: {
				catalogName: 'Liferay',
				description: `<p>${PRODUCT_DESCRIPTION}</p>`,
				name: 'Liferay DXP',
				productId: 101,
				productSpecifications: [],
			},
			isLoading: false,
		} as unknown as ReturnType<typeof useDeliveryProduct>);

		vi.mocked(useProjectOrders).mockReturnValue({
			loading: false,
			placedOrders: [],
		} as unknown as ReturnType<typeof useProjectOrders>);

		vi.mocked(useDeliveryProductByExternalReferenceCode).mockReturnValue({
			data: undefined,
		} as unknown as ReturnType<
			typeof useDeliveryProductByExternalReferenceCode
		>);

		vi.mocked(resolveProductTabConfig).mockReturnValue({
			tabKeys: [],
		} as unknown as ReturnType<typeof resolveProductTabConfig>);
	});

	it('renders the product name without the product description', () => {
		render(<ProjectItemDetails itemType="product" />);

		expect(screen.getByText('Liferay DXP')).toBeTruthy();
		expect(screen.queryByText(PRODUCT_DESCRIPTION)).toBeNull();
	});
});
