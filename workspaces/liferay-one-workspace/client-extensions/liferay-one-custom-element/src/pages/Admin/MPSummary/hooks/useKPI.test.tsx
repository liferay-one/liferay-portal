/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

type Product = {
	catalogExternalReferenceCode: string;
	externalReferenceCode?: string;
	name: {en_US: string};
};

type KPI = {
	annualTargetCurrent: number;
	annualTargetTotal: number;
	lastYearCount?: number;
	onClick: (() => void) | null;
};

const mocks = vi.hoisted(() => ({
	getCatalogs: vi.fn(),
	getProductsDashboardKPI: vi.fn(),
	metrics: vi.fn(),
	navigate: vi.fn(),
	onOpenModal: vi.fn(),
	properties: {} as Record<string, unknown>,
	useSWR: vi.fn(),
}));

vi.mock('swr', () => ({
	default: mocks.useSWR,
}));

vi.mock('react-router-dom', () => ({
	useNavigate: () => mocks.navigate,
}));

vi.mock('~/context/OneContextProvider', () => ({
	useOneContext: () => ({properties: mocks.properties}),
}));

vi.mock('~/hooks/useListTypeDefinition', () => ({
	default: () => ({
		data: {
			listTypeEntries: [
				{externalReferenceCode: '2026-Q1', name: '2026.Q1'},
				{externalReferenceCode: '7-4', name: '7.4'},
			],
		},
	}),
}));

vi.mock('~/hooks/useModalContext', () => ({
	default: () => ({onOpenModal: mocks.onOpenModal}),
}));

vi.mock('~/pages/Admin/MPSummary/components/ProjectsUsingMarketplace', () => ({
	default: () => null,
}));

vi.mock('~/services/headless/GraphQL', () => ({
	default: {metrics: mocks.metrics},
}));

vi.mock('~/services/headless/HeadlessCommerceAdminCatalog', () => ({
	default: {
		getCatalogs: mocks.getCatalogs,
		getProductsDashboardKPI: mocks.getProductsDashboardKPI,
	},
}));

function setUp({
	catalogs = [] as {externalReferenceCode: string; name: string}[],
	kpi = {} as Record<string, string>,
	lastYearProjectsUsingMarketplaceAppsCount = undefined as string | undefined,
	products = [] as Product[],
	reports = [] as {externalReferenceCode: string; value: string}[],
}) {
	mocks.properties = {
		kpi: {
			kpiConnectorQuartelyRelease: '20',
			kpiLowCodePublishedApps: '30',
			kpiPartnershipIntegration: '40',
			kpiProjectUsingMarketplaceApps: '50',
			kpiQuartelyReleaseApps: '60',
			...kpi,
		},
		lastYearProjectsUsingMarketplaceAppsCount,
	};

	mocks.getProductsDashboardKPI.mockResolvedValue({
		data: {
			metrics: {
				appsAndConnectorSupportingQRelease: {
					items: products,
					totalCount: products.length,
				},
				lastYearAppsAndConnectorSupportingQRelease: {
					items: [
						{catalogExternalReferenceCode: 'CAT-A'},
						{catalogExternalReferenceCode: 'CAT-A'},
						{catalogExternalReferenceCode: 'CAT-B'},
					],
					totalCount: 3,
				},
				lastYearLowCodeConfigurationsPublished: {totalCount: 4},
				lastYearPartnershipIntegration: {totalCount: 5},
				lowCodeConfigurationsPublished: {totalCount: 6},
				partnershipIntegration: {totalCount: 7},
			},
		},
	});

	mocks.getCatalogs.mockResolvedValue({items: catalogs});

	mocks.metrics.mockResolvedValue({
		data: {metrics: {koroneikiProjects: {items: reports}}},
	});
}

async function runFetcher() {
	vi.resetModules();

	const {default: useKPI} = await import('./useKPI');

	renderHook(() => useKPI());

	return mocks.useSWR.mock.calls[0][1]() as Promise<{kpis: KPI[]}>;
}

function toProduct(
	catalogExternalReferenceCode: string,
	name: string,
	externalReferenceCode?: string
): Product {
	return {
		catalogExternalReferenceCode,
		externalReferenceCode,
		name: {en_US: name},
	};
}

