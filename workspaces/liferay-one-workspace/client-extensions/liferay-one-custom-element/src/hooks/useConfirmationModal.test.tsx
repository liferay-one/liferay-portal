/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {
	fireEvent,
	render,
	renderHook,
	screen,
	waitFor,
} from '@testing-library/react';
import {ReactNode} from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {useConfirmationModal} from './useConfirmationModal';
import useModalContext, {ModalOptions} from './useModalContext';

vi.mock('./useModalContext', () => ({
	default: vi.fn(),
}));

const onClose = vi.fn();
const onOpenModal = vi.fn();

function openConfirmationModal(
	options: Partial<ModalOptions> & {onConfirm: () => unknown}
) {
	const {result} = renderHook(() => useConfirmationModal());

	result.current.openModal({body: 'Body', ...options} as never);

	return onOpenModal.mock.calls[0][0] as ModalOptions & {
		footer: [null, null, ReactNode[]];
	};
}

describe('[HOOK-USECONFIRMATIONMODAL] useConfirmationModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(useModalContext).mockReturnValue({
			onClose,
			onOpenModal,
			state: {},
		} as unknown as ReturnType<typeof useModalContext>);
	});

	it('opens a centered danger modal with a footer', () => {
		const modalOptions = openConfirmationModal({onConfirm: vi.fn()});

		expect(modalOptions).toEqual(
			expect.objectContaining({
				body: 'Body',
				center: true,
				size: 'md',
				status: 'danger',
			})
		);
		expect(modalOptions.footer[0]).toBeNull();
		expect(modalOptions.footer[1]).toBeNull();
		expect(modalOptions.footer[2]).toHaveLength(2);
		expect(modalOptions).not.toHaveProperty('onConfirm');
	});

	it('lets caller options override the defaults', () => {
		const modalOptions = openConfirmationModal({
			header: 'Header',
			onConfirm: vi.fn(),
			status: 'warning',
		});

		expect(modalOptions.header).toBe('Header');
		expect(modalOptions.status).toBe('warning');
	});

	it('disables the confirm button and awaits onConfirm before it closes', async () => {
		let resolveConfirm: () => void = () => {};

		const onConfirm = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					resolveConfirm = resolve;
				})
		);

		const modalOptions = openConfirmationModal({onConfirm});

		render(<>{modalOptions.footer[2]}</>);

		const [, confirmButton] = screen.getAllByRole('button');

		fireEvent.click(confirmButton);

		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(confirmButton).toBeDisabled();
		expect(onClose).not.toHaveBeenCalled();

		resolveConfirm();

		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
	});

	it('closes on cancel without calling onConfirm', () => {
		const onConfirm = vi.fn();

		const modalOptions = openConfirmationModal({onConfirm});

		render(<>{modalOptions.footer[2]}</>);

		const [cancelButton] = screen.getAllByRole('button');

		fireEvent.click(cancelButton);

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onConfirm).not.toHaveBeenCalled();
	});
});
