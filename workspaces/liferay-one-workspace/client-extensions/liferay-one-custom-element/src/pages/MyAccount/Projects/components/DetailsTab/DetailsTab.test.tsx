/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useProject} from '~/context/ProjectContext';
import {useProductEnvironmentEntitlements} from '~/hooks/useProductEnvironmentEntitlements';
import {useProjectContacts} from '~/hooks/useProjectContacts';
import {useOrderDate} from '~/pages/MyAccount/Projects/hooks/useOrderDate';

import DetailsTab from './DetailsTab';

import type {ProductOrderInfo} from '~/hooks/useProjectOrders';

vi.mock('~/context/ProjectContext', () => ({useProject: vi.fn()}));

vi.mock(
	'~/hooks/useProductEnvironmentEntitlements',
	async (importOriginal) => ({
		...(await importOriginal<
			typeof import('~/hooks/useProductEnvironmentEntitlements')
		>()),
		useProductEnvironmentEntitlements: vi.fn(),
	})
);

vi.mock('~/hooks/useProjectContacts', () => ({useProjectContacts: vi.fn()}));

vi.mock('~/pages/MyAccount/Projects/hooks/useOrderDate', () => ({
	useOrderDate: vi.fn(),
}));

const orderInfo = {
	itemName: 'Liferay Self-Hosted',
	orderDate: 'Oct 22, 2026',
	orderId: '39196090',
	purchaseNumber: '',
	purchasedBy: '',
	quantity: '1',
} as ProductOrderInfo;

function renderDetailsTab() {
	return render(
		<DetailsTab
			orderInfo={orderInfo}
			orderItemIds={[]}
			productName="Liferay Self-Hosted"
			profile="basic"
		/>
	);
}

describe('[ROUTE-MY-ACCOUNT-PRODUCTERC] DetailsTab', () => {
	beforeEach(() => {
		vi.mocked(useProject).mockReturnValue({
			projectId: 'PRJCT-1',
		} as unknown as ReturnType<typeof useProject>);

		vi.mocked(useProductEnvironmentEntitlements).mockReturnValue({
			environmentEntitlements: [],
			loading: false,
		} as unknown as ReturnType<typeof useProductEnvironmentEntitlements>);

		vi.mocked(useProjectContacts).mockReturnValue({
			contacts: [],
		} as unknown as ReturnType<typeof useProjectContacts>);
	});

	it('shows the create date while the order date loads', () => {
		vi.mocked(useOrderDate).mockReturnValue({
			loading: true,
			orderDate: undefined,
		});

		renderDetailsTab();

		expect(screen.getByText('Oct 22, 2026')).toBeTruthy();
	});

	it('shows the order date of the order when it loads', () => {
		vi.mocked(useOrderDate).mockReturnValue({
			loading: false,
			orderDate: '2023-09-30T00:00:00Z',
		});

		renderDetailsTab();

		expect(screen.getByText('Sep 30, 2023')).toBeTruthy();
		expect(screen.queryByText('Oct 22, 2026')).toBeNull();
	});
});
