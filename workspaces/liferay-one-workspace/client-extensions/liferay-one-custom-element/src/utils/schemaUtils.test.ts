/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {
	blocksContentSchemas,
	checkRegExp,
	domainRegex,
	dsrLicenseKeyBaseSchema,
	freeApp,
	ipv4Regex,
	macAddressRegex,
	paidApp,
	requiredDate,
	requiredTimeInput,
} from './schemaUtils';

const emptyURLs = {
	appUsageTermsURL: '',
	documentationURL: '',
	installationGuideURL: '',
	url: '',
};

describe('[MOD-SCHEMAUTILS] schemaUtils', () => {
	it('domainRegex accepts dotted domains and rejects bare hosts and schemes', () => {
		expect(domainRegex.test('liferay.com')).toBe(true);
		expect(domainRegex.test('sub.liferay.co.uk')).toBe(true);
		expect(domainRegex.test('my_host-1.io')).toBe(true);
		expect(domainRegex.test('liferay')).toBe(false);
		expect(domainRegex.test('liferay.c')).toBe(false);
		expect(domainRegex.test('https://liferay.com')).toBe(false);
	});

	it('ipv4Regex accepts the 0 to 255 range per octet only', () => {
		expect(ipv4Regex.test('0.0.0.0')).toBe(true);
		expect(ipv4Regex.test('255.255.255.255')).toBe(true);
		expect(ipv4Regex.test('192.168.1.10')).toBe(true);
		expect(ipv4Regex.test('256.1.1.1')).toBe(false);
		expect(ipv4Regex.test('1.1.1')).toBe(false);
		expect(ipv4Regex.test('1.1.1.1.1')).toBe(false);
	});

	it('macAddressRegex accepts colon or dash separated hex pairs', () => {
		expect(macAddressRegex.test('00:1A:2b:3C:4d:5E')).toBe(true);
		expect(macAddressRegex.test('00-1A-2B-3C-4D-5E')).toBe(true);
		expect(macAddressRegex.test('00:1A:2B:3C:4D')).toBe(false);
		expect(macAddressRegex.test('00:1A:2B:3C:4D:ZZ')).toBe(false);
	});

	it('checkRegExp accepts empty input and validates each non empty trimmed line', () => {
		expect(checkRegExp(ipv4Regex, '')).toBe(true);
		expect(checkRegExp(ipv4Regex, '10.0.0.1\n\n  10.0.0.2  ')).toBe(true);
		expect(checkRegExp(ipv4Regex, '10.0.0.1\nbad')).toBe(false);
	});

	it('dsrLicenseKeyBaseSchema validates ip and mac lines and requires accepted terms', () => {
		expect(
			dsrLicenseKeyBaseSchema.ipAddress.safeParse('10.0.0.1\n10.0.0.2')
				.success
		).toBe(true);
		expect(
			dsrLicenseKeyBaseSchema.ipAddress.safeParse('999.0.0.1').success
		).toBe(false);
		expect(
			dsrLicenseKeyBaseSchema.ipAddress.safeParse(undefined).success
		).toBe(true);
		expect(
			dsrLicenseKeyBaseSchema.macAddress.safeParse('00:1A:2B:3C:4D')
				.success
		).toBe(false);
		expect(
			dsrLicenseKeyBaseSchema.acceptTermsAndConditions.safeParse(false)
				.success
		).toBe(false);
	});

	it('paidApp requires an email, a phone of 8 or more characters, and a URL', () => {
		const base = {
			...emptyURLs,
			email: 'publisher@liferay.com',
			phone: '12345678',
			publisherWebsiteURL: 'https://liferay.com',
		};

		expect(paidApp.safeParse(base).success).toBe(true);
		expect(paidApp.safeParse({...base, email: ''}).success).toBe(false);
		expect(paidApp.safeParse({...base, phone: '1234567'}).success).toBe(
			false
		);
		expect(
			paidApp.safeParse({...base, publisherWebsiteURL: ''}).success
		).toBe(false);
	});

	it('paidApp keeps an http URL and prefixes https on other schemes', () => {
		const base = {
			...emptyURLs,
			email: 'publisher@liferay.com',
			phone: '12345678',
		};

		const httpResult = paidApp.safeParse({
			...base,
			publisherWebsiteURL: 'http://liferay.com',
		});
		const ftpResult = paidApp.safeParse({
			...base,
			publisherWebsiteURL: 'ftp://liferay.com',
		});

		expect(httpResult.success && httpResult.data.publisherWebsiteURL).toBe(
			'http://liferay.com'
		);
		expect(ftpResult.success && ftpResult.data.publisherWebsiteURL).toBe(
			'https://ftp://liferay.com'
		);
	});

	it('freeApp allows blanks but still validates filled values', () => {
		const blank = {
			...emptyURLs,
			email: '',
			phone: '',
			publisherWebsiteURL: '',
		};

		expect(freeApp.safeParse(blank).success).toBe(true);
		expect(freeApp.safeParse({...blank, email: 'nope'}).success).toBe(
			false
		);
		expect(freeApp.safeParse({...blank, phone: '123'}).success).toBe(false);
		expect(freeApp.safeParse({...blank, url: 'not a url'}).success).toBe(
			false
		);
	});

	it('requiredDate rejects empty and unparsable values', () => {
		expect(requiredDate.safeParse('2026-03-15').success).toBe(true);
		expect(requiredDate.safeParse('').success).toBe(false);
		expect(requiredDate.safeParse('not a date').success).toBe(false);
	});

	it('requiredTimeInput rejects the dashes placeholder in hours or minutes', () => {
		expect(
			requiredTimeInput.safeParse({hours: '10', minutes: '30'}).success
		).toBe(true);
		expect(
			requiredTimeInput.safeParse({hours: '--', minutes: '30'}).success
		).toBe(false);
		expect(
			requiredTimeInput.safeParse({hours: '10', minutes: '--'}).success
		).toBe(false);
	});

	it('blocksContentSchemas require a title, a description, and files or a video URL', () => {
		const text = {description: '<p>Body</p>', title: 'Title'};

		expect(blocksContentSchemas.textBlock.safeParse(text).success).toBe(
			true
		);
		expect(
			blocksContentSchemas.textBlock.safeParse({...text, title: ''})
				.success
		).toBe(false);
		expect(
			blocksContentSchemas.textBlock.safeParse({
				...text,
				description: '<p></p>',
			}).success
		).toBe(false);
		expect(
			blocksContentSchemas.textImages.safeParse({...text, files: []})
				.success
		).toBe(false);
		expect(
			blocksContentSchemas.textImages.safeParse({...text, files: [{}]})
				.success
		).toBe(true);
		expect(
			blocksContentSchemas.textVideo.safeParse({...text, videoUrl: ''})
				.success
		).toBe(false);
		expect(
			blocksContentSchemas.textVideo.safeParse({
				...text,
				videoUrl: 'https://youtu.be/x',
			}).success
		).toBe(true);
	});
});
