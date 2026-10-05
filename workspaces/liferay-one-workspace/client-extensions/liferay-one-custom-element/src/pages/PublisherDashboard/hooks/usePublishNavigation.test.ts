/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook} from '@testing-library/react';
import {useLocation, useNavigate, useParams} from 'react-router-dom';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {scrollToTop} from '~/utils/browserUtils';

import usePublishNavigation from './usePublishNavigation';

import type {AppFlowItem} from '~/pages/PublisherDashboard/pages/NewAppFlow/constants';

const {navigate} = vi.hoisted(() => ({navigate: vi.fn()}));

vi.mock('react-router-dom', () => ({
	useLocation: vi.fn(),
	useNavigate: vi.fn(),
	useParams: vi.fn(),
}));

vi.mock('~/utils/browserUtils', () => ({
	scrollToTop: vi.fn(),
}));

const flowItems = [
	{path: 'create'},
	{path: 'profile'},
	{path: 'pricing'},
	{path: 'submit'},
] as AppFlowItem<unknown>[];

function renderNavigation({id, pathname}: {id?: string; pathname: string}) {
	vi.mocked(useLocation).mockReturnValue({pathname} as ReturnType<
		typeof useLocation
	>);
	vi.mocked(useParams).mockReturnValue(id ? {id} : {});

	return renderHook(() =>
		usePublishNavigation({exitLink: '/publisher/apps', flowItems})
	);
}

describe('[HOOK-PUBLISHERDASHBOARD-USEPUBLISHNAVIGATION] usePublishNavigation', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(useNavigate).mockReturnValue(navigate);
	});

	it('keeps every step without an id param', () => {
		const {result} = renderNavigation({pathname: '/publish/app/profile'});

		expect(result.current.steps).toEqual(flowItems);
		expect(result.current.activeIndex).toBe(1);
		expect(result.current.activeRoute).toEqual({path: 'profile'});
		expect(result.current.isLastStep).toBe(false);
	});

	it('drops the first step when an id param exists', () => {
		const {result} = renderNavigation({
			id: '12',
			pathname: '/publish/app/12/profile',
		});

		expect(result.current.id).toBe('12');
		expect(result.current.steps).toEqual(flowItems.slice(1));
		expect(result.current.activeIndex).toBe(0);
	});

	it('falls back to the first step for an unknown last path segment', () => {
		const {result} = renderNavigation({pathname: '/publish/app/unknown'});

		expect(result.current.activeIndex).toBe(0);
		expect(result.current.activeRoute).toEqual({path: 'create'});
		expect(result.current.isLastStep).toBe(false);
	});

	it('flags the last step', () => {
		const {result} = renderNavigation({pathname: '/publish/app/submit'});

		expect(result.current.activeIndex).toBe(3);
		expect(result.current.isLastStep).toBe(true);
	});

	it('navigates to the previous step path and scrolls to top', () => {
		const {result} = renderNavigation({pathname: '/publish/app/pricing'});

		act(() => result.current.onClickPrevious());

		expect(navigate).toHaveBeenCalledWith('profile');
		expect(scrollToTop).toHaveBeenCalledTimes(1);
	});

	it('navigates to the next step path and scrolls to top', () => {
		const {result} = renderNavigation({pathname: '/publish/app/pricing'});

		act(() => result.current.onClickContinue());

		expect(navigate).toHaveBeenCalledWith('submit');
		expect(scrollToTop).toHaveBeenCalledTimes(1);
	});

	it('navigates to the exit link on exit', () => {
		const {result} = renderNavigation({pathname: '/publish/app/pricing'});

		act(() => result.current.onExit());

		expect(navigate).toHaveBeenCalledWith('/publisher/apps');
		expect(scrollToTop).not.toHaveBeenCalled();
	});
});
