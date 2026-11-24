/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {ReactNode} from 'react';
import {useParams} from 'react-router';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useAccount} from '~/context/AccountContext';
import {useProject} from '~/context/ProjectContext';
import {
	useActiveSkuExternalReferenceCodes,
	useHasActiveExperienceOffering,
	useProjectCommerce,
	useProjectProducts,
} from '~/hooks/useProjectCommerce';
import {useProjectEnvironments} from '~/hooks/useProjectEnvironments';
import {useProjectItems} from '~/hooks/useProjectItems';
import {
	hasActiveProductOrder,
	useProjectOrders,
} from '~/hooks/useProjectOrders';
import i18n from '~/i18n';
import {ONE_TIME_PURCHASES} from '~/pages/MyAccount/Projects/utils/constants';
import {resolveProductTabConfig} from '~/pages/MyAccount/Projects/utils/resolveProductTabConfig';
import {Liferay} from '~/services/liferay/liferay';

import ProjectItemDetails from './ProjectItemDetails';

vi.mock('react-router', () => ({useParams: vi.fn()}));

vi.mock('~/context/AccountContext', () => ({useAccount: vi.fn()}));

vi.mock('~/context/ProjectContext', () => ({useProject: vi.fn()}));

vi.mock('~/hooks/useProjectCommerce', () => ({
	useActiveSkuExternalReferenceCodes: vi.fn(),
	useHasActiveExperienceOffering: vi.fn(),
	useProjectCommerce: vi.fn(),
	useProjectProducts: vi.fn(),
}));

vi.mock('~/hooks/useProjectEnvironments', () => ({
	useProjectEnvironments: vi.fn(),
}));

vi.mock('~/hooks/useProjectItems', () => ({useProjectItems: vi.fn()}));

vi.mock('~/hooks/useProjectOrders', () => ({
	getProductOrder: vi.fn(),
	getProductOrderInfo: vi.fn(() => ({status: 'active'})),
	getProductVirtualItems: vi.fn(() => []),
	hasActiveProductOrder: vi.fn(() => false),
	hasProject: (order: {customFields?: {salesforceProjectId?: string}}) =>
		!!order.customFields?.salesforceProjectId,
	useProjectOrders: vi.fn(),
}));

