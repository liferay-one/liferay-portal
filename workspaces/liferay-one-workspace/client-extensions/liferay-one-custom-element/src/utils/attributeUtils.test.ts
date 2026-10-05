/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {baseAttributes, getAttributes} from './attributeUtils';

function createElement(attributes: Record<string, string>) {
	const element = document.createElement('div');

	for (const [key, value] of Object.entries(attributes)) {
		element.setAttribute(key, value);
	}

	return element;
}

describe('[MOD-ATTRIBUTEUTILS] attributeUtils', () => {
	it('defaults every base attribute and kpi attribute to an empty string', () => {
		const attributes = getAttributes(createElement({}));

		for (const key of baseAttributes) {
			if (
				key === 'featureFlags' ||
				key === 'featurePreview' ||
				key === 'useSiteTaxonomyVocabularyQuery'
			) {
				continue;
			}

			expect(attributes[key]).toBe('');
		}

		expect(attributes.featureFlags).toEqual([]);
		expect(attributes.featurePreview).toEqual([]);
		expect(attributes.kpi).toEqual({
			kpiConnectorQuartelyRelease: '',
			kpiLowCodePublishedApps: '',
			kpiPartnershipIntegration: '',
			kpiProjectUsingMarketplaceApps: '',
			kpiQuartelyReleaseApps: '',
		});
		expect(attributes.useSiteTaxonomyVocabularyQuery).toBe(false);
	});

	it('reads the base attributes and the kpi attributes', () => {
		const attributes = getAttributes(
			createElement({
				accountId: '42',
				kpiLowCodePublishedApps: '7',
				ssaAccountExternalReferenceCode: 'SSA_ERC',
			})
		);

		expect(attributes.accountId).toBe('42');
		expect(attributes.kpi.kpiLowCodePublishedApps).toBe('7');
		expect(attributes.ssaAccountExternalReferenceCode).toBe('SSA_ERC');
	});

	it('splits featureFlags and featurePreview on commas, trimming and dropping empties', () => {
		const attributes = getAttributes(
			createElement({
				featureFlags: ' LPD-1, ,LPD-2 ,',
				featurePreview: 'preview-a,,preview-b',
			})
		);

		expect(attributes.featureFlags).toEqual(['LPD-1', 'LPD-2']);
		expect(attributes.featurePreview).toEqual(['preview-a', 'preview-b']);
	});

	it('reads the jira attributes by their dashed names', () => {
		const attributes = getAttributes(
			createElement({
				'jira-fls-portal-url': 'https://fls.example.com',
				'jira-fls-project': 'FLS',
				'jira-hc-portal-url': 'https://hc.example.com',
			})
		);

		expect(attributes.jiraFLSPortalURL).toBe('https://fls.example.com');
		expect(attributes.jiraFLSProject).toBe('FLS');
		expect(attributes.jiraHCPortalURL).toBe('https://hc.example.com');
	});

	it('parses useSiteTaxonomyVocabularyQuery as true only for the string true', () => {
		expect(
			getAttributes(
				createElement({useSiteTaxonomyVocabularyQuery: 'true'})
			).useSiteTaxonomyVocabularyQuery
		).toBe(true);
		expect(
			getAttributes(
				createElement({useSiteTaxonomyVocabularyQuery: 'TRUE'})
			).useSiteTaxonomyVocabularyQuery
		).toBe(false);
		expect(
			getAttributes(createElement({useSiteTaxonomyVocabularyQuery: '1'}))
				.useSiteTaxonomyVocabularyQuery
		).toBe(false);
	});
});
