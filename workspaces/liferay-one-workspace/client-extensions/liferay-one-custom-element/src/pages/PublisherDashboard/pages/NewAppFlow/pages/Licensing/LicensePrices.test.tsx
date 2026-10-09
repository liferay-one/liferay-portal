/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ReactNode, useEffect} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {describe, expect, it, vi} from 'vitest';
import NewAppContextProvider, {
	NewAppTypes,
	useNewAppContext,
} from '~/context/NewAppContextProvider';
import {ProductLicenseTier, ProductType} from '~/enums/Product';

import LicensePrices from './LicensePrices';

vi.mock('~/components/Loading/Loading', () => ({
	default: {
		FullScreen: () => null,
		Page: () => null,
	},
}));

vi.mock('~/hooks/useGetVocabulariesAndCategories', () => ({
	useGetVocabulariesAndCategories: () => ({data: {}, isLoading: false}),
}));

vi.mock('~/context/MarketplaceContextProvider', () => ({
	useMarketplaceContext: () => ({properties: {featureFlags: []}}),
}));

const Initializer = ({children}: {children: ReactNode}) => {
	const [, dispatch] = useNewAppContext();

	useEffect(() => {
		dispatch({
			payload: {appType: ProductType.DXP},
			type: NewAppTypes.SET_BUILD,
		});

		dispatch({
			payload: {
				currency: 'EUR',
				licenseTier: ProductLicenseTier.STANDARD,
			},
			type: NewAppTypes.SET_LICENSING_ADD_PRICE,
		});
	}, [dispatch]);

	return <>{children}</>;
};

const renderComponent = () => {
	return render(
		<MemoryRouter>
			<NewAppContextProvider>
				<Initializer>
					<LicensePrices />
				</Initializer>
			</NewAppContextProvider>
		</MemoryRouter>
	);
};

describe('LicensePrices', () => {
	it('renders USD and EUR panels', async () => {
		renderComponent();

		expect(await screen.findByText('USD')).toBeInTheDocument();
		expect(await screen.findByText('EUR')).toBeInTheDocument();
	});

	it('deletes EUR when delete button is clicked', async () => {
		renderComponent();

		expect(await screen.findByText('EUR')).toBeInTheDocument();

		const deleteButton = screen.getByRole('button', {
			name: 'Delete all prices for EUR',
		});

		await userEvent.click(deleteButton);

		expect(screen.queryByText('EUR')).not.toBeInTheDocument();
	});

	it('deletes an added price tier when delete tier button is clicked', async () => {
		renderComponent();

		const addTierButtons = await screen.findAllByRole('button', {
			name: 'Add Price Tier',
		});

		await userEvent.click(addTierButtons[0]);

		const deleteTierButtons = await screen.findAllByRole('button', {
			name: 'Delete',
		});
		expect(deleteTierButtons.length).toBeGreaterThan(0);

		await userEvent.click(deleteTierButtons[0]);

		expect(screen.queryAllByRole('button', {name: 'Delete'})).toHaveLength(
			deleteTierButtons.length - 1
		);
	});
});