vi.mock('~/pages/MyAccount/Projects/components/AIHubAlert/AIHubAlert', () => ({
	default: () => null,
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

describe('[FLOW-PROJECT-ITEM-HEADER] ProjectItemDetails header', () => {
	beforeEach(() => {
		vi.mocked(useParams).mockReturnValue({
			accountERC: 'ACCNT-1',
			productERC: 'PRDCT-1',
		});

		vi.mocked(useAccount).mockReturnValue({
			account: {externalReferenceCode: 'ACCNT-1', id: 7},
			loading: false,
		} as unknown as ReturnType<typeof useAccount>);

		vi.mocked(useProjectEnvironments).mockReturnValue({
			environments: [
				{
					externalEnvironmentId: '444',
					externalReferenceCode: 'AI-HUB-PRJCT-1',
				},
			],
		} as unknown as ReturnType<typeof useProjectEnvironments>);

		vi.mocked(useProject).mockReturnValue({
			project: undefined,
			projectId: 'PRJCT-1',
			selectedContractERC: undefined,
		} as unknown as ReturnType<typeof useProject>);

		vi.mocked(useProjectCommerce).mockReturnValue({
			contract: undefined,
			loading: false,
		} as unknown as ReturnType<typeof useProjectCommerce>);

		vi.mocked(useActiveSkuExternalReferenceCodes).mockReturnValue({
			activeSkuExternalReferenceCodesByProduct: new Map(),
			loading: false,
		} as unknown as ReturnType<typeof useActiveSkuExternalReferenceCodes>);

		vi.mocked(useHasActiveExperienceOffering).mockReturnValue({
			hasActiveExperienceOffering: false,
			loading: false,
		} as unknown as ReturnType<typeof useHasActiveExperienceOffering>);

		vi.mocked(useProjectItems).mockReturnValue({
			applications: [],
			loading: false,
			products: [{externalReferenceCode: 'PRDCT-1', id: '101'}],
		} as unknown as ReturnType<typeof useProjectItems>);

		vi.mocked(useProjectProducts).mockReturnValue({
			data: {
				items: [
					{
						catalogName: 'Liferay',
						description: `<p>${PRODUCT_DESCRIPTION}</p>`,
						name: 'Liferay DXP',
						productId: 101,
						productSpecifications: [],
					},
				],
			},
			isLoading: false,
		} as unknown as ReturnType<typeof useProjectProducts>);

		vi.mocked(useProjectOrders).mockReturnValue({
			loading: false,
			placedOrders: [],
		} as unknown as ReturnType<typeof useProjectOrders>);

		vi.mocked(resolveProductTabConfig).mockReturnValue({
			tabKeys: [],
		} as unknown as ReturnType<typeof resolveProductTabConfig>);
	});

	it('reads the environments of the account of the route', () => {
		render(<ProjectItemDetails itemType="product" />);

		expect(useProjectEnvironments).toHaveBeenCalledWith(7);
	});

	it('waits for the account and its environments before it renders the header', () => {
		for (const loading of [
			{accountLoading: true, environmentsLoading: false},
			{accountLoading: false, environmentsLoading: true},
		]) {
			vi.mocked(useAccount).mockReturnValue({
				account: {externalReferenceCode: 'ACCNT-1', id: 7},
				loading: loading.accountLoading,
			} as unknown as ReturnType<typeof useAccount>);
			vi.mocked(useProjectEnvironments).mockReturnValue({
				environments: [],
				loading: loading.environmentsLoading,
			} as unknown as ReturnType<typeof useProjectEnvironments>);

			const {unmount} = render(<ProjectItemDetails itemType="product" />);

			expect(screen.queryByText('Liferay DXP')).toBeNull();

			unmount();
		}
	});

	it('shows the product name and omits the product description in the header', () => {
		render(<ProjectItemDetails itemType="product" />);

		expect(screen.getByText('Liferay DXP')).toBeTruthy();
		expect(screen.queryByText(PRODUCT_DESCRIPTION)).toBeNull();
	});

	describe('Buy Liferay Tokens button', () => {
		beforeEach(() => {
			vi.mocked(resolveProductTabConfig).mockReturnValue({
				environmentProfile: 'ai-hub',
				tabKeys: [],
			} as unknown as ReturnType<typeof resolveProductTabConfig>);
		});

		it('opens the token purchase of the AI Hub product for the project', () => {
			vi.mocked(hasActiveProductOrder).mockReturnValue(true);

			const navigate = vi
				.spyOn(Liferay.Util, 'navigate')
				.mockImplementation(() => {});

			render(<ProjectItemDetails itemType="product" />);

			fireEvent.click(
				screen.getByText(i18n.translate('buy-liferay-tokens'))
			);

			expect(navigate).toHaveBeenCalledWith(
				expect.stringContaining(
					'/product-purchase?productId=101&projectExternalReferenceCode=PRJCT-1&aiHubTokens#/'
				)
			);

			navigate.mockRestore();
		});

		it('shows the button when the project has an active AI Hub order', () => {
			vi.mocked(hasActiveProductOrder).mockReturnValue(true);

			render(<ProjectItemDetails itemType="product" />);

			expect(
				screen.getByText(i18n.translate('buy-liferay-tokens'))
			).toBeTruthy();
			expect(hasActiveProductOrder).toHaveBeenCalledWith([], 101);
		});

		it('hides the button when the project has no provisioned AI Hub environment', () => {
			vi.mocked(hasActiveProductOrder).mockReturnValue(true);

			for (const environments of [
				[],
				[
					{
						externalEnvironmentId: '444',
						externalReferenceCode: 'AI-HUB-PRJCT-2',
					},
				],
				[
					{
						externalEnvironmentId: '',
						externalReferenceCode: 'AI-HUB-PRJCT-1',
					},
				],
			]) {
				vi.mocked(useProjectEnvironments).mockReturnValue({
					environments,
				} as unknown as ReturnType<typeof useProjectEnvironments>);

				const {unmount} = render(
					<ProjectItemDetails itemType="product" />
				);

				expect(
					screen.queryByText(i18n.translate('buy-liferay-tokens'))
				).toBeNull();

				unmount();
			}
		});

		it('looks only at the orders without a project and at the environment of the account on the unassigned project', () => {
			const projectOrder = {
				customFields: {salesforceProjectId: 'PRJCT-9'},
				id: 1,
				placedOrderItems: [{productId: 101}],
			};
			const unassignedOrder = {
				customFields: {},
				id: 2,
				placedOrderItems: [{productId: 101}],
			};

			vi.mocked(useProject).mockReturnValue({
				project: undefined,
				projectId: ONE_TIME_PURCHASES,
				selectedContractERC: undefined,
			} as unknown as ReturnType<typeof useProject>);
			vi.mocked(useProjectOrders).mockReturnValue({
				loading: false,
				placedOrders: [projectOrder, unassignedOrder],
			} as unknown as ReturnType<typeof useProjectOrders>);
			vi.mocked(useProjectEnvironments).mockReturnValue({
				environments: [
					{
						externalEnvironmentId: '444',
						externalReferenceCode: 'AI-HUB-ACCNT-1',
					},
				],
			} as unknown as ReturnType<typeof useProjectEnvironments>);
			vi.mocked(hasActiveProductOrder).mockReturnValue(true);

			render(<ProjectItemDetails itemType="product" />);

			expect(
				screen.getByText(i18n.translate('buy-liferay-tokens'))
			).toBeTruthy();
			expect(hasActiveProductOrder).toHaveBeenCalledWith(
				[unassignedOrder],
				101
			);
		});

		it('hides the button when the project has no active AI Hub order', () => {
			vi.mocked(hasActiveProductOrder).mockReturnValue(false);

			render(<ProjectItemDetails itemType="product" />);

			expect(
				screen.queryByText(i18n.translate('buy-liferay-tokens'))
			).toBeNull();
		});
	});
});
