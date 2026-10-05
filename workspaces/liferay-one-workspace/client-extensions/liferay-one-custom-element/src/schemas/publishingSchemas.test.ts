/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import publishingSchemas from './publishingSchemas';

const {appPublishing, solutionPublishing} = publishingSchemas;

const appProfile = {
	areas: ['commerce'],
	categories: {label: 'Utility', value: 'utility'},
	description: 'An app',
	name: 'App',
	tags: ['tag'],
};

const company = {
	description: '<p>About us</p>',
	email: 'company@liferay.com',
	phone: '5550100',
	website: 'https://liferay.com',
};

const header = {
	contentType: {
		content: {headerImages: [{}]},
		type: 'upload-images',
	},
	description: '<p>Header</p>',
	title: 'Solution',
};

const textBlock = {
	content: {description: '<p>Body</p>', title: 'Title'},
	type: 'text-block',
};

describe('[MOD-SCHEMAS-PUBLISHINGSCHEMAS] publishingSchemas', () => {
	it('app profile needs a name and description of 3 or more and non empty areas and tags', () => {
		const schema = appPublishing.profile;

		expect(schema.safeParse(appProfile).success).toBe(true);
		expect(schema.safeParse({...appProfile, name: 'Ap'}).success).toBe(
			false
		);
		expect(
			schema.safeParse({...appProfile, description: 'An'}).success
		).toBe(false);
		expect(schema.safeParse({...appProfile, areas: []}).success).toBe(
			false
		);
		expect(schema.safeParse({...appProfile, tags: []}).success).toBe(false);
		expect(
			schema.safeParse({
				...appProfile,
				categories: {label: 'Utility', value: ''},
			}).success
		).toBe(false);
	});

	it('app build needs at least one package with a file and a version', () => {
		const schema = appPublishing.build;

		expect(
			schema.safeParse({
				appType: 'osgi',
				liferayPackages: [{file: [{}], versions: ['7.4']}],
			}).success
		).toBe(true);
		expect(
			schema.safeParse({appType: 'osgi', liferayPackages: []}).success
		).toBe(false);
		expect(
			schema.safeParse({
				appType: 'osgi',
				liferayPackages: [{file: [], versions: ['7.4']}],
			}).success
		).toBe(false);
		expect(
			schema.safeParse({
				appType: 'osgi',
				liferayPackages: [{file: [{}], versions: []}],
			}).success
		).toBe(false);
	});

	it('app storefront allows 1 to 10 images', () => {
		const schema = appPublishing.storefront;

		expect(schema.safeParse({images: [{}]}).success).toBe(true);
		expect(
			schema.safeParse({images: Array.from({length: 10}, () => ({}))})
				.success
		).toBe(true);
		expect(schema.safeParse({images: []}).success).toBe(false);
		expect(
			schema.safeParse({images: Array.from({length: 11}, () => ({}))})
				.success
		).toBe(false);
	});

	it('app version and terms require a version and accepted terms', () => {
		expect(appPublishing.version.safeParse({version: ''}).success).toBe(
			false
		);
		expect(appPublishing.version.safeParse({version: '1.0'}).success).toBe(
			true
		);
		expect(appPublishing.termsAndConditions.safeParse(false).success).toBe(
			false
		);
	});

	it('solution details need at least 2 blocks of the three typed content shapes', () => {
		const schema = solutionPublishing.details;

		expect(schema.safeParse([textBlock]).success).toBe(false);
		expect(
			schema.safeParse([
				textBlock,
				{
					content: {
						description: '<p>Body</p>',
						files: [{}],
						title: 'Images',
					},
					type: 'text-images-block',
				},
				{
					content: {
						description: '<p>Body</p>',
						title: 'Video',
						videoUrl: 'https://youtu.be/x',
					},
					type: 'text-video-block',
				},
			]).success
		).toBe(true);
		expect(
			schema.safeParse([textBlock, {...textBlock, type: 'unknown-block'}])
				.success
		).toBe(false);
		expect(
			schema.safeParse([
				textBlock,
				{...textBlock, content: {description: '', title: 'Title'}},
			]).success
		).toBe(false);
	});

	it('solution company description must be non empty after HTML tags are removed', () => {
		const schema = solutionPublishing.company;

		expect(schema.safeParse(company).success).toBe(true);
		expect(
			schema.safeParse({...company, description: '<p></p>'}).success
		).toBe(false);
		expect(schema.safeParse({...company, email: 'company'}).success).toBe(
			false
		);
	});

	it('solution header description must be non empty after HTML tags are removed', () => {
		const schema = solutionPublishing.header;

		expect(schema.safeParse(header).success).toBe(true);
		expect(
			schema.safeParse({...header, description: '<br/>'}).success
		).toBe(false);
		expect(
			schema.safeParse({
				...header,
				contentType: {
					content: {headerVideoUrl: 'https://youtu.be/x'},
					type: 'embed-video-url',
				},
			}).success
		).toBe(true);
		expect(
			schema.safeParse({
				...header,
				contentType: {
					content: {headerImages: []},
					type: 'upload-images',
				},
			}).success
		).toBe(false);
	});

	it('solution profile needs categories, tags, and names of 3 or more', () => {
		const schema = solutionPublishing.profile;
		const profile = {
			categories: ['c'],
			description: 'A solution',
			name: 'Sol',
			tags: ['t'],
		};

		expect(schema.safeParse(profile).success).toBe(true);
		expect(schema.safeParse({...profile, categories: []}).success).toBe(
			false
		);
		expect(schema.safeParse({...profile, name: 'So'}).success).toBe(false);
	});

	it('becomePublisherForm requires names, phone, description, and at least one publisher type', () => {
		const schema = publishingSchemas.becomePublisherForm;
		const form = {
			emailAddress: 'jane@liferay.com',
			firstName: 'J',
			lastName: 'D',
			phoneNumber: '5550100',
			publisherType: ['app'],
			requestDescription: 'Please',
		};

		expect(schema.safeParse(form).success).toBe(true);
		expect(schema.safeParse({...form, publisherType: []}).success).toBe(
			false
		);
		expect(schema.safeParse({...form, firstName: ''}).success).toBe(false);
		expect(schema.safeParse({...form, emailAddress: 'jane'}).success).toBe(
			false
		);
	});
});
