/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook, waitFor} from '@testing-library/react';
import {ReactNode} from 'react';
import {SWRConfig} from 'swr';
import {afterEach, describe, expect, it, vi} from 'vitest';
import HeadlessAdminAddress, {
	AddressCountry,
} from '~/services/headless/HeadlessAdminAddress';

import useCommerceRegions from './useCommerceRegions';

const unsortedCountries: AddressCountry[] = [
	{
		a2: 'CZ',
		active: true,
		name: 'czech-republic',
		regions: [],
		title_i18n: {en_US: 'Czech Republic'},
	},
	{
		a2: 'TR',
		active: true,
		name: 'turkey',
		regions: [],
		title_i18n: {en_US: 'Turkey'},
	},
	{
		a2: 'CD',
		active: true,
		name: 'democratic-republic-of-congo',
		regions: [],
		title_i18n: {en_US: 'Democratic Republic of Congo'},
	},
	{
		a2: 'BQ',
		active: true,
		name: 'bonaire-st-eustatius-saba',
		regions: [],
		title_i18n: {en_US: 'Bonaire-St. Eustatius-Saba'},
	},
	{
		a2: 'LC',
		active: true,
		name: 'st-lucia',
		regions: [],
		title_i18n: {en_US: 'St. Lucia'},
	},
];

function wrapper({children}: {children: ReactNode}) {
	return (
		<SWRConfig value={{dedupingInterval: 0, provider: () => new Map()}}>
			{children}
		</SWRConfig>
	);
}

function mockCountries(response: unknown) {
	return vi
		.spyOn(HeadlessAdminAddress, 'getCountries')
		.mockResolvedValue(
			response as Awaited<
				ReturnType<typeof HeadlessAdminAddress.getCountries>
			>
		);
}

describe('[HOOK-PRODUCTPURCHASE-USECOMMERCEREGIONS] useCommerceRegions', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns countries in alphabetical order of displayed name', async () => {
		mockCountries({
			items: unsortedCountries,
		});

		const {result} = renderHook(() => useCommerceRegions(), {wrapper});

		await waitFor(() => {
			expect(result.current.data?.items).toBeDefined();
		});

		expect(
			result.current.data?.items?.map(
				(country) => country.title_i18n.en_US
			)
		).toEqual([
			'Bonaire-St. Eustatius-Saba',
			'Czech Republic',
			'Democratic Republic of Congo',
			'St. Lucia',
			'Turkey',
		]);
	});

	it('orders countries with diacritics correctly via localeCompare', async () => {
		const countriesWithDiacritics: AddressCountry[] = [
			{
				a2: 'DK',
				active: true,
				name: 'denmark',
				regions: [],
				title_i18n: {en_US: 'Denmark'},
			},
			{
				a2: 'CI',
				active: true,
				name: 'ivory-coast',
				regions: [],
				title_i18n: {en_US: "Côte d'Ivoire"},
			},
			{
				a2: 'DJ',
				active: true,
				name: 'djibouti',
				regions: [],
				title_i18n: {en_US: 'Djibouti'},
			},
		];

		mockCountries({
			items: countriesWithDiacritics,
		});

		const {result} = renderHook(() => useCommerceRegions(), {wrapper});

		await waitFor(() => {
			expect(result.current.data?.items).toBeDefined();
		});

		expect(
			result.current.data?.items?.map(
				(country) => country.title_i18n.en_US
			)
		).toEqual(["Côte d'Ivoire", 'Denmark', 'Djibouti']);
	});

	it('falls back to country.name when title_i18n.en_US is missing', async () => {
		const countriesWithoutTitle: AddressCountry[] = [
			{
				a2: 'ZW',
				active: true,
				name: 'Zimbabwe',
				regions: [],
				title_i18n: {},
			},
			{
				a2: 'AF',
				active: true,
				name: 'Afghanistan',
				regions: [],
				title_i18n: {},
			},
		];

		mockCountries({
			items: countriesWithoutTitle,
		});

		const {result} = renderHook(() => useCommerceRegions(), {wrapper});

		await waitFor(() => {
			expect(result.current.data?.items).toBeDefined();
		});

		expect(
			result.current.data?.items?.map((country) => country.name)
		).toEqual(['Afghanistan', 'Zimbabwe']);
	});

	it('handles undefined items in response safely', async () => {
		mockCountries({
			items: undefined,
		});

		const {result} = renderHook(() => useCommerceRegions(), {wrapper});

		await waitFor(() => {
			expect(result.current.data).toBeDefined();
		});

		expect(result.current.data?.items).toBeUndefined();
	});
});
