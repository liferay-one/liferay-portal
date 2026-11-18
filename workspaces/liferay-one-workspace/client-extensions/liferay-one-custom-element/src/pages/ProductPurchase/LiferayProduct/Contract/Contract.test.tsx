/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useFetch} from '~/hooks/useFetch';
import {useProductPurchaseLayoutContext} from '~/pages/ProductPurchase/components/ProductPurchaseLayout/ProductPurchaseLayout';
import {useAppPurchaseContext} from '~/pages/ProductPurchase/context/AppPurchaseContext';

import ContractSelection from './index';

vi.mock('~/context/PropertiesContext', () => ({
	useProperties: () => ({contactSupportURL: 'https://support'}),
}));

vi.mock('~/hooks/useFetch', () => ({useFetch: vi.fn()}));

vi.mock(
	'~/pages/ProductPurchase/components/ProductPurchaseLayout/ProductPurchaseLayout',
	() => ({useProductPurchaseLayoutContext: vi.fn()})
);

vi.mock('~/pages/ProductPurchase/context/AppPurchaseContext', () => ({
	useAppPurchaseContext: vi.fn(),
}));

const namedContract = {
	endDate: '2027-01-31T00:00:00Z',
	externalReferenceCode: '800Ux00000AbCdEIAV',
	id: 1,
	name: 'Enterprise Renewal',
	startDate: '2026-02-01T00:00:00Z',
};

const undatedContract = {
	externalReferenceCode: '800Ux00000QrStUIAV',
	id: 2,
};

const unnamedContract = {
	endDate: '2026-01-31T00:00:00Z',
	externalReferenceCode: '800Ux00000ZyXwVIAV',
	id: 3,
	startDate: '2025-02-01T00:00:00Z',
};

function renderContractSelection(contracts: object[]) {
	const appPurchase: Partial<ReturnType<typeof useAppPurchaseContext>> = {
		salesforceContract: null,
		salesforceProject: {id: 25} as ReturnType<
			typeof useAppPurchaseContext
		>['salesforceProject'],
		setSalesforceContract: vi.fn(),
	};

	const layout: Partial<ReturnType<typeof useProductPurchaseLayoutContext>> =
		{
			actions: {
				nextStep: vi.fn(),
				previousStep: vi.fn(),
			},
		};

	const fetchResult: Partial<ReturnType<typeof useFetch>> = {
		data: {items: contracts, totalCount: contracts.length},
		isLoading: false,
	};

	vi.mocked(useAppPurchaseContext).mockReturnValue(
		appPurchase as ReturnType<typeof useAppPurchaseContext>
	);

	vi.mocked(useProductPurchaseLayoutContext).mockReturnValue(
		layout as ReturnType<typeof useProductPurchaseLayoutContext>
	);

	vi.mocked(useFetch).mockReturnValue(
		fetchResult as ReturnType<typeof useFetch>
	);

	return render(
		<MemoryRouter>
			<ContractSelection />
		</MemoryRouter>
	);
}

describe('[ROUTE-PRODUCT-PURCHASE-CONTRACT] ContractSelection', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('titles each contract with its dates and shows its name under them', () => {
		renderContractSelection([namedContract, unnamedContract]);

		expect(screen.getByText('02.01.2026 - 01.31.2027')).toBeTruthy();
		expect(screen.getByText('Enterprise Renewal')).toBeTruthy();
		expect(screen.getByText('02.01.2025 - 01.31.2026')).toBeTruthy();
	});

	it('shows a dash when the contract has no dates', () => {
		renderContractSelection([undatedContract]);

		expect(screen.getByText('-')).toBeTruthy();
	});

	it('never shows the Salesforce contract ID', () => {
		const {container} = renderContractSelection([
			namedContract,
			undatedContract,
			unnamedContract,
		]);

		expect(container.textContent).not.toContain(
			namedContract.externalReferenceCode
		);
		expect(container.textContent).not.toContain(
			undatedContract.externalReferenceCode
		);
		expect(container.textContent).not.toContain(
			unnamedContract.externalReferenceCode
		);
	});
});
