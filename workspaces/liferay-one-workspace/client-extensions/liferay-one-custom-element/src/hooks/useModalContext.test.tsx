/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Context} from '@clayui/modal';
import {renderHook} from '@testing-library/react';
import {ReactNode} from 'react';
import {describe, expect, it, vi} from 'vitest';

import useModalContext from './useModalContext';

function renderModalContext() {
	const dispatch = vi.fn();
	const onClose = vi.fn();
	const state = {onClose, visible: false};

	const wrapper = ({children}: {children: ReactNode}) => (
		<Context.Provider
			value={
				[state, dispatch] as unknown as React.ContextType<
					typeof Context
				>
			}
		>
			{children}
		</Context.Provider>
	);

	const {result} = renderHook(() => useModalContext(), {wrapper});

	return {dispatch, onClose, result, state};
}

describe('[HOOK-USEMODALCONTEXT] useModalContext', () => {
	it('dispatches an open action with center defaulting to true', () => {
		const {dispatch, result} = renderModalContext();

		result.current.onOpenModal({
			body: 'Body',
			header: 'Header',
			size: 'lg',
		});

		expect(dispatch).toHaveBeenCalledWith({
			payload: {
				body: 'Body',
				center: true,
				footer: undefined,
				header: 'Header',
				size: 'lg',
			},
			type: 1,
		});
	});

	it('keeps a center value the caller passes', () => {
		const {dispatch, result} = renderModalContext();

		const footer = [null, null, 'Footer'];

		result.current.onOpenModal({body: 'Body', center: false, footer});

		expect(dispatch).toHaveBeenCalledWith({
			payload: {
				body: 'Body',
				center: false,
				footer,
				size: undefined,
			},
			type: 1,
		});
	});

	it('exposes onClose and state from the context', () => {
		const {onClose, result, state} = renderModalContext();

		expect(result.current.onClose).toBe(onClose);
		expect(result.current.state).toBe(state);
	});
});
