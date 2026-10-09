/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {ReactElement} from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {OrderCustomFields} from '~/utils/orderUtils';

import useSSAActions from './useSSAActions';

import type {Action} from '~/utils/appConstants';

const mocks = vi.hoisted(() => ({
	isSSAAdmin: true,
	navigate: vi.fn(),
	onClose: vi.fn(),
	onOpenModal: vi.fn(),
	ssaTrialExtend: {items: [] as object[]},
	ssaTrialExtendMutate: vi.fn(),
}));

vi.mock('react-router', () => ({
	useLocation: () => ({pathname: '/ssa'}),
	useNavigate: () => mocks.navigate,
}));

vi.mock('~/context/OneContextProvider', () => ({
	useOneContext: () => ({
		userAccountModel: {isSSAAdmin: mocks.isSSAAdmin},
	}),
}));

vi.mock('~/hooks/useModalContext', () => ({
	default: () => ({
		onClose: mocks.onClose,
		onOpenModal: mocks.onOpenModal,
	}),
}));

vi.mock('~/pages/Admin/SSADashboard/components/ExpireSSAModal', () => ({
	default: () => null,
}));

vi.mock('~/pages/Admin/SSADashboard/components/ExtendRequestModal', () => ({
	default: () => null,
}));

vi.mock('~/pages/Admin/SSADashboard/components/ExtendSSATrialModal', () => ({
	default: () => null,
}));

vi.mock('~/pages/Admin/SSADashboard/hooks/useSSADashboardOutlet', () => ({
	useSSADashboardOutlet: () => ({
		selectedAccountId: 99,
		ssaTrialExtend: mocks.ssaTrialExtend,
		ssaTrialExtendMutate: mocks.ssaTrialExtendMutate,
	}),
}));

function extendRequest(orderId: number, dueStatus: string) {
	return {
		dueStatus: {key: dueStatus},
		r_orderToTrialExtensionRequest_commerceOrderId: orderId,
	};
}

function order(id: number, label = 'in-progress') {
	return {
		customFields: {[OrderCustomFields.TRIAL_VIRTUAL_HOST]: 'trial.example'},
		id: String(id),
		orderStatusInfo: {label},
	};
}

function getActions() {
	const {result} = renderHook(() => useSSAActions());

	const [details, goToTrial, viewRequest, extendTrial, expireTrial] =
		result.current as Action[];

	return {details, expireTrial, extendTrial, goToTrial, viewRequest};
}

function resolve(value: Action['disabled'], item: unknown) {
	return typeof value === 'function' ? value(item) : value;
}

describe('[HOOK-ADMIN-SSADASHBOARD-USESSAACTIONS] useSSAActions', () => {
	beforeEach(() => {
		mocks.isSSAAdmin = true;
		mocks.navigate.mockReset();
		mocks.onOpenModal.mockReset();
		mocks.ssaTrialExtend = {items: []};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('navigates to the order details with the current path', () => {
		getActions().details.onClick!(order(5), vi.fn());

		expect(mocks.navigate).toHaveBeenCalledWith('/details/5?from=/ssa');
	});

	it('disables go to trial and expire trial unless the order is in progress', () => {
		const {expireTrial, goToTrial} = getActions();

		expect(resolve(goToTrial.disabled, order(1))).toBe(false);
		expect(resolve(expireTrial.disabled, order(1))).toBe(false);
		expect(resolve(goToTrial.disabled, order(1, 'completed'))).toBe(true);
		expect(resolve(expireTrial.disabled, order(1, 'completed'))).toBe(true);
	});

	it('opens the trial virtual host for go to trial', () => {
		const open = vi.spyOn(window, 'open').mockReturnValue(null);

		getActions().goToTrial.onClick!(order(1), vi.fn());

		expect(open).toHaveBeenCalledWith('https://trial.example');
	});

	it('hides view request for users who are not SSA admins', () => {
		mocks.isSSAAdmin = false;
		mocks.ssaTrialExtend = {items: [extendRequest(1, 'pending')]};

		expect(resolve(getActions().viewRequest.hidden, order(1))).toBe(true);
	});

	it('shows view request only when the first extend request of the matching order is pending', () => {
		mocks.ssaTrialExtend = {
			items: [
				extendRequest(1, 'pending'),
				extendRequest(2, 'approved'),
				extendRequest(2, 'pending'),
			],
		};

		const {viewRequest} = getActions();

		expect(resolve(viewRequest.hidden, order(1))).toBe(false);
		expect(resolve(viewRequest.hidden, order(2))).toBe(true);
		expect(resolve(viewRequest.hidden, order(3))).toBe(true);
	});

	it('opens the extend request modal with the matching requests and the approved count', () => {
		mocks.ssaTrialExtend = {
			items: [
				extendRequest(1, 'pending'),
				extendRequest(1, 'approved'),
				extendRequest(1, 'autoApproved'),
				extendRequest(1, 'rejected'),
				extendRequest(2, 'approved'),
			],
		};

		const orderMutate = vi.fn();

		getActions().viewRequest.onClick!(order(1), orderMutate);

		const body = mocks.onOpenModal.mock.calls[0][0].body as ReactElement;

		expect(body.props).toEqual(
			expect.objectContaining({
				mutatePlacedOrderPage: orderMutate,
				trialExtend: mocks.ssaTrialExtend.items[0],
				trialExtendCount: 2,
			})
		);
	});

	it('does not open the extend request modal when the order has no requests', () => {
		getActions().viewRequest.onClick!(order(1), vi.fn());

		expect(mocks.onOpenModal).not.toHaveBeenCalled();
	});

	it('disables extend trial when a request is pending or the order is not in progress', () => {
		mocks.ssaTrialExtend = {
			items: [extendRequest(1, 'pending'), extendRequest(2, 'approved')],
		};

		const {extendTrial} = getActions();

		expect(resolve(extendTrial.disabled, order(1))).toBe(true);
		expect(resolve(extendTrial.disabled, order(2))).toBe(false);
		expect(resolve(extendTrial.disabled, order(3))).toBe(false);
		expect(resolve(extendTrial.disabled, order(2, 'completed'))).toBe(true);
	});

	it('opens the extend trial modal and flags the first extend request', () => {
		mocks.ssaTrialExtend = {items: [extendRequest(2, 'approved')]};

		const {extendTrial} = getActions();

		extendTrial.onClick!(order(1), vi.fn());
		extendTrial.onClick!(order(2), vi.fn());

		const [first, second] = mocks.onOpenModal.mock.calls.map(
			([payload]) => payload
		);

		expect(first.header).toBe('Extend 1 Trial');
		expect(first.body.props).toEqual(
			expect.objectContaining({accountId: 99, firstExtendRequest: true})
		);
		expect(second.body.props.firstExtendRequest).toBe(false);
	});

	it('opens the expire trial modal for the selected account', () => {
		const mutate = vi.fn();

		getActions().expireTrial.onClick!(order(4), mutate);

		const payload = mocks.onOpenModal.mock.calls[0][0];

		expect(payload.header).toBe('Expire 4 Trial');
		expect(payload.body.props).toEqual(
			expect.objectContaining({accountId: 99, mutate})
		);
	});
});
