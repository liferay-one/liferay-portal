/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {Liferay} from '~/services/liferay/liferay';

import TrialTable from './TrialTable';

import type {Order} from '~/types/orders';

const mocks = vi.hoisted(() => ({
	deleteOrder: vi.fn(),
	deleteTrial: vi.fn(),
	openConfirmationModal: vi.fn(),
	openModal: vi.fn(),
}));

vi.mock('~/hooks/useConfirmationModal', () => ({
	useConfirmationModal: () => ({openModal: mocks.openConfirmationModal}),
}));

vi.mock('~/hooks/useModalContext', () => ({
	default: () => ({
		onClose: vi.fn(),
		onOpenModal: mocks.openModal,
		state: {},
	}),
}));

vi.mock('~/services/headless/HeadlessCommerceAdminOrder', () => ({
	default: {deleteOrder: mocks.deleteOrder},
}));

vi.mock('~/services/spring-boot/Trial', () => ({
	default: {deleteTrial: mocks.deleteTrial},
}));

const ORDER_ID = 36629087;

const VIRTUAL_HOST = '36629087.mptest-dev.marketplace.lfr.sh';

const createOrder = (customFields: Record<string, string> = {}) =>
	({
		account: {id: 1, name: 'Acme'},
		accountId: 1,
		createDate: '2026-10-05T13:51:00Z',
		customFields,
		id: ORDER_ID,
		orderItems: [{name: {en_US: 'Liferay Pre-Built 7 Day Trial'}}],
		orderStatusInfo: {
			code: 11,
			label: 'in-progress',
			label_i18n: 'In Progress',
		},
	}) as unknown as Order;

const openRowActions = () =>
	fireEvent.click(screen.getByRole('button', {name: 'Actions'}));

const confirmDeletion = async () => {
	openRowActions();

	fireEvent.click(screen.getByText('Delete'));

	const {onConfirm} = mocks.openConfirmationModal.mock.calls[0][0];

	await onConfirm();
};

describe('TrialTable [ROUTE-ADMIN-TRIALS]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('disables go to trial while the order has no virtual host', () => {
		render(<TrialTable items={[createOrder()]} revalidate={vi.fn()} />);

		openRowActions();

		expect(
			screen.getByRole('menuitem', {name: 'Go to Trial'})
		).toHaveAttribute('aria-disabled', 'true');
	});

	it('opens the virtual host from go to trial', () => {
		const open = vi.spyOn(window, 'open').mockImplementation(() => null);

		render(
			<TrialTable
				items={[createOrder({'trial-virtual-host': VIRTUAL_HOST})]}
				revalidate={vi.fn()}
			/>
		);

		openRowActions();

		fireEvent.click(screen.getByText('Go to Trial'));

		expect(open).toHaveBeenCalledWith(`https://${VIRTUAL_HOST}`);
	});

	it('tears the trial down before deleting the order', async () => {
		const openToast = vi.spyOn(Liferay.Util, 'openToast');
		const revalidate = vi.fn();

		mocks.deleteTrial.mockResolvedValue(undefined);
		mocks.deleteOrder.mockResolvedValue(undefined);

		render(<TrialTable items={[createOrder()]} revalidate={revalidate} />);

		await confirmDeletion();

		expect(mocks.deleteTrial).toHaveBeenCalledWith(ORDER_ID);
		expect(mocks.deleteOrder).toHaveBeenCalledWith(ORDER_ID);
		expect(mocks.deleteTrial.mock.invocationCallOrder[0]).toBeLessThan(
			mocks.deleteOrder.mock.invocationCallOrder[0]
		);
		expect(openToast).toHaveBeenCalledWith(
			expect.objectContaining({type: 'success'})
		);
		expect(revalidate).toHaveBeenCalled();
	});

	it('keeps the order when the trial teardown fails', async () => {
		const openToast = vi.spyOn(Liferay.Util, 'openToast');
		const revalidate = vi.fn();

		vi.spyOn(console, 'error').mockImplementation(() => {});

		mocks.deleteTrial.mockRejectedValue(new Error('502 Bad Gateway'));

		render(<TrialTable items={[createOrder()]} revalidate={revalidate} />);

		await confirmDeletion();

		expect(mocks.deleteOrder).not.toHaveBeenCalled();
		expect(openToast).toHaveBeenCalledWith(
			expect.objectContaining({type: 'danger'})
		);
		expect(revalidate).toHaveBeenCalled();
	});
});
