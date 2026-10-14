/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useFetch} from '~/hooks/useFetch';

import DownloadTab from './DownloadTab';

import type {VirtualItem} from '~/types/orders';

vi.mock('~/hooks/useFetch', () => ({
	useFetch: vi.fn(),
}));

function mockProductVersions(
	items: {
		bundleURL?: string;
		externalReferenceCode: string;
		productVersion: string;
	}[]
) {
	vi.mocked(useFetch).mockImplementation(
		(url) =>
			({
				data: url ? {items} : undefined,
				isLoading: false,
			}) as ReturnType<typeof useFetch>
	);
}

describe('[ROUTE-MY-ACCOUNT-PRODUCTERC] DownloadTab', () => {
	beforeEach(() => {
		vi.mocked(useFetch).mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('lists the bundle of each product version that has a bundle URL, newest first', () => {
		mockProductVersions([
			{
				bundleURL: 'https://releases-cdn.liferay.com/dxp/2024.q4.9.zip',
				externalReferenceCode: 'DXP 2024.Q4.9',
				productVersion: 'DXP 2024.Q4.9',
			},
			{
				externalReferenceCode: 'DXP 2025.Q1.1',
				productVersion: 'DXP 2025.Q1.1',
			},
			{
				bundleURL: 'https://releases-cdn.liferay.com/dxp/2025.q1.2.7z',
				externalReferenceCode: 'DXP 2025.Q1.2',
				productVersion: 'DXP 2025.Q1.2',
			},
		]);

		render(<DownloadTab profile="bundle" />);

		expect(screen.getByText('Bundle Name')).toBeInTheDocument();
		expect(
			screen
				.getAllByText(/^Liferay DXP/)
				.map(({textContent}) => textContent)
		).toEqual(['Liferay DXP 2025.Q1.2', 'Liferay DXP 2024.Q4.9']);
		expect(screen.getAllByRole('button', {name: 'Download'})).toHaveLength(
			2
		);
	});

	it('opens the bundle URL of a version', () => {
		const open = vi.spyOn(window, 'open').mockReturnValue(null);

		mockProductVersions([
			{
				bundleURL: 'https://releases-cdn.liferay.com/dxp/2025.q1.2.7z',
				externalReferenceCode: 'DXP 2025.Q1.2',
				productVersion: 'DXP 2025.Q1.2',
			},
		]);

		render(<DownloadTab profile="bundle" />);

		fireEvent.click(screen.getByRole('button', {name: 'Download'}));

		expect(open).toHaveBeenCalledWith(
			'https://releases-cdn.liferay.com/dxp/2025.q1.2.7z',
			'_blank',
			'noopener,noreferrer'
		);
	});

	it('shows the empty state when no product version has a bundle URL', () => {
		mockProductVersions([
			{
				externalReferenceCode: 'DXP 2025.Q1.1',
				productVersion: 'DXP 2025.Q1.1',
			},
		]);

		render(<DownloadTab profile="bundle" />);

		expect(screen.getByText('No Bundles Yet')).toBeInTheDocument();
	});

	it('lists the virtual items and requests no product versions for the app profile', () => {
		const virtualItems = [
			{url: 'https://example.com/app-1.zip', version: '1.0.0'},
			{url: 'https://example.com/app-2.zip', version: '2.0.0'},
		] as VirtualItem[];

		mockProductVersions([]);

		render(<DownloadTab profile="app" virtualItems={virtualItems} />);

		expect(screen.getByText('Supported Version')).toBeInTheDocument();
		expect(screen.getByText('1.0.0')).toBeInTheDocument();
		expect(screen.getByText('2.0.0')).toBeInTheDocument();
		expect(useFetch).toHaveBeenCalledWith(null, expect.anything());
		expect(useFetch).not.toHaveBeenCalledWith(
			'/o/c/productversions',
			expect.anything()
		);
	});
});
