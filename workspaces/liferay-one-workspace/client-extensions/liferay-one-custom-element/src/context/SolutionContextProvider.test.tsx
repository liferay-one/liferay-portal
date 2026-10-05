/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, render, renderHook, screen, waitFor} from '@testing-library/react';
import {ReactNode} from 'react';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import HeadlessCommerceAdminCatalog from '~/services/headless/HeadlessCommerceAdminCatalog';

import SolutionContextProvider, {
	AppActions,
	BlockDirections,
	ContentBlock,
	SolutionTypes,
	useSolutionContext,
} from './SolutionContextProvider';

import type {Product} from '~/types/product';

const {vocabularies} = vi.hoisted(() => ({
	vocabularies: {isLoading: false},
}));

vi.mock('~/components/Loading/Loading', () => ({
	default: {
		FullScreen: () => <div data-testid="submission-loading" />,
		Page: () => <div data-testid="page-loading" />,
	},
}));

vi.mock('~/hooks/useGetVocabulariesAndCategories', () => ({
	useGetVocabulariesAndCategories: () => ({
		data: {},
		isLoading: vocabularies.isLoading,
	}),
}));

const blocks = ['A', 'B', 'C', 'D'].map((title) => ({
	content: {title},
	type: 'text-block',
})) as unknown as ContentBlock[];

const product = {
	categories: [],
	description: {en_US: 'A solution'},
	images: [
		{
			externalReferenceCode: 'IMG-HEADER',
			src: 'https://example.com/documents/header.png?version=1',
			tags: ['solution-header'],
			title: {en_US: 'Header'},
		},
		{
			externalReferenceCode: 'IMG-DETAILS',
			src: 'https://example.com/documents/details.png?version=2',
			tags: ['solution-details'],
			title: {en_US: 'Details'},
		},
	],
	name: {en_US: 'My Solution'},
	productSpecifications: [
		{
			specificationKey: 'solution-details-blocks',
			value: {
				en_US: JSON.stringify([
					{content: {title: 'Intro'}, type: 'text-block'},
					{
						content: {files: ['IMG-DETAILS']},
						type: 'text-images-block',
					},
				]),
			},
		},
		{
			specificationKey: 'solution-header-title',
			value: {en_US: 'Header Title'},
		},
	],
	thumbnail: '/thumbnail.png',
} as unknown as Product;

function specification(specificationKey: string, value: string) {
	return {specificationKey, value: {en_US: value}};
}

function wrapper({children}: {children: ReactNode}) {
	return (
		<MemoryRouter>
			<SolutionContextProvider>{children}</SolutionContextProvider>
		</MemoryRouter>
	);
}

function renderSolutionContext() {
	return renderHook(() => useSolutionContext(), {wrapper});
}

function dispatchAction(
	result: ReturnType<typeof renderSolutionContext>['result'],
	action: AppActions
) {
	act(() => result.current[1](action));
}

function renderWithBlocks() {
	const rendered = renderSolutionContext();

	for (const block of blocks) {
		dispatchAction(rendered.result, {
			payload: block,
			type: SolutionTypes.SET_NEW_BLOCK,
		});
	}

	return rendered;
}

function moveBlock(direction: BlockDirections, index: number) {
	const {result} = renderWithBlocks();

	dispatchAction(result, {
		payload: {direction, index},
		type: SolutionTypes.SET_BLOCK_MOVE,
	});

	return result.current[0].details.map(
		(block) => (block.content as {title: string}).title
	);
}

