/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import AIHubUtilization from './AIHubUtilization';

const mocks = vi.hoisted(() => ({
	getPlacedOrders: vi.fn(),
	listView: vi.fn(),
	useOrganizationAccess: vi.fn(),
}));

vi.mock('~/components/DetailedCard/DetailedCard', () => ({
	DetailedCard: ({children}: {children: React.ReactNode}) => (
		<div>{children}</div>
	),
}));

vi.mock('~/components/ListView/ListView', () => ({
	default: (props: unknown) => {
		mocks.listView(props);

		return null;
	},
}));

vi.mock('~/hooks/useAITokenBlockSizes', () => ({
	useAITokenBlockSizes: () => ({
		isLoading: false,
		tokenBlockSizes: new Map(),
	}),
}));

vi.mock('~/hooks/useOrganizationAccess', () => ({
	useOrganizationAccess: mocks.useOrganizationAccess,
}));

vi.mock('~/i18n', () => ({
	default: {translate: (key: string) => key},
}));

vi.mock('~/services/liferay/liferay', () => ({
	Liferay: {
		CommerceContext: {account: {accountId: 7}, commerceChannelId: 3},
	},
}));

vi.mock('~/services/spring-boot/Accounts', () => ({
	default: {getPlacedOrders: mocks.getPlacedOrders},
}));

type ListViewProps = {
	fetcher?: (params: URLSearchParams) => Promise<unknown>;
	resource: string;
};

function getListViewProps() {
	return mocks.listView.mock.lastCall?.[0] as ListViewProps;
}

describe('[COMPONENT-MYACCOUNT-PROJECTS-UTILIZATIONTAB-AIHUBUTILIZATION] AIHubUtilization', () => {
	beforeEach(() => {
		mocks.getPlacedOrders.mockReset();
		mocks.listView.mockReset();
		mocks.useOrganizationAccess.mockReset();
	});

	it('reads the token purchases from the portal for an account member', () => {
		mocks.useOrganizationAccess.mockReturnValue({
			accountExternalReferenceCode: undefined,
			loading: false,
			organizationAccess: false,
		});

		render(<AIHubUtilization />);

		const {fetcher, resource} = getListViewProps();

		expect(fetcher).toBeUndefined();
		expect(resource).toContain('/channels/3/accounts/7/placed-orders');
		expect(resource).toContain('AI_HUB_TOKEN');
	});

	it('reads the token purchases from Spring Boot for a member of a linked organization', async () => {
		mocks.useOrganizationAccess.mockReturnValue({
			accountExternalReferenceCode: 'ACCNT-018',
			loading: false,
			organizationAccess: true,
		});

		render(<AIHubUtilization />);

		await getListViewProps().fetcher!(
			new URLSearchParams({page: '2', pageSize: '10'})
		);

		const [accountExternalReferenceCode, params] =
			mocks.getPlacedOrders.mock.calls[0];

		expect(accountExternalReferenceCode).toBe('ACCNT-018');
		expect(Object.fromEntries(params)).toEqual({
			channelId: '3',
			orderTypeExternalReferenceCode: 'AI_HUB_TOKEN',
			page: '2',
			pageSize: '10',
		});
	});

	it('renders nothing while the organization access loads', () => {
		mocks.useOrganizationAccess.mockReturnValue({
			accountExternalReferenceCode: undefined,
			loading: true,
			organizationAccess: false,
		});

		render(<AIHubUtilization />);

		expect(mocks.listView).not.toHaveBeenCalled();
	});
});
