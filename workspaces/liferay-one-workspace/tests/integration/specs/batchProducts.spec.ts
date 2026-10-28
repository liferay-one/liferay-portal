/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {expect} from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

import {apiTest as test} from '../fixtures/apiTest';
import {APIHelpers, HeadlessPage} from '../helpers/APIHelpers';

const BATCH_DIR = path.resolve(
	__dirname,
	'../../../client-extensions/liferay-one-batch-products/batch'
);

type BatchItem = Record<string, unknown> & {externalReferenceCode?: string};

type ObjectEntry = Record<string, unknown> & {externalReferenceCode: string};

function readBatchItems(fileName: string): BatchItem[] {
	return JSON.parse(fs.readFileSync(path.join(BATCH_DIR, fileName), 'utf8'))
		.items;
}

async function getAllItems<T>(api: APIHelpers, url: string): Promise<T[]> {
	const items: T[] = [];

	for (let page = 1; ; page++) {
		const response = await api.get<HeadlessPage<T>>(
			`${url}${url.includes('?') ? '&' : '?'}page=${page}&pageSize=500`
		);

		items.push(...response.items);

		if (items.length >= response.totalCount || !response.items.length) {
			return items;
		}
	}
}

async function getEntriesByExternalReferenceCode(
	api: APIHelpers,
	restContextPath: string
): Promise<Map<string, ObjectEntry>> {
	const entries = await getAllItems<ObjectEntry>(
		api,
		`/o/c/${restContextPath}`
	);

	return new Map(
		entries.map((entry) => [entry.externalReferenceCode, entry])
	);
}

function getMismatches(
	batchItems: BatchItem[],
	entries: Map<string, ObjectEntry>
): string[] {
	const mismatches: string[] = [];

	for (const batchItem of batchItems) {
		const externalReferenceCode = batchItem.externalReferenceCode!;

		const entry = entries.get(externalReferenceCode);

		if (!entry) {
			mismatches.push(`${externalReferenceCode} is missing`);

			continue;
		}

		for (const [key, value] of Object.entries(batchItem)) {
			if (entry[key] !== value) {
				mismatches.push(
					`${externalReferenceCode}.${key} is ${JSON.stringify(entry[key])}, not ${JSON.stringify(value)}`
				);
			}
		}
	}

	return mismatches;
}

test.describe('[FLOW-BATCH-PRODUCTS] Product batch import', () => {
	test('[FLOW-BATCH-PRODUCTS] imports every usage definition with the batch values', async ({
		api,
	}) => {
		const usageDefinitions = await getEntriesByExternalReferenceCode(
			api,
			'usagedefinitions'
		);

		expect(
			getMismatches(
				readBatchItems('00-usage-definition.batch-engine-data.json'),
				usageDefinitions
			)
		).toEqual([]);
	});

	test('[FLOW-BATCH-PRODUCTS] imports every entitlement definition with the batch values and its usage definition', async ({
		api,
	}) => {
		const batchItems = readBatchItems(
			'01-entitlement-definition.batch-engine-data.json'
		);

		const entitlementDefinitions = await getEntriesByExternalReferenceCode(
			api,
			'entitlementdefinitions'
		);

		expect(getMismatches(batchItems, entitlementDefinitions)).toEqual([]);

		const unresolved = batchItems
			.filter(
				(batchItem) =>
					batchItem.r_usageDefinitionToEntitlementDefinition_c_usageDefinitionERC &&
					!entitlementDefinitions.get(
						batchItem.externalReferenceCode!
					)
						?.r_usageDefinitionToEntitlementDefinition_c_usageDefinitionId
			)
			.map((batchItem) => batchItem.externalReferenceCode);

		expect(unresolved).toEqual([]);
	});

	test('[FLOW-BATCH-PRODUCTS] links every SKU to its entitlement definition', async ({
		api,
	}) => {
		const batchItems = readBatchItems(
			'02-entitlement-definition-sku.batch-engine-data.json'
		);

		const entitlementDefinitionSKUs =
			await getEntriesByExternalReferenceCode(
				api,
				'entitlementdefinitionskus'
			);

		expect(getMismatches(batchItems, entitlementDefinitionSKUs)).toEqual(
			[]
		);

		const unresolved = batchItems
			.filter(
				(batchItem) =>
					!entitlementDefinitionSKUs.get(
						batchItem.externalReferenceCode!
					)?.r_entitlementDefinitionToSku_c_entitlementDefinitionId
			)
			.map((batchItem) => batchItem.externalReferenceCode);

		expect(unresolved).toEqual([]);
	});

	test('[FLOW-BATCH-PRODUCTS] imports every product specification', async ({
		api,
	}) => {
		const specifications = await getAllItems<{key: string}>(
			api,
			'/o/headless-commerce-admin-catalog/v1.0/specifications'
		);

		const keys = new Set(
			specifications.map((specification) => specification.key)
		);

		const missing = readBatchItems(
			'04-commerce-specification.batch-engine-data.json'
		)
			.map((batchItem) => batchItem.key as string)
			.filter((key) => !keys.has(key));

		expect(missing).toEqual([]);
	});
});