describe('[CTX-SOLUTIONCONTEXTPROVIDER] SolutionContextProvider', () => {
	beforeEach(() => {
		vocabularies.isLoading = false;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('maps header images, details blocks, and the profile on SET_CONTEXT', () => {
		const {result} = renderSolutionContext();

		dispatchAction(result, {
			payload: product,
			type: SolutionTypes.SET_CONTEXT,
		});

		const [state] = result.current;

		expect(state.header.contentType).toEqual({
			content: {
				headerImages: [
					expect.objectContaining({
						fileName: 'Header',
						id: 'IMG-HEADER',
						preview: '/documents/header.png',
					}),
				],
			},
			type: 'upload-images',
		});
		expect(state.header.title).toBe('Header Title');
		expect(state.details).toEqual([
			{content: {title: 'Intro'}, type: 'text-block'},
			{
				content: {
					files: [
						expect.objectContaining({
							fileName: 'Details',
							id: 'IMG-DETAILS',
							preview: '/documents/details.png',
						}),
					],
				},
				type: 'text-images-block',
			},
		]);
		expect(state.profile.name).toBe('My Solution');
		expect(state.profile.description).toBe('A solution');
		expect(state.company).toEqual({
			description: '',
			email: '',
			phone: '',
			website: '',
		});
		expect(state.contactUs).toBe('');
	});

	it('uses the embedded video header when a header video URL exists', () => {
		const {result} = renderSolutionContext();

		dispatchAction(result, {
			payload: {
				...product,
				productSpecifications: [
					specification('solution-header-video-description', 'Watch'),
					specification('solution-header-video-url', 'https://video'),
				],
			} as unknown as Product,
			type: SolutionTypes.SET_CONTEXT,
		});

		expect(result.current[0].header.contentType).toEqual({
			content: {
				headerVideoDescription: 'Watch',
				headerVideoUrl: 'https://video',
			},
			type: 'embed-video-url',
		});
	});

	it('maps the company fields only when the company email exists', () => {
		const {result} = renderSolutionContext();

		dispatchAction(result, {
			payload: {
				...product,
				productSpecifications: [
					specification('solution-company-email', 'co@example.com'),
					specification('solution-company-phone', '555'),
					specification('solution-company-website', 'https://co'),
					specification('solution-contact-email', 'sales@co'),
				],
			} as unknown as Product,
			type: SolutionTypes.SET_CONTEXT,
		});

		expect(result.current[0].company).toEqual({
			description: '',
			email: 'co@example.com',
			phone: '555',
			website: 'https://co',
		});
		expect(result.current[0].contactUs).toBe('sales@co');

		dispatchAction(result, {
			payload: {
				...product,
				productSpecifications: [
					specification('solution-company-phone', '555'),
				],
			} as unknown as Product,
			type: SolutionTypes.SET_CONTEXT,
		});

		expect(result.current[0].company.phone).toBe('');
	});

	it('replaces one block by index on SET_UPDATE_BLOCK', () => {
		const {result} = renderWithBlocks();

		const block = {
			content: {title: 'Z'},
			type: 'text-block',
		} as unknown as ContentBlock;

		dispatchAction(result, {
			payload: {block, index: 1},
			type: SolutionTypes.SET_UPDATE_BLOCK,
		});

		expect(result.current[0].details).toEqual([
			blocks[0],
			block,
			blocks[2],
			blocks[3],
		]);
	});

	it('moves a block to the top', () => {
		expect(moveBlock(BlockDirections.MOVE_TO_TOP, 2)).toEqual([
			'C',
			'A',
			'B',
			'D',
		]);
	});

	it('moves a block to the bottom', () => {
		expect(moveBlock(BlockDirections.MOVE_TO_BOTTOM, 1)).toEqual([
			'A',
			'C',
			'D',
			'B',
		]);
	});

	it('moves a block up', () => {
		expect(moveBlock(BlockDirections.MOVE_UP, 2)).toEqual([
			'A',
			'C',
			'B',
			'D',
		]);
	});

	it('moves a block down', () => {
		expect(moveBlock(BlockDirections.MOVE_DOWN, 1)).toEqual([
			'A',
			'C',
			'B',
			'D',
		]);
	});

	it('deletes a block', () => {
		expect(moveBlock(BlockDirections.DELETE, 0)).toEqual(['B', 'C', 'D']);
	});

	it('shows the page loading while the vocabularies load', () => {
		vocabularies.isLoading = true;

		render(<div>child</div>, {wrapper});

		expect(screen.getByTestId('page-loading')).toBeInTheDocument();
		expect(screen.queryByText('child')).not.toBeInTheDocument();
	});

	it('fetches the product for the route product ID and maps it into state', async () => {
		const getProduct = vi
			.spyOn(HeadlessCommerceAdminCatalog, 'getProduct')
			.mockResolvedValue(product);

		const {result} = renderHook(() => useSolutionContext(), {
			wrapper: ({children}: {children: ReactNode}) => (
				<MemoryRouter initialEntries={['/55']}>
					<Routes>
						<Route
							element={
								<SolutionContextProvider>
									{children}
								</SolutionContextProvider>
							}
							path="/:productId"
						/>
					</Routes>
				</MemoryRouter>
			),
		});

		await waitFor(() =>
			expect(result.current[0].profile.name).toBe('My Solution')
		);

		expect(getProduct).toHaveBeenCalledWith(
			'55',
			expect.any(URLSearchParams)
		);
	});
});
