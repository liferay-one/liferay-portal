/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {parseSolutionDetail} from './parseSolutionDetail';

import type {Product} from '~/types/product';

function toProduct(product: Record<string, unknown>) {
	return product as unknown as Product;
}

function toSpecifications(specifications: Record<string, string>) {
	return Object.entries(specifications).map(([specificationKey, value]) => ({
		specificationKey,
		value: {en_US: value},
	}));
}

const detailImages = [
	{
		externalReferenceCode: 'IMAGE_A',
		src: '/images/a.png',
		tags: ['solution-details'],
		title: {en_US: 'Image A'},
	},
	{
		externalReferenceCode: 'IMAGE_B',
		src: '/images/b.png',
		tags: ['solution-details'],
		title: {en_US: 'Image B'},
	},
];

const headerImage = {
	externalReferenceCode: 'HEADER',
	src: '/images/header.png',
	tags: ['solution-header'],
	title: {en_US: 'Header'},
};

describe('[MOD-ADMIN-SOLUTIONS-SOLUTIONDETAIL-PARSESOLUTIONDETAIL] parseSolutionDetail', () => {
	it('defaults every missing text to an empty string', () => {
		expect(parseSolutionDetail(toProduct({}))).toEqual({
			categories: [],
			company: undefined,
			contactEmail: '',
			description: '',
			details: [],
			header: {
				description: '',
				images: [],
				title: '',
				videoDescription: undefined,
				videoURL: undefined,
			},
			name: '',
			tags: [],
		});
	});

	it('reads the specifications into the header, contact, and text fields', () => {
		const solutionDetail = parseSolutionDetail(
			toProduct({
				description: {en_US: 'Solution description'},
				images: [headerImage, ...detailImages],
				name: {en_US: 'Solution'},
				productSpecifications: toSpecifications({
					'solution-contact-email': 'contact@liferay.com',
					'solution-header-description': 'Header description',
					'solution-header-title': 'Header title',
				}),
			})
		);

		expect(solutionDetail.contactEmail).toBe('contact@liferay.com');
		expect(solutionDetail.description).toBe('Solution description');
		expect(solutionDetail.name).toBe('Solution');
		expect(solutionDetail.header).toEqual({
			description: 'Header description',
			images: [
				{
					description: 'Header',
					fileName: 'Header',
					preview: '/images/header.png',
				},
			],
			title: 'Header title',
			videoDescription: undefined,
			videoURL: undefined,
		});
	});

	it('drops the header images when a header video URL exists', () => {
		const solutionDetail = parseSolutionDetail(
			toProduct({
				images: [headerImage],
				productSpecifications: toSpecifications({
					'solution-header-video-description': 'Video description',
					'solution-header-video-url': 'https://video.example.com',
				}),
			})
		);

		expect(solutionDetail.header.images).toEqual([]);
		expect(solutionDetail.header.videoDescription).toBe(
			'Video description'
		);
		expect(solutionDetail.header.videoURL).toBe(
			'https://video.example.com'
		);
	});

	it('builds the company only when a company email exists', () => {
		expect(
			parseSolutionDetail(
				toProduct({
					productSpecifications: toSpecifications({
						'solution-company-description': 'Company description',
						'solution-company-phone': '555-0100',
					}),
				})
			).company
		).toBeUndefined();

		expect(
			parseSolutionDetail(
				toProduct({
					productSpecifications: toSpecifications({
						'solution-company-email': 'company@liferay.com',
					}),
				})
			).company
		).toEqual({
			description: '',
			email: 'company@liferay.com',
			phone: '',
			website: '',
		});

		expect(
			parseSolutionDetail(
				toProduct({
					productSpecifications: toSpecifications({
						'solution-company-description': 'Company description',
						'solution-company-email': 'company@liferay.com',
						'solution-company-phone': '555-0100',
						'solution-company-website': 'https://liferay.com',
					}),
				})
			).company
		).toEqual({
			description: 'Company description',
			email: 'company@liferay.com',
			phone: '555-0100',
			website: 'https://liferay.com',
		});
	});

	it('parses the details blocks and resolves image blocks by ERC', () => {
		const blocks = [
			{
				content: {
					description: 'Text description',
					files: ['IMAGE_B', 'MISSING', 'IMAGE_A'],
					title: 'Text title',
				},
				type: 'text-images-block',
			},
			{
				content: {
					videoDescription: 'Video description',
					videoUrl: 'https://video.example.com',
				},
				type: 'text-video-block',
			},
			{type: 'text-block'},
		];

		const solutionDetail = parseSolutionDetail(
			toProduct({
				images: [headerImage, ...detailImages],
				productSpecifications: toSpecifications({
					'solution-details-blocks': JSON.stringify(blocks),
				}),
			})
		);

		expect(solutionDetail.details).toEqual([
			{
				description: 'Text description',
				images: [
					{
						description: 'Image B',
						fileName: 'Image B',
						preview: '/images/b.png',
					},
					{
						description: 'Image A',
						fileName: 'Image A',
						preview: '/images/a.png',
					},
				],
				title: 'Text title',
				type: 'text-images-block',
				videoDescription: undefined,
				videoURL: undefined,
			},
			{
				description: '',
				images: undefined,
				title: '',
				type: 'text-video-block',
				videoDescription: 'Video description',
				videoURL: 'https://video.example.com',
			},
			{
				description: '',
				images: undefined,
				title: '',
				type: 'text-block',
				videoDescription: undefined,
				videoURL: undefined,
			},
		]);
	});

	it('does not resolve a header image for an image block', () => {
		const solutionDetail = parseSolutionDetail(
			toProduct({
				images: [headerImage],
				productSpecifications: toSpecifications({
					'solution-details-blocks': JSON.stringify([
						{
							content: {files: ['HEADER']},
							type: 'text-images-block',
						},
					]),
				}),
			})
		);

		expect(solutionDetail.details[0].images).toEqual([]);
	});

	it('falls back to no details when the blocks JSON is invalid', () => {
		expect(
			parseSolutionDetail(
				toProduct({
					productSpecifications: toSpecifications({
						'solution-details-blocks': '{not json',
					}),
				})
			).details
		).toEqual([]);
	});

	it('filters categories and tags by the marketplace solution vocabularies', () => {
		const solutionDetail = parseSolutionDetail(
			toProduct({
				categories: [
					{
						name: 'Commerce',
						vocabulary: 'Marketplace Solution Category',
					},
					{name: 'Banking', vocabulary: 'marketplace-solution-tags'},
					{name: 'Platform', vocabulary: 'Marketplace Product Type'},
				],
			})
		);

		expect(solutionDetail.categories).toEqual(['Commerce']);
		expect(solutionDetail.tags).toEqual(['Banking']);
	});
});
