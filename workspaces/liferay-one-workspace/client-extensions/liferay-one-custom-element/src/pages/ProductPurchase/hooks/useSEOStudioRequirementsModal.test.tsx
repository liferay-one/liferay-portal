/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {fireEvent, render, renderHook, screen} from '@testing-library/react';
import {ReactNode} from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useAIHubProduct} from '~/hooks/useAIHubProduct';
import {Liferay} from '~/services/liferay/liferay';

import {useSEOStudioRequirementsModal} from './useSEOStudioRequirementsModal';

const {onClose, onOpenModal} = vi.hoisted(() => ({
	onClose: vi.fn(),
	onOpenModal: vi.fn(),
}));

vi.mock('~/hooks/useAIHubProduct', () => ({
	useAIHubProduct: vi.fn(),
}));

vi.mock('~/hooks/useModalContext', () => ({
	default: () => ({onClose, onOpenModal}),
}));

type ModalOptions = {
	footer: [null, null, ReactNode[]];
	header: string;
	size: string;
	status: string;
};

function mockAIHubProduct(data: unknown) {
	vi.mocked(useAIHubProduct).mockReturnValue({data} as ReturnType<
		typeof useAIHubProduct
	>);
}

function openModalAndClickContinue() {
	const {result} = renderHook(() => useSEOStudioRequirementsModal());

	result.current.openModal();

	const [options] = onOpenModal.mock.calls[0] as [ModalOptions];

	render(<>{options.footer[2]}</>);

	fireEvent.click(screen.getByRole('button', {name: 'Continue'}));

	return options;
}

describe('[HOOK-PRODUCTPURCHASE-USESEOSTUDIOREQUIREMENTSMODAL] useSEOStudioRequirementsModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('opens the info modal with the SEO Studio requirements', () => {
		mockAIHubProduct(undefined);

		const {result} = renderHook(() => useSEOStudioRequirementsModal());

		result.current.openModal();

		expect(onOpenModal).toHaveBeenCalledWith(
			expect.objectContaining({
				header: 'SEO Studio Requirements',
				size: 'md',
				status: 'info',
			})
		);
	});

	it('closes the modal and navigates to the AI Hub product page on continue', () => {
		mockAIHubProduct({urls: {en_US: 'ai-hub'}});

		const navigate = vi.spyOn(Liferay.Util, 'navigate');

		openModalAndClickContinue();

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(navigate).toHaveBeenCalledWith('/p/ai-hub');
	});

	it('navigates to the products page when the AI Hub product has no URL', () => {
		mockAIHubProduct(undefined);

		const navigate = vi.spyOn(Liferay.Util, 'navigate');

		openModalAndClickContinue();

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(navigate).toHaveBeenCalledWith('/products');
	});

	it('closes the modal without navigating on cancel', () => {
		mockAIHubProduct({urls: {en_US: 'ai-hub'}});

		const navigate = vi.spyOn(Liferay.Util, 'navigate');

		const {result} = renderHook(() => useSEOStudioRequirementsModal());

		result.current.openModal();

		const [options] = onOpenModal.mock.calls[0] as [ModalOptions];

		render(<>{options.footer[2]}</>);

		fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(navigate).not.toHaveBeenCalled();
	});
});