describe('[HOOK-ADMIN-MPSUMMARY-USEKPI] useKPI', () => {
	beforeEach(() => {
		mocks.getCatalogs.mockReset();
		mocks.getProductsDashboardKPI.mockReset();
		mocks.metrics.mockReset();
		mocks.navigate.mockReset();
		mocks.onOpenModal.mockReset();
		mocks.useSWR.mockReset();
	});

	it('uses the live value with the configured target', async () => {
		setUp({});

		const {kpis} = await runFetcher();

		expect(kpis[1]).toMatchObject({
			annualTargetCurrent: 7,
			annualTargetTotal: 40,
			lastYearCount: 5,
		});
		expect(kpis[4]).toMatchObject({
			annualTargetCurrent: 6,
			annualTargetTotal: 30,
			lastYearCount: 4,
		});
	});

	it('parses the value and total form of an annual target', async () => {
		setUp({kpi: {kpiPartnershipIntegration: '12/80'}});

		const {kpis} = await runFetcher();

		expect(kpis[1]).toMatchObject({
			annualTargetCurrent: 12,
			annualTargetTotal: 80,
		});
	});

	it('parses only Koroneiki report rows with a matching external reference code', async () => {
		setUp({
			lastYearProjectsUsingMarketplaceAppsCount: '9',
			reports: [
				{
					externalReferenceCode: 'KORONEIKI-PROJECT-ABC',
					value: '{"accountName": "Acme", "orders": [1]}',
				},
				{
					externalReferenceCode: 'KORONEIKI-PROJECT-DEF',
					value: 'not json',
				},
				{externalReferenceCode: 'OTHER-REPORT', value: '{}'},
			],
		});

		const {kpis} = await runFetcher();

		expect(kpis[0]).toMatchObject({
			annualTargetCurrent: 2,
			annualTargetTotal: 50,
			lastYearCount: 9,
		});

		kpis[0].onClick?.();

		expect(mocks.onOpenModal).toHaveBeenCalledTimes(1);

		const [{body, size}] = mocks.onOpenModal.mock.calls[0];

		expect(size).toBe('lg');
		expect(body.props.projectsUsingMarkeplaceApps).toEqual([
			['ABC', {accountName: 'Acme', orders: [1]}],
			['DEF', {accountName: '', orders: []}],
		]);
	});

	it('sets the project modal handler to null when no projects match', async () => {
		setUp({
			reports: [{externalReferenceCode: 'OTHER-REPORT', value: '{}'}],
		});

		const {kpis} = await runFetcher();

		expect(kpis[0].onClick).toBeNull();
		expect(kpis[0].annualTargetCurrent).toBe(0);
		expect(kpis[0].lastYearCount).toBeUndefined();
	});

	it('groups products by catalog name and falls back to the product external reference code', async () => {
		setUp({
			catalogs: [{externalReferenceCode: 'CAT-A', name: 'Catalog A'}],
			products: [
				toProduct('CAT-A', 'App 1'),
				toProduct('CAT-A', 'App 2'),
				toProduct('CAT-MISSING', 'App 3', 'PRDCT-3'),
			],
		});

		const {kpis} = await runFetcher();

		expect(kpis[2]).toMatchObject({
			annualTargetCurrent: 2,
			annualTargetTotal: 60,
			lastYearCount: 2,
		});
		expect(kpis[3]).toMatchObject({
			annualTargetCurrent: 3,
			annualTargetTotal: 20,
			lastYearCount: 3,
		});

		kpis[2].onClick?.();

		const [{body}] = mocks.onOpenModal.mock.calls[0];

		const catalogNames = body.props.children.map(
			(item: {props: {children: {props: {children: string}}[]}}) =>
				item.props.children[0].props.children
		);

		expect(catalogNames).toEqual(['Catalog A', 'PRDCT-3']);
	});

	it('navigates to the filtered app and publisher pages', async () => {
		setUp({});

		const {kpis} = await runFetcher();

		kpis[1].onClick?.();
		kpis[3].onClick?.();
		kpis[4].onClick?.();

		expect(mocks.navigate.mock.calls[0][0]).toContain(
			'/publishers?filter={"customFields/AccountType":["Technology Partner"]}'
		);
		expect(mocks.navigate.mock.calls[1][0]).toBe(
			'/mp-apps?filter={"specificationValues|liferayVersion":["2026.Q1"]}&filterSchema=administratorApps'
		);
		expect(mocks.navigate.mock.calls[2][0]).toContain(
			'"specificationValues|appType":"low-code-configuration"'
		);
	});
});
