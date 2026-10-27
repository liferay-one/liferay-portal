/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {APIResponse, expect, test} from '@playwright/test';

import {
	DEFAULT_ADMIN_EMAIL,
	DEFAULT_ADMIN_PASSWORD,
} from '../../utils/constants';
import {APIHelpers, HeadlessPage} from '../helpers/APIHelpers';
import {fetchUserAgentToken} from '../helpers/fetchUserAgentToken';

const ACCOUNT_ERC = 'ACCNT-016';

const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;

const ERC_PREFIX = 'TEST_LICENSE_KEY_GENERATION_';

const PROJECT_ERC = 'PRJCT-016';

const SERVER_HOST_NAME = 'license-key-generation.example.com';

const DEFINITION_ERCS: Record<string, string> = {
	'backup': 'C_ENT_DEF_DXP_BACKUP',
	'complimentary': 'C_ENT_DEF_DXP_COMPLIMENTARY',
	'developer': 'C_ENT_DEF_DXP_DEVELOPER',
	'developer-cluster': 'C_ENT_DEF_DXP_DEVELOPER_CLUSTER',
	'enterprise': `${ERC_PREFIX}DEF_ENTERPRISE`,
	'free': 'C_ENT_DEF_DXP_FREE',
	'non-production': 'C_ENT_DEF_DXP_NON_PRODUCTION',
	'oem': `${ERC_PREFIX}DEF_OEM`,
	'production': 'C_ENT_DEF_DXP_PRODUCTION',
};

const SERVER_KEY_TYPES = [
	{keyType: 'backup', licenseName: 'DXP Backup', licenseType: 'production'},
	{
		keyType: 'non-production',
		licenseName: 'DXP Non-Production',
		licenseType: 'production',
	},
	{
		keyType: 'production',
		licenseName: 'DXP Production',
		licenseType: 'production',
	},
];

const SERVERLESS_KEY_TYPES = [
	{
		keyType: 'enterprise',
		licenseName: 'DXP Unlimited Enterprise-Wide',
		serverId: 'Enterprise',
	},
	{keyType: 'oem', licenseName: 'DXP OEM', serverId: 'OEM'},
];

const TEST_DEFINITION_KEY_TYPES = ['enterprise', 'oem'];

interface IActivationKey {
	endDate: string;
	startDate: string;
	type: string;
}

interface ILicenseKey {
	accountName: string;
	additionalInfo: string;
	complimentary: boolean;
	customExpirationDate: string;
	description: string;
	domains: string;
	entitlementId: number;
	hostName: string;
	id: number;
	licenseName: string;
	licenseType: string;
	licenseVersion: number;
	maxClusterNodes: number;
	owner: string;
	serverId: string;
	sizing: string;
	startDate: string;
}

const activationKeyIds: number[] = [];
const entitlementIds: Record<string, number> = {};

let admin: APIHelpers;
let originalAllowComplimentary: unknown;
let token: string;
let version: string;

function getDurationDays(endDate: string, startDate: string): number {
	return Math.round(
		(Date.parse(endDate) - Date.parse(startDate)) / DAY_MILLISECONDS
	);
}

function getEntitlementERC(name: string): string {
	return `${ERC_PREFIX}${name.toUpperCase().replace(/-/g, '_')}`;
}

async function addFreeAccountActivationKey(): Promise<{
	activationKeyId: number;
	externalReferenceCode: string;
}> {
	const endDate = new Date(Date.now() + 365 * DAY_MILLISECONDS).toISOString();
	const startDate = new Date().toISOString();

	const activationKeyResponse = await admin.send(
		'post',
		'/o/c/activationkeys',
		{
			active: true,
			endDate,
			r_accountEntryToActivationKey_accountEntryERC: ACCOUNT_ERC,
			startDate,
			type: 'free',
		}
	);

	expect(
		activationKeyResponse.ok(),
		await activationKeyResponse.text()
	).toBeTruthy();

	const {externalReferenceCode, id: activationKeyId} =
		(await activationKeyResponse.json()) as {
			externalReferenceCode: string;
			id: number;
		};

	activationKeyIds.push(activationKeyId);

	const licenseKeyResponse = await admin.send('post', '/o/c/licensekeys', {
		active: true,
		customExpirationDate: endDate,
		domains: `${SERVER_HOST_NAME},localhost`,
		entitlementId: entitlementIds['account-free'],
		licenseType: 'free',
		owner: DEFAULT_ADMIN_EMAIL,
		r_accountEntryToLicenseKey_accountEntryERC: ACCOUNT_ERC,
		r_activationKeyToLicenseKey_c_activationKeyId: activationKeyId,
		startDate,
	});

	expect(
		licenseKeyResponse.ok(),
		await licenseKeyResponse.text()
	).toBeTruthy();

	return {activationKeyId, externalReferenceCode};
}

async function generate(body: Record<string, unknown>): Promise<APIResponse> {
	const response = await sendAsUser(
		'post',
		'/activation-keys/generate',
		body
	);

	if (response.ok()) {
		const {activationKeyId} = (await response.json()) as {
			activationKeyId: number;
		};

		activationKeyIds.push(activationKeyId);
	}

	return response;
}

async function generateActivationKey(
	body: Record<string, unknown>
): Promise<number> {
	const response = await generate(body);

	expect(response.status(), await response.text()).toBe(200);

	return activationKeyIds[activationKeyIds.length - 1];
}

async function getActivationKeyXML(activationKeyId: number): Promise<string> {
	const response = await sendAsUser(
		'get',
		`/activation-keys/${activationKeyId}/download`
	);

	expect(response.status(), await response.text()).toBe(200);

	return response.text();
}

async function getLicenseKeys(activationKeyId: number): Promise<ILicenseKey[]> {
	const {items} = await admin.get<HeadlessPage<ILicenseKey>>(
		`/o/c/licensekeys?filter=${encodeURIComponent(
			`r_activationKeyToLicenseKey_c_activationKeyId eq '${activationKeyId}'`
		)}`
	);

	return items;
}

function sendAsUser(
	method: 'get' | 'post',
	path: string,
	body?: unknown
): Promise<APIResponse> {
	return admin.request[method](admin.springBoot(path), {
		data: body,
		headers: {
			'Authorization': `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
	});
}

async function setAllowComplimentary(value: unknown): Promise<void> {
	const response = await admin.send(
		'patch',
		`/o/headless-admin-user/v1.0/accounts/by-external-reference-code/${ACCOUNT_ERC}`,
		{
			customFields: [
				{customValue: {data: value}, name: 'allowComplimentary'},
			],
		}
	);

	expect(response.ok(), await response.text()).toBeTruthy();
}

function toGenerateRequest(
	entitlementName: string,
	overrides: Record<string, unknown> = {}
): Record<string, unknown> {
	const entitlementId = entitlementIds[entitlementName];

	return {
		bundleEntitlementIds: [entitlementId],
		environmentName: `License Key Generation ${entitlementName}`,
		keyType: entitlementName,
		projectExternalReferenceCode: PROJECT_ERC,
		servers: [{hostName: SERVER_HOST_NAME}],
		subscriptionEntitlementId: entitlementId,
		version,
		...overrides,
	};
}

async function upsertEntitlement(
	name: string,
	keyType: string,
	quantity: number,
	projectExternalReferenceCode: string = PROJECT_ERC
): Promise<void> {
	const startDate = new Date();

	const response = await admin.send(
		'put',
		`/o/c/entitlements/by-external-reference-code/${getEntitlementERC(name)}`,
		{
			endDate: new Date(
				startDate.getTime() + 365 * DAY_MILLISECONDS
			).toISOString(),
			grantType: 'fixed',
			maxQuantity: quantity,
			name: 'licenseGeneration',
			quantity,
			r_accountEntryToEntitlement_accountEntryERC: ACCOUNT_ERC,
			r_entitlementDefinitionToEntitlement_c_entitlementDefinitionERC:
				DEFINITION_ERCS[keyType],
			r_projectToEntitlement_c_projectERC: projectExternalReferenceCode,
			skuExternalReferenceCode: 'marketplace-product-32654011-default',
			startDate: startDate.toISOString(),
		}
	);

	expect(response.ok(), await response.text()).toBeTruthy();

	const {id} = (await response.json()) as {id: number};

	entitlementIds[name] = id;
}

test.describe('[FLOW-LICENSE-GENERATION] license key generation for each key type', () => {
	test.describe.configure({mode: 'serial'});

	test.beforeAll(async ({playwright}) => {
		admin = new APIHelpers(await playwright.request.newContext(), {
			basicAuth: {
				password: DEFAULT_ADMIN_PASSWORD,
				user: DEFAULT_ADMIN_EMAIL,
			},
		});

		token = await fetchUserAgentToken(
			await playwright.request.newContext(),
			{
				baseURL: admin.baseURL,
				password: DEFAULT_ADMIN_PASSWORD,
				user: DEFAULT_ADMIN_EMAIL,
			}
		);

		for (const keyType of TEST_DEFINITION_KEY_TYPES) {
			const response = await admin.send(
				'put',
				`/o/c/entitlementdefinitions/by-external-reference-code/${DEFINITION_ERCS[keyType]}`,
				{
					active: true,
					defaultQuantity: 3,
					displayName: `License Key Generation ${keyType}`,
					generatesActivationKey: true,
					grantType: 'fixed',
					licenseKeyFamily: 'DXP',
					licenseKeyType: keyType,
					maxQuantity: 3,
					name: 'licenseGeneration',
				}
			);

			expect(response.ok(), await response.text()).toBeTruthy();
		}

		for (const keyType of Object.keys(DEFINITION_ERCS)) {
			await upsertEntitlement(keyType, keyType, 3);
		}

		await upsertEntitlement('account-free', 'free', 1, '');
		await upsertEntitlement('production-single', 'production', 1);

		const account = await admin.get<{
			customFields: {customValue: {data: unknown}; name: string}[];
		}>(
			`/o/headless-admin-user/v1.0/accounts/by-external-reference-code/${ACCOUNT_ERC}`
		);

		originalAllowComplimentary =
			account.customFields.find(
				(customField) => customField.name === 'allowComplimentary'
			)?.customValue.data ?? false;

		await setAllowComplimentary(true);

		const generateFormResponse = await sendAsUser(
			'get',
			`/activation-keys/generate-form?projectExternalReferenceCode=${PROJECT_ERC}`
		);

		expect(
			generateFormResponse.status(),
			await generateFormResponse.text()
		).toBe(200);

		const {products} = (await generateFormResponse.json()) as {
			products: {licenseKeyFamily: string; versions: string[]}[];
		};

		version = products.find(
			(product) => product.licenseKeyFamily === 'DXP'
		)!.versions[0];
	});

	test.afterAll(async () => {
		for (const activationKeyId of activationKeyIds) {
			for (const licenseKey of await getLicenseKeys(activationKeyId)) {
				await admin.send('delete', `/o/c/licensekeys/${licenseKey.id}`);
			}

			await admin.send(
				'delete',
				`/o/c/activationkeys/${activationKeyId}`
			);
		}

		for (const name of [
			...Object.keys(DEFINITION_ERCS),
			'account-free',
			'production-single',
		]) {
			await admin.send(
				'delete',
				`/o/c/entitlements/by-external-reference-code/${getEntitlementERC(name)}`
			);
		}

		for (const keyType of TEST_DEFINITION_KEY_TYPES) {
			await admin.send(
				'delete',
				`/o/c/entitlementdefinitions/by-external-reference-code/${DEFINITION_ERCS[keyType]}`
			);
		}

		await setAllowComplimentary(originalAllowComplimentary);
	});

	for (const {keyType, licenseName, licenseType} of SERVER_KEY_TYPES) {
		test(`[FLOW-LICENSE-GENERATION] [REST-POST-ACTIVATION-KEYS-GENERATE] generates a ${keyType} key for one server`, async () => {
			const activationKeyId = await generateActivationKey(
				toGenerateRequest(keyType)
			);

			const activationKey = await admin.get<IActivationKey>(
				`/o/c/activationkeys/${activationKeyId}`
			);

			expect(activationKey.type).toBe(keyType);

			const licenseKeys = await getLicenseKeys(activationKeyId);

			expect(licenseKeys).toHaveLength(1);

			const [licenseKey] = licenseKeys;

			expect(licenseKey.entitlementId).toBe(entitlementIds[keyType]);
			expect(licenseKey.hostName).toBe(SERVER_HOST_NAME);
			expect(licenseKey.licenseName).toBe(licenseName);
			expect(licenseKey.licenseType).toBe(licenseType);

			expect(await getActivationKeyXML(activationKeyId)).toContain(
				`<license-type>${licenseType}</license-type>`
			);
		});
	}

	for (const {keyType, licenseName, serverId} of SERVERLESS_KEY_TYPES) {
		test(`[FLOW-LICENSE-GENERATION] generates a ${keyType} key with no server`, async () => {
			const activationKeyId = await generateActivationKey(
				toGenerateRequest(keyType, {servers: []})
			);

			const licenseKeys = await getLicenseKeys(activationKeyId);

			expect(licenseKeys).toHaveLength(1);

			const [licenseKey] = licenseKeys;

			expect(licenseKey.entitlementId).toBe(entitlementIds[keyType]);
			expect(licenseKey.hostName ?? '').toBe('');
			expect(licenseKey.licenseName).toBe(licenseName);
			expect(licenseKey.licenseType).toBe(keyType);
			expect(licenseKey.serverId).toBe(serverId);

			const activationKeyXML = await getActivationKeyXML(activationKeyId);

			expect(activationKeyXML).toContain(
				`<license-type>${keyType}</license-type>`
			);
			expect(activationKeyXML).not.toContain('<host-name>');
		});
	}

	for (const {keyType, licenseName} of SERVER_KEY_TYPES.filter(
		({licenseType}) => licenseType === 'production'
	)) {
		test(`[FLOW-LICENSE-GENERATION] generates a ${keyType} key as a virtual cluster`, async () => {
			const activationKeyId = await generateActivationKey(
				toGenerateRequest(keyType, {
					maxClusterNodes: 2,
					servers: [],
					virtualCluster: true,
				})
			);

			const activationKey = await admin.get<IActivationKey>(
				`/o/c/activationkeys/${activationKeyId}`
			);

			expect(activationKey.type).toBe('virtual-cluster');

			const [licenseKey] = await getLicenseKeys(activationKeyId);

			expect(licenseKey.licenseName).toBe(
				`${licenseName} (Virtual Cluster)`
			);
			expect(licenseKey.licenseType).toBe('virtual-cluster');
			expect(licenseKey.maxClusterNodes).toBe(2);
		});
	}

	test('[FLOW-LICENSE-GENERATION] generates a free key that matches the legacy key', async () => {
		const activationKeyId = await generateActivationKey(
			toGenerateRequest('free', {domains: SERVER_HOST_NAME, servers: []})
		);

		const activationKey = await admin.get<IActivationKey>(
			`/o/c/activationkeys/${activationKeyId}`
		);

		expect(activationKey.type).toBe('free');

		const licenseKeys = await getLicenseKeys(activationKeyId);

		expect(licenseKeys).toHaveLength(1);

		const [licenseKey] = licenseKeys;

		expect(licenseKey.accountName).toBe('Liferay Free Activation Key');
		expect(licenseKey.description).toBe('Liferay Free Activation Key');
		expect(licenseKey.domains).toBe(`${SERVER_HOST_NAME},localhost`);
		expect(licenseKey.licenseName).toBe('DXP Production');
		expect(licenseKey.licenseType).toBe('free');
		expect(licenseKey.licenseVersion).toBe(6);
		expect(licenseKey.maxClusterNodes).toBe(3);
		expect(licenseKey.owner).toBe(DEFAULT_ADMIN_EMAIL);
		expect(licenseKey.sizing).toBe('Sizing 4');
		expect(
			getDurationDays(
				licenseKey.customExpirationDate,
				licenseKey.startDate
			)
		).toBe(365);

		expect(await getActivationKeyXML(activationKeyId)).toContain(
			'<domain>localhost</domain>'
		);
	});

	test('[FLOW-LICENSE-GENERATION] generates a complimentary key for 30 days', async () => {
		const activationKeyId = await generateActivationKey(
			toGenerateRequest('complimentary', {
				bundleEntitlementIds: [],
				purpose: 'Load testing',
			})
		);

		const [licenseKey] = await getLicenseKeys(activationKeyId);

		expect(licenseKey.additionalInfo).toContain('Load testing');
		expect(licenseKey.complimentary).toBe(true);
		expect(licenseKey.licenseName).toBe('DXP Production');
		expect(licenseKey.sizing).toBe('Sizing 4');
		expect(
			getDurationDays(
				licenseKey.customExpirationDate,
				licenseKey.startDate
			)
		).toBe(30);
	});

	test('[FLOW-LICENSE-GENERATION] refuses a second complimentary key while one is active', async () => {
		const response = await generate(
			toGenerateRequest('complimentary', {
				bundleEntitlementIds: [],
				purpose: 'Load testing',
			})
		);

		expect(response.status()).toBe(409);
		expect(await response.text()).toContain(
			'already has a complimentary key'
		);
	});

	for (const {keyType, licenseName} of [
		{keyType: 'developer', licenseName: 'DXP Development'},
		{
			keyType: 'developer-cluster',
			licenseName: 'DXP Development (Cluster)',
		},
	]) {
		test(`[FLOW-LICENSE-GENERATION] downloads a ${keyType} key`, async () => {
			const response = await sendAsUser(
				'get',
				`/license-keys/developer-download?${new URLSearchParams({
					bundleEntitlementIds: String(entitlementIds[keyType]),
					keyType,
					productName: 'Liferay DXP',
					projectExternalReferenceCode: PROJECT_ERC,
					version,
				})}`
			);

			expect(response.status(), await response.text()).toBe(200);

			const xml = await response.text();

			expect(xml).toContain(
				`<license-name>${licenseName}</license-name>`
			);
			expect(xml).toContain(`<license-type>${keyType}</license-type>`);
		});
	}

	test('[FLOW-LICENSE-GENERATION] refuses a key type that the entitlement does not grant', async () => {
		const freeResponse = await generate(
			toGenerateRequest('production', {
				domains: SERVER_HOST_NAME,
				keyType: 'free',
				servers: [],
			})
		);

		expect(freeResponse.status()).toBe(409);
		expect(await freeResponse.text()).toContain(
			'The selected entitlement does not grant a free key'
		);

		const productionResponse = await generate(
			toGenerateRequest('non-production', {keyType: 'production'})
		);

		expect(productionResponse.status()).toBe(409);
		expect(await productionResponse.text()).toContain(
			'The selected entitlement does not grant a production key'
		);
	});

	test('[FLOW-LICENSE-GENERATION] refuses a free key without a domain', async () => {
		const response = await generate(
			toGenerateRequest('free', {servers: []})
		);

		expect(response.status()).toBe(400);
		expect(await response.text()).toContain(
			'No domain was given for the free key'
		);
	});

	test('[FLOW-LICENSE-GENERATION] refuses a server key without a server', async () => {
		const response = await generate(
			toGenerateRequest('production', {servers: []})
		);

		expect(response.status()).toBe(409);
		expect(await response.text()).toContain(
			'No server was given for the activation keys'
		);
	});

	test('[FLOW-LICENSE-GENERATION] refuses a key when the entitlement has no activations left', async () => {
		const request = toGenerateRequest('production-single', {
			keyType: 'production',
		});

		await generateActivationKey(request);

		const response = await generate(request);

		expect(response.status()).toBe(409);
		expect(await response.text()).toContain('0 activations left');
	});

	test('[FLOW-LICENSE-GENERATION] renews a free key on an account from 90 days before it expires, and generates no other free key there', async () => {
		const request = {
			accountExternalReferenceCode: ACCOUNT_ERC,
			bundleEntitlementIds: [entitlementIds['account-free']],
			domains: SERVER_HOST_NAME,
			environmentName: 'Liferay Free Activation Key',
			keyType: 'free',
			servers: [],
			subscriptionEntitlementId: entitlementIds['account-free'],
			version,
		};

		const newKeyResponse = await generate(request);

		expect(newKeyResponse.status()).toBe(409);
		expect(await newKeyResponse.text()).toContain(
			'A free key with no project can only be renewed'
		);

		const {activationKeyId, externalReferenceCode} =
			await addFreeAccountActivationKey();

		const renewalRequest = {
			...request,
			domains: 'other.example.com',
			renewedActivationKeyExternalReferenceCode: externalReferenceCode,
		};

		const earlyResponse = await generate(renewalRequest);

		expect(earlyResponse.status()).toBe(409);
		expect(await earlyResponse.text()).toContain(
			'A free key is renewed from 90 days before it expires'
		);

		const patchResponse = await admin.send(
			'patch',
			`/o/c/activationkeys/${activationKeyId}`,
			{
				endDate: new Date(
					Date.now() + 30 * DAY_MILLISECONDS
				).toISOString(),
			}
		);

		expect(patchResponse.ok(), await patchResponse.text()).toBeTruthy();

		const renewedActivationKeyId =
			await generateActivationKey(renewalRequest);

		const activationKey = await admin.get<{active: boolean}>(
			`/o/c/activationkeys/${activationKeyId}`
		);

		expect(activationKey.active).toBe(false);

		const [licenseKey] = await getLicenseKeys(renewedActivationKeyId);

		expect(licenseKey.domains).toBe(`${SERVER_HOST_NAME},localhost`);
		expect(licenseKey.entitlementId).toBe(entitlementIds['account-free']);
		expect(licenseKey.owner).toBe(DEFAULT_ADMIN_EMAIL);
		expect(
			getDurationDays(
				licenseKey.customExpirationDate,
				licenseKey.startDate
			)
		).toBe(365);
	});
});
